import { tenantId } from "../middleware/auth.js";
import { Category } from "../models/Category.js";
import { Item } from "../models/Item.js";
import { createCategoryBody, updateCategoryBody } from "../schemas/category.js";
import { idParam, reorderBody, restaurantIdParam } from "../schemas/common.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireRestaurant } from "../utils/guards.js";
import { HttpError, notFound } from "../utils/httpError.js";

// :restaurantId is verified against the session by router.param in routes/index.ts

export const listCategories = asyncHandler(async (req, res) => {
  const { restaurantId } = restaurantIdParam.parse(req.params);
  await requireRestaurant(restaurantId);
  res.json({ data: await Category.find({ restaurant: restaurantId }).sort({ order: 1, _id: 1 }).lean() });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { restaurantId } = restaurantIdParam.parse(req.params);
  const body = createCategoryBody.parse(req.body);
  await requireRestaurant(restaurantId);
  const last = await Category.findOne({ restaurant: restaurantId }).sort({ order: -1 }).select("order").lean();
  const doc = await Category.create({
    ...body,
    restaurant: restaurantId,
    order: body.order ?? (last ? last.order + 1 : 0),
  });
  res.status(201).json({ data: doc });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = updateCategoryBody.parse(req.body);
  const doc = await Category.findOne({ _id: id, restaurant: tenantId(res) });
  if (!doc) throw notFound("Category");
  doc.set(body);
  await doc.save();
  res.json({ data: doc });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const restaurant = tenantId(res);
  const doc = await Category.findOneAndDelete({ _id: id, restaurant });
  if (!doc) throw notFound("Category");
  await Item.deleteMany({ category: id, restaurant });
  res.status(204).end();
});

export const reorderCategories = asyncHandler(async (req, res) => {
  const { restaurantId } = restaurantIdParam.parse(req.params);
  const { ids } = reorderBody.parse(req.body);
  const count = await Category.countDocuments({ restaurant: restaurantId, _id: { $in: ids } });
  if (count !== ids.length) throw new HttpError(400, "Some ids do not belong to this restaurant");
  await Category.bulkWrite(
    ids.map((id, i) => ({
      updateOne: { filter: { _id: id, restaurant: restaurantId }, update: { $set: { order: i } } },
    })),
  );
  res.status(204).end();
});