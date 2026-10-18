import { tenantId } from "../middleware/auth.js";
import { Item } from "../models/Item.js";
import { idParam, reorderBody, restaurantIdParam } from "../schemas/common.js";
import { createItemBody, listItemsQuery, updateItemBody } from "../schemas/item.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireCategory, requireRestaurant } from "../utils/guards.js";
import { HttpError, notFound } from "../utils/httpError.js";

// :restaurantId is verified against the session by router.param in routes/index.ts

export const listItems = asyncHandler(async (req, res) => {
  const { restaurantId } = restaurantIdParam.parse(req.params);
  const { category } = listItemsQuery.parse(req.query);
  await requireRestaurant(restaurantId);
  const filter = category ? { restaurant: restaurantId, category } : { restaurant: restaurantId };
  res.json({ data: await Item.find(filter).sort({ order: 1, _id: 1 }).lean() });
});

export const getItem = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const doc = await Item.findOne({ _id: id, restaurant: tenantId(res) }).lean();
  if (!doc) throw notFound("Item");
  res.json({ data: doc });
});

export const createItem = asyncHandler(async (req, res) => {
  const { restaurantId } = restaurantIdParam.parse(req.params);
  const body = createItemBody.parse(req.body);
  await requireRestaurant(restaurantId);
  await requireCategory(body.category, restaurantId);
  const last = await Item.findOne({ category: body.category }).sort({ order: -1 }).select("order").lean();
  const doc = await Item.create({
    ...body,
    restaurant: restaurantId,
    order: body.order ?? (last ? last.order + 1 : 0),
  });
  res.status(201).json({ data: doc });
});

export const updateItem = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = updateItemBody.parse(req.body);
  const restaurant = tenantId(res);
  const doc = await Item.findOne({ _id: id, restaurant });
  if (!doc) throw notFound("Item");
  if (body.category) await requireCategory(body.category, restaurant);
  doc.set(body);
  await doc.save();
  res.json({ data: doc });
});

export const deleteItem = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const doc = await Item.findOneAndDelete({ _id: id, restaurant: tenantId(res) });
  if (!doc) throw notFound("Item");
  res.status(204).end();
});

export const reorderItems = asyncHandler(async (req, res) => {
  const { restaurantId } = restaurantIdParam.parse(req.params);
  const { ids } = reorderBody.parse(req.body);
  const count = await Item.countDocuments({ restaurant: restaurantId, _id: { $in: ids } });
  if (count !== ids.length) throw new HttpError(400, "Some ids do not belong to this restaurant");
  await Item.bulkWrite(
    ids.map((id, i) => ({
      updateOne: { filter: { _id: id, restaurant: restaurantId }, update: { $set: { order: i } } },
    })),
  );
  res.status(204).end();
});