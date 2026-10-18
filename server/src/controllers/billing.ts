import { BILLING, PLANS } from "../config/plans.js";
import { tenantId } from "../middleware/auth.js";
import { Payment } from "../models/Payment.js";
import { Restaurant } from "../models/Restaurant.js";
import { accessState } from "../utils/access.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/httpError.js";

export const getBilling = asyncHandler(async (_req, res) => {
  const rid = tenantId(res);
  const [r, sold, payments] = await Promise.all([
    Restaurant.findById(rid).select("plan accessUntil suspended createdAt").lean(),
    Restaurant.countDocuments({ plan: "lifetime" }),
    Payment.find({ restaurant: rid })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("plan amountCents method reference coversUntil createdAt")
      .lean(),
  ]);
  if (!r) throw notFound("Restaurant");

  res.set("Cache-Control", "no-store");
  res.json({
    data: {
      access: accessState(r),
      reference: `QRM-${rid.slice(-5).toUpperCase()}`,
      prices: { monthlyCents: PLANS.monthlyCents, annualCents: PLANS.annualCents, lifetimeCents: PLANS.lifetimeCents },
      lifetime: { limit: PLANS.lifetimeLimit, left: Math.max(0, PLANS.lifetimeLimit - sold) },
      pay: { whish: BILLING.whishNumber, whatsapp: BILLING.whatsapp },
      payments,
    },
  });
});