import type { Request, Response } from "express";
import { tenantId } from "../middleware/auth.js";
import { Restaurant } from "../models/Restaurant.js";
import { idParam } from "../schemas/common.js";
import { updateRestaurantBody } from "../schemas/restaurant.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, notFound } from "../utils/httpError.js";
import { withSettings } from "../utils/settings.js";

// a user can only reach their own restaurant; anything else looks like it doesn't exist
function ownId(req: Request, res: Response) {
  const { id } = idParam.parse(req.params);
  if (id.toLowerCase() !== tenantId(res)) throw notFound("Restaurant");
  return id;
}

export const getRestaurant = asyncHandler(async (req, res) => {
  const doc = await Restaurant.findById(ownId(req, res)).lean();
  if (!doc) throw notFound("Restaurant");
  res.json({ data: withSettings(doc) });
});

export const updateRestaurant = asyncHandler(async (req, res) => {
  const id = ownId(req, res);
  const body = updateRestaurantBody.parse(req.body);
  const doc = await Restaurant.findById(id);
  if (!doc) throw notFound("Restaurant");
  doc.set(body);
  if (!doc.paymentCash && !doc.paymentCard) throw new HttpError(400, "Enable at least one payment method");
  if ((doc.locationLat == null) !== (doc.locationLng == null)) {
    throw new HttpError(400, "Set both latitude and longitude, or neither");
  }
  await doc.save();
  res.json({ data: doc });
});