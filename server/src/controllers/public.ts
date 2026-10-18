import { z } from "zod";
import { Category } from "../models/Category.js";
import { Item } from "../models/Item.js";
import { Restaurant } from "../models/Restaurant.js";
import { slugSchema } from "../schemas/restaurant.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/httpError.js";
import { SETTING_FIELDS, withSettings } from "../utils/settings.js";

export const getPublicMenu = asyncHandler(async (req, res) => {
  const { slug } = z.object({ slug: slugSchema }).parse(req.params);

  const restaurant = await Restaurant.findOne({ slug, isActive: true })
    .select(`slug name description logoUrl coverUrl currency defaultLang accentColor tableCount ${SETTING_FIELDS}`)
    .lean();
  if (!restaurant) throw notFound("Restaurant");

  const [categories, items] = await Promise.all([
    Category.find({ restaurant: restaurant._id, isActive: true }).sort({ order: 1, _id: 1 }).select("name").lean(),
    Item.find({ restaurant: restaurant._id })
      .sort({ order: 1, _id: 1 })
      .select("category name description priceMinor imageUrl tags isAvailable")
      .lean(),
  ]);

  const byCat = new Map<string, typeof items>();
  for (const it of items) {
    const key = String(it.category);
    const list = byCat.get(key);
    if (list) list.push(it);
    else byCat.set(key, [it]);
  }

  const menu = categories
    .map((c) => ({ _id: c._id, name: c.name, items: byCat.get(String(c._id)) ?? [] }))
    .filter((c) => c.items.length > 0);

  res.set("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
  res.json({ data: { restaurant: withSettings(restaurant), categories: menu } });
});