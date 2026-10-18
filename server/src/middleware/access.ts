import type { RequestHandler } from "express";
import { Restaurant } from "../models/Restaurant.js";
import { type Access, accessState } from "../utils/access.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";

/** After login: an ended or suspended subscription blocks everything except billing and auth. */
export const requireActive: RequestHandler = (_req, res, next) => {
  const a = res.locals.access as Access | undefined;
  if (a?.blocked) return next(new HttpError(402, "Your subscription has ended. Renew to continue."));
  next();
};

/** Public routes under /public/restaurants/:slug: closed restaurants answer 503. */
export const openGate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const slug = String(req.params.slug ?? "").toLowerCase();
  if (/^[a-z0-9-]{3,40}$/.test(slug)) {
    const r = await Restaurant.findOne({ slug }).select("plan accessUntil suspended createdAt").lean();
    if (r && accessState(r).blocked) throw new HttpError(503, "Restaurant temporarily unavailable");
  }
  next();
});