import { randomBytes } from "node:crypto";
import { Schema, model } from "mongoose";
import { isInt, makeLocalized } from "./shared.js";

export const ORDER_STATUSES = ["pending", "accepted", "preparing", "ready", "served", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TYPES = ["dine_in", "delivery", "takeaway"] as const;
export const PAYMENT_METHODS = ["cash", "card"] as const;
export const PAYMENT_STATUSES = ["unpaid", "paid"] as const;

export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served"],
  served: [],
  cancelled: [],
};

const lineSchema = new Schema(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    nameSnapshot: { type: makeLocalized(100), required: true },
    priceMinorSnapshot: { type: Number, required: true, min: 0, validate: isInt },
    qty: { type: Number, required: true, min: 1, max: 20, validate: isInt },
    note: { type: String, trim: true, maxlength: 200, default: "" },
  },
  { _id: false },
);

const locationSchema = new Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    phone: { type: String, required: true, trim: true, match: /^\+?\d{6,15}$/ },
    // required for delivery by the zod schema; takeaway customers have no address
    address: { type: String, trim: true, maxlength: 300, default: "" },
    notes: { type: String, trim: true, maxlength: 200, default: "" },
    location: { type: locationSchema, default: undefined },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    orderType: { type: String, enum: ORDER_TYPES, default: "dine_in" },
    tableNumber: { type: Number, min: 1, max: 500, validate: isInt }, // dine-in only (enforced by zod)
    customer: { type: customerSchema, default: undefined }, // delivery and takeaway (enforced by zod)
    pickupNote: { type: String, trim: true, maxlength: 80, default: "" }, // takeaway only, e.g. "in 20 minutes"
    lines: {
      type: [lineSchema],
      validate: { validator: (v: unknown[]) => v.length > 0 && v.length <= 50, message: "1 to 50 lines" },
    },
    // pricing snapshot, always computed by the server
    vatBps: { type: Number, required: true, min: 0, max: 10_000, validate: isInt },
    pricesIncludeVat: { type: Boolean, required: true },
    subtotalMinor: { type: Number, required: true, min: 0, validate: isInt },
    vatMinor: { type: Number, required: true, min: 0, validate: isInt },
    deliveryFeeMinor: { type: Number, required: true, min: 0, validate: isInt },
    deliveryDistanceKm: { type: Number, min: 0, max: 1000 },
    totalMinor: { type: Number, required: true, min: 0, validate: isInt },
    // paid in person: cash, or card on the restaurant's machine. Staff mark it paid.
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cash" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid" },
    // assigned once, on the first print (see controllers/invoices.ts)
    invoiceNo: { type: Number, min: 1, validate: isInt },
    invoicedAt: { type: Date },
    status: { type: String, enum: ORDER_STATUSES, default: "pending" },
    publicToken: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: () => randomBytes(24).toString("base64url"),
    },
  },
  { timestamps: true, versionKey: false },
);

orderSchema.index({ restaurant: 1, status: 1, createdAt: -1 });
// a number can never be reused inside a restaurant
orderSchema.index(
  { restaurant: 1, invoiceNo: 1 },
  { unique: true, partialFilterExpression: { invoiceNo: { $type: "number" } } },
);

export const Order = model("Order", orderSchema);