import mongoose from "mongoose";
import { z } from "zod";
import { Order } from "../models/Order.js";
import { restaurantIdParam } from "../schemas/common.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";

const validTz = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const statsQuery = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  tz: z.string().max(64).refine(validTz, "Invalid time zone"),
});

interface Facets {
  totals: {
    orders: number;
    salesMinor: number;
    vatMinor: number;
    collectedMinor: number;
    delivery: number;
    takeaway: number;
  }[];
  cancelled: { n: number }[];
  daily: { _id: string; orders: number; salesMinor: number }[];
  top: { _id: unknown; name: { en: string; ar?: string }; qty: number; salesMinor: number }[];
}

export const getStats = asyncHandler(async (req, res) => {
  const { restaurantId } = restaurantIdParam.parse(req.params); // verified by router.param
  const { from, to, tz } = statsQuery.parse(req.query);
  if (to <= from || to.getTime() - from.getTime() > 366 * 86_400_000) throw new HttpError(400, "Invalid date range");

  const rid = new mongoose.Types.ObjectId(restaurantId); // aggregate() does not cast ids
  const live = { $ne: "cancelled" };

  const [agg, pendingNow] = await Promise.all([
    Order.aggregate<Facets>([
      { $match: { restaurant: rid, createdAt: { $gte: from, $lt: to } } },
      {
        $facet: {
          totals: [
            { $match: { status: live } },
            {
              $group: {
                _id: null,
                orders: { $sum: 1 },
                salesMinor: { $sum: "$totalMinor" },
                vatMinor: { $sum: { $ifNull: ["$vatMinor", 0] } },
                collectedMinor: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalMinor", 0] } },
                delivery: { $sum: { $cond: [{ $eq: ["$orderType", "delivery"] }, 1, 0] } },
                takeaway: { $sum: { $cond: [{ $eq: ["$orderType", "takeaway"] }, 1, 0] } },
              },
            },
          ],
          cancelled: [{ $match: { status: "cancelled" } }, { $count: "n" }],
          daily: [
            { $match: { status: live } },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: tz } },
                orders: { $sum: 1 },
                salesMinor: { $sum: "$totalMinor" },
              },
            },
            { $sort: { _id: 1 } },
          ],
          top: [
            { $match: { status: live } },
            { $unwind: "$lines" },
            {
              $group: {
                _id: "$lines.item",
                name: { $first: "$lines.nameSnapshot" },
                qty: { $sum: "$lines.qty" },
                salesMinor: { $sum: { $multiply: ["$lines.priceMinorSnapshot", "$lines.qty"] } },
              },
            },
            { $sort: { qty: -1, salesMinor: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ]),
    Order.countDocuments({ restaurant: rid, status: "pending" }),
  ]);

  const f = agg[0];
  const t = f?.totals[0];
  const orders = t?.orders ?? 0;
  const delivery = t?.delivery ?? 0;
  const takeaway = t?.takeaway ?? 0;

  res.set("Cache-Control", "no-store");
  res.json({
    data: {
      from,
      to,
      tz,
      orders,
      salesMinor: t?.salesMinor ?? 0,
      vatMinor: t?.vatMinor ?? 0,
      collectedMinor: t?.collectedMinor ?? 0,
      deliveryOrders: delivery,
      takeawayOrders: takeaway,
      dineInOrders: orders - delivery - takeaway,
      cancelled: f?.cancelled[0]?.n ?? 0,
      pendingNow,
      daily: (f?.daily ?? []).map((d) => ({ day: d._id, orders: d.orders, salesMinor: d.salesMinor })),
      top: (f?.top ?? []).map((x) => ({
        id: String(x._id),
        name: x.name,
        qty: x.qty,
        salesMinor: x.salesMinor,
      })),
    },
  });
});