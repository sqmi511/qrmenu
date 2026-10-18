import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PLANS } from "../config/plans.js";
import { authUser } from "../middleware/auth.js";
import { Payment } from "../models/Payment.js";
import { Restaurant } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { idParam } from "../schemas/common.js";
import { createTenantBody, extendBody, grantBody, suspendBody } from "../schemas/super.js";
import { DAY, accessState } from "../utils/access.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, notFound } from "../utils/httpError.js";

interface R {
  _id: unknown;
  slug: string;
  name: { en: string; ar?: string };
  plan?: string;
  accessUntil?: Date | null;
  suspended?: boolean;
  createdAt?: Date;
}

const tempPassword = () => randomBytes(9).toString("base64url");

export const listRestaurants = asyncHandler(async (_req, res) => {
  const rs = await Restaurant.find().sort({ createdAt: -1 }).lean();
  const owners = await User.find({ restaurant: { $in: rs.map((r) => r._id) }, role: "admin" })
    .select("email restaurant")
    .lean();
  const ownerBy = new Map(owners.map((u) => [String(u.restaurant), u.email] as const));
  const revenue = await Payment.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: "$amountCents" } } }]);

  const restaurants = rs.map((x) => {
    const r = x as R;
    const a = accessState(r);
    return {
      _id: String(r._id),
      slug: r.slug,
      name: r.name,
      ownerEmail: ownerBy.get(String(r._id)) ?? null,
      plan: a.plan,
      status: a.status,
      accessUntil: a.accessUntil,
      daysLeft: a.daysLeft,
      createdAt: r.createdAt,
    };
  });
  const count = (s: string) => restaurants.filter((r) => r.status === s).length;

  res.set("Cache-Control", "no-store");
  res.json({
    data: {
      restaurants,
      summary: {
        restaurants: restaurants.length,
        pending: count("pending"),
        trial: count("trial"),
        active: count("active"),
        grace: count("grace"),
        expired: count("expired"),
        suspended: count("suspended"),
        lifetimeSold: restaurants.filter((r) => r.plan === "lifetime").length,
        lifetimeLimit: PLANS.lifetimeLimit,
        revenueCents: revenue[0]?.total ?? 0,
        prices: { monthlyCents: PLANS.monthlyCents, annualCents: PLANS.annualCents, lifetimeCents: PLANS.lifetimeCents },
      },
    },
  });
});

export const createRestaurant = asyncHandler(async (req, res) => {
  const { name, slug, ownerEmail } = createTenantBody.parse(req.body);
  if (await User.exists({ email: ownerEmail })) throw new HttpError(409, "That email already has an account");

  // no trial: the restaurant stays closed until you activate a plan
  const restaurant = await Restaurant.create({ slug, name, plan: "none" }); // duplicate slug -> 409

  const password = tempPassword();
  try {
    await User.create({
      email: ownerEmail,
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin",
      restaurant: restaurant._id,
      mustChangePassword: true,
    });
  } catch (e) {
    await Restaurant.deleteOne({ _id: restaurant._id });
    throw e;
  }

  res.status(201).json({ data: { id: String(restaurant._id), slug, ownerEmail, tempPassword: password } });
});

function addMonths(base: Date, n: number) {
  const d = new Date(base);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

/** You received the money: open the plan. Monthly/annual stack on top of the remaining time. */
export const grantPlan = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const b = grantBody.parse(req.body);
  const r = await Restaurant.findById(id).select("plan accessUntil suspended createdAt").lean();
  if (!r) throw notFound("Restaurant");
  if (r.plan === "lifetime") throw new HttpError(409, "This restaurant already has a lifetime plan");

  let accessUntil: Date | null = null;
  if (b.plan === "lifetime") {
    const sold = await Restaurant.countDocuments({ plan: "lifetime" });
    if (sold >= PLANS.lifetimeLimit) throw new HttpError(409, "All lifetime slots are sold");
  } else {
    const now = new Date();
    const cur = accessState(r).accessUntil;
    accessUntil = addMonths(cur && cur > now ? cur : now, b.plan === "annual" ? 12 : 1);
  }

  await Restaurant.updateOne({ _id: id }, { $set: { plan: b.plan, accessUntil, suspended: false } });
  await Payment.create({
    restaurant: id,
    plan: b.plan,
    amountCents: Math.round(b.amountUsd * 100),
    method: b.method,
    reference: b.reference ?? "",
    note: b.note ?? "",
    coversUntil: accessUntil,
    grantedBy: authUser(res).id,
  });

  res.json({ data: { plan: b.plan, accessUntil } });
});

/** Free days (goodwill or a demo). On a pending restaurant this starts a manual trial. Not logged as a payment. */
export const extendAccess = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { days } = extendBody.parse(req.body);
  const r = await Restaurant.findById(id).select("plan accessUntil suspended createdAt").lean();
  if (!r) throw notFound("Restaurant");
  if (r.plan === "lifetime") throw new HttpError(409, "Lifetime plans don't expire");

  const now = new Date();
  if (r.plan === "none") {
    const accessUntil = new Date(now.getTime() + days * DAY);
    await Restaurant.updateOne({ _id: id }, { $set: { plan: "trial", accessUntil } });
    res.json({ data: { accessUntil } });
    return;
  }

  const cur = accessState(r).accessUntil;
  const accessUntil = new Date((cur && cur > now ? cur : now).getTime() + days * DAY);
  await Restaurant.updateOne({ _id: id }, { $set: { accessUntil } });
  res.json({ data: { accessUntil } });
});

export const setSuspended = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { suspended } = suspendBody.parse(req.body);
  const out = await Restaurant.updateOne({ _id: id }, { $set: { suspended } });
  if (out.matchedCount === 0) throw notFound("Restaurant");
  res.status(204).end();
});

export const resetOwnerPassword = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const owner = await User.findOne({ restaurant: id, role: "admin" });
  if (!owner) throw notFound("Owner");
  const password = tempPassword();
  owner.passwordHash = await bcrypt.hash(password, 12);
  owner.mustChangePassword = true;
  await owner.save();
  res.json({ data: { ownerEmail: owner.email, tempPassword: password } });
});

export const listPayments = asyncHandler(async (_req, res) => {
  const pays = await Payment.find().sort({ createdAt: -1 }).limit(100).lean();
  const rs = await Restaurant.find({ _id: { $in: pays.map((p) => p.restaurant) } })
    .select("name slug")
    .lean();
  const by = new Map(rs.map((r) => [String(r._id), { slug: r.slug, name: r.name }] as const));
  res.set("Cache-Control", "no-store");
  res.json({ data: pays.map((p) => ({ ...p, restaurant: by.get(String(p.restaurant)) ?? null })) });
});