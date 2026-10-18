import type { RequestHandler, Response } from "express";
import { Restaurant } from "../models/Restaurant.js";
import { User } from "../models/User.js";
import { accessState } from "../utils/access.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { COOKIE_NAME, verifyToken } from "../utils/token.js";

export type Role = "admin" | "staff" | "super";

export interface AuthUser {
  id: string;
  role: Role;
  restaurant: string | null;
}

export const authUser = (res: Response) => res.locals.user as AuthUser;

/** The restaurant the current user belongs to. Every tenant query must be scoped with this. */
export function tenantId(res: Response): string {
  const id = authUser(res).restaurant;
  if (!id) throw new HttpError(403, "No restaurant linked to this account");
  return id;
}

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (_req, res, next) => {
    if (!roles.includes(authUser(res).role)) return next(new HttpError(403, "Forbidden"));
    next();
  };

export const requireAuth: RequestHandler = asyncHandler(async (req, res, next) => {
  const token: unknown = req.cookies?.[COOKIE_NAME];
  if (typeof token !== "string" || !token) throw new HttpError(401, "Not authenticated");

  let id: string;
  try {
    id = verifyToken(token);
  } catch {
    throw new HttpError(401, "Session expired");
  }

  const user = await User.findById(id).select("role restaurant").lean();
  if (!user) throw new HttpError(401, "Session expired");

  const auth: AuthUser = {
    id: String(user._id),
    role: user.role as Role,
    restaurant: user.restaurant ? String(user.restaurant) : null,
  };
  res.locals.user = auth;

  // subscription state, checked on every request so a suspension takes effect immediately
  if (auth.role !== "super" && auth.restaurant) {
    const r = await Restaurant.findById(auth.restaurant).select("plan accessUntil suspended createdAt").lean();
    if (r) res.locals.access = accessState(r);
  }
  next();
});