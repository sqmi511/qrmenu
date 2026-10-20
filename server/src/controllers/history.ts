import { z } from "zod";
import { ORDER_STATUSES, ORDER_TYPES, Order } from "../models/Order.js";
import { objectId, restaurantIdParam } from "../schemas/common.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const historyQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  type: z.enum(ORDER_TYPES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  cursor: objectId.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listHistory = asyncHandler(async (req, res) => {
  const { restaurantId } = restaurantIdParam.parse(req.params); // verified by router.param
  const q = historyQuery.parse(req.query);

  const filter: Record<string, unknown> = { restaurant: restaurantId };
  if (q.status) filter.status = q.status;
  // orders from before delivery existed have no orderType: they are dine-in
  if (q.type === "dine_in") filter.orderType = { $nin: ["delivery", "takeaway"] };
  else if (q.type) filter.orderType = q.type;
  if (q.from || q.to) filter.createdAt = { ...(q.from && { $gte: q.from }), ...(q.to && { $lt: q.to }) };
  if (q.cursor) filter._id = { $lt: q.cursor };

  const rows = await Order.find(filter)
    .select("-publicToken")
    .sort({ _id: -1 })
    .limit(q.limit + 1)
    .lean();
  const hasMore = rows.length > q.limit;
  const data = hasMore ? rows.slice(0, q.limit) : rows;

  res.set("Cache-Control", "no-store");
  res.json({ data, nextCursor: hasMore ? String(data[data.length - 1]._id) : null });
});