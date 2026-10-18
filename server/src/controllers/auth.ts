import bcrypt from "bcryptjs";
import type { Response } from "express";
import { authUser } from "../middleware/auth.js";
import { Restaurant } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { changePasswordBody, loginBody } from "../schemas/auth.js";
import { accessState } from "../utils/access.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { clearCookieOptions, COOKIE_NAME, sessionCookie, signToken } from "../utils/token.js";

const COST = 12;
// compared against when the email is unknown, so timing doesn't reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer", COST);

async function profile(userId: string) {
  const user = await User.findById(userId).select("email role restaurant mustChangePassword").lean();
  if (!user) throw new HttpError(401, "Session expired");
  const r = user.restaurant
    ? await Restaurant.findById(user.restaurant).select("slug name plan accessUntil suspended createdAt").lean()
    : null;
  return {
    _id: user._id,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword ?? false,
    restaurant: r ? { _id: r._id, slug: r.slug, name: r.name } : null,
    access: r ? accessState(r) : null,
  };
}

const startSession = (res: Response, userId: string) => res.cookie(COOKIE_NAME, signToken(userId), sessionCookie);

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginBody.parse(req.body);
  const user = await User.findOne({ email }).select("+passwordHash");
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Invalid email or password");

  startSession(res, String(user._id));
  res.json({ data: await profile(String(user._id)) });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(COOKIE_NAME, clearCookieOptions);
  res.status(204).end();
});

export const me = asyncHandler(async (_req, res) => {
  res.json({ data: await profile(authUser(res).id) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { current, password } = changePasswordBody.parse(req.body);
  const id = authUser(res).id;
  const user = await User.findById(id).select("+passwordHash");
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    throw new HttpError(400, "Your current password is wrong");
  }
  if (password === current) throw new HttpError(400, "Choose a different password");
  user.passwordHash = await bcrypt.hash(password, COST);
  user.mustChangePassword = false;
  await user.save();
  res.json({ data: await profile(id) });
});