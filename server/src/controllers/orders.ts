import { z } from "zod";
import { tenantId } from "../middleware/auth.js";
import { Category } from "../models/Category.js";
import { Item } from "../models/Item.js";
import { NEXT_STATUS, ORDER_STATUSES, Order } from "../models/Order.js";
import { Restaurant } from "../models/Restaurant.js";
import { emitOrderCreated, emitOrderUpdated } from "../realtime.js";
import { idParam, restaurantIdParam } from "../schemas/common.js";
import {
  createOrderBody,
  listOrdersQuery,
  tokenParam,
  updatePaymentBody,
  updateStatusBody,
} from "../schemas/order.js";
import { slugSchema } from "../schemas/restaurant.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { quoteDelivery } from "../utils/delivery.js";
import { HttpError, notFound } from "../utils/httpError.js";
import { computeTotals } from "../utils/pricing.js";
import { SETTING_FIELDS, withSettings } from "../utils/settings.js";

/* ---------- public ---------- */

export const createOrder = asyncHandler(async (req, res) => {
  const { slug } = z.object({ slug: slugSchema }).parse(req.params);
  const body = createOrderBody.parse(req.body);

  const found = await Restaurant.findOne({ slug, isActive: true })
    .select(`tableCount ${SETTING_FIELDS}`)
    .lean();
  if (!found) throw notFound("Restaurant");
  const restaurant = withSettings(found);

  if (body.orderType === "dine_in") {
    if (!restaurant.dineInEnabled) throw new HttpError(400, "Dine-in ordering is not available");
    if (body.tableNumber > restaurant.tableCount) throw new HttpError(400, "Unknown table");
  } else if (body.orderType === "delivery") {
    if (!restaurant.deliveryEnabled) throw new HttpError(400, "Delivery is not available");
  } else if (!restaurant.takeawayEnabled) {
    throw new HttpError(400, "Takeaway is not available");
  }

  const methodOn = body.paymentMethod === "cash" ? restaurant.paymentCash : restaurant.paymentCard;
  if (!methodOn) throw new HttpError(400, "This payment method is not available");

  // prices and names come from the DB, never from the client
  const items = await Item.find({
    _id: { $in: body.lines.map((l) => l.itemId) },
    restaurant: found._id,
    isAvailable: true,
  })
    .select("category name priceMinor")
    .lean();

  const cats = await Category.find({
    _id: { $in: [...new Set(items.map((i) => String(i.category)))] },
    restaurant: found._id,
    isActive: true,
  })
    .select("_id")
    .lean();
  const activeCats = new Set(cats.map((c) => String(c._id)));
  const byId = new Map(items.filter((i) => activeCats.has(String(i.category))).map((i) => [String(i._id), i] as const));
  if (byId.size !== body.lines.length) throw new HttpError(409, "Some items are no longer available");

  const lines = body.lines.map((l) => {
    const it = byId.get(l.itemId.toLowerCase())!;
    return {
      item: it._id,
      nameSnapshot: { en: it.name.en, ar: it.name.ar ?? "" },
      priceMinorSnapshot: it.priceMinor,
      qty: l.qty,
      note: l.note ?? "",
    };
  });
  const subtotalMinor = lines.reduce((s, l) => s + l.priceMinorSnapshot * l.qty, 0);

  // only delivery has a fee; dine-in and takeaway are always 0
  let deliveryFeeMinor = 0;
  let distanceKm: number | null = null;
  if (body.orderType === "delivery") {
    if (subtotalMinor < restaurant.minDeliveryOrderMinor) {
      throw new HttpError(400, "Order is below the minimum for delivery");
    }
    const q = quoteDelivery(restaurant, subtotalMinor, body.customer.location);
    if (!q.ok) {
      throw new HttpError(
        400,
        q.reason === "too_far"
          ? "Your location is outside the delivery area"
          : "Share your location so we can calculate the delivery fee",
      );
    }
    deliveryFeeMinor = q.feeMinor;
    distanceKm = q.distanceKm;
  }

  const totals = computeTotals(subtotalMinor, {
    vatBps: restaurant.vatBps,
    pricesIncludeVat: restaurant.pricesIncludeVat,
    deliveryFeeMinor,
  });

  const order = await Order.create({
    restaurant: found._id,
    orderType: body.orderType,
    ...(body.orderType === "dine_in" ? { tableNumber: body.tableNumber } : { customer: body.customer }),
    ...(body.orderType === "takeaway" && body.pickupNote ? { pickupNote: body.pickupNote } : {}),
    paymentMethod: body.paymentMethod,
    ...(distanceKm !== null ? { deliveryDistanceKm: distanceKm } : {}),
    lines,
    vatBps: restaurant.vatBps,
    pricesIncludeVat: restaurant.pricesIncludeVat,
    ...totals,
  });

  // live alert for the restaurant's staff (the public token is never sent to staff)
  const { publicToken: _token, ...forStaff } = order.toObject();
  emitOrderCreated(String(found._id), forStaff);

  res.set("Cache-Control", "no-store");
  res.status(201).json({ data: { token: order.publicToken, status: order.status, totalMinor: order.totalMinor } });
});

export const getPublicOrder = asyncHandler(async (req, res) => {
  const { token } = tokenParam.parse(req.params);
  const found = await Order.findOne({ publicToken: token }).lean();
  if (!found) throw notFound("Order");
  const order = found as typeof found & { createdAt: Date; updatedAt: Date };

  const restaurant = await Restaurant.findById(order.restaurant)
    .select("-_id slug name currency defaultLang accentColor whatsappNumber")
    .lean();
  if (!restaurant) throw notFound("Order");

  // orders created before VAT/delivery/payment/takeaway existed have no such fields
  const c = order.customer;
  res.set("Cache-Control", "no-store");
  res.json({
    data: {
      orderType: order.orderType ?? "dine_in",
      status: order.status,
      tableNumber: order.tableNumber ?? null,
      subtotalMinor: order.subtotalMinor ?? order.totalMinor,
      vatMinor: order.vatMinor ?? 0,
      deliveryFeeMinor: order.deliveryFeeMinor ?? 0,
      deliveryDistanceKm: order.deliveryDistanceKm ?? null,
      vatBps: order.vatBps ?? 0,
      pricesIncludeVat: order.pricesIncludeVat ?? false,
      totalMinor: order.totalMinor,
      paymentMethod: order.paymentMethod ?? "cash",
      paymentStatus: order.paymentStatus ?? "unpaid",
      pickupNote: order.pickupNote ?? "",
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customer: c
        ? {
            name: c.name,
            phone: c.phone,
            address: c.address ?? "",
            notes: c.notes ?? "",
            location: c.location ?? null,
          }
        : null,
      lines: order.lines.map((l) => ({
        name: l.nameSnapshot,
        priceMinor: l.priceMinorSnapshot,
        qty: l.qty,
        note: l.note,
      })),
      restaurant: { ...restaurant, whatsappNumber: restaurant.whatsappNumber ?? "" },
    },
  });
});

/* ---------- admin + staff (tenant-scoped) ---------- */

export const listOrders = asyncHandler(async (req, res) => {
  const { restaurantId } = restaurantIdParam.parse(req.params); // verified by router.param
  const { status, limit } = listOrdersQuery.parse(req.query);
  const filter = status ? { restaurant: restaurantId, status } : { restaurant: restaurantId };
  const data = await Order.find(filter).select("-publicToken").sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ data });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { status } = updateStatusBody.parse(req.body);
  const restaurant = tenantId(res);

  // atomic: only moves forward from a state that allows the target
  const from = ORDER_STATUSES.filter((s) => NEXT_STATUS[s].includes(status));
  const doc = await Order.findOneAndUpdate(
    { _id: id, restaurant, status: { $in: from } },
    { $set: { status } },
    { new: true },
  ).lean();

  if (!doc) {
    if (!(await Order.exists({ _id: id, restaurant }))) throw notFound("Order");
    throw new HttpError(409, "Invalid status change");
  }

  const { publicToken, ...order } = doc;
  emitOrderUpdated(restaurant, publicToken, order);
  res.json({ data: order });
});

export const updateOrderPayment = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { paymentStatus } = updatePaymentBody.parse(req.body);
  const restaurant = tenantId(res);

  const doc = await Order.findOneAndUpdate(
    { _id: id, restaurant, status: { $ne: "cancelled" } },
    { $set: { paymentStatus } },
    { new: true },
  ).lean();

  if (!doc) {
    if (!(await Order.exists({ _id: id, restaurant }))) throw notFound("Order");
    throw new HttpError(409, "Cancelled orders can't be changed");
  }

  const { publicToken, ...order } = doc;
  emitOrderUpdated(restaurant, publicToken, order); // staff boards update, the customer page refetches
  res.json({ data: order });
});