import { Schema, model } from "mongoose";
import { isInt, makeLocalized } from "./shared.js";

const restaurantSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 40,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    name: { type: makeLocalized(80), required: true },
    description: { type: makeLocalized(300, false), default: () => ({}) },
    logoUrl: { type: String, default: "", maxlength: 500 },
    coverUrl: { type: String, default: "", maxlength: 500 },
    currency: { type: String, default: "USD", uppercase: true, match: /^[A-Z]{3}$/ },
    defaultLang: { type: String, enum: ["en", "ar"], default: "en" },
    tableCount: { type: Number, default: 10, min: 1, max: 500, validate: isInt },
    accentColor: { type: String, default: "#f97316", match: /^#[0-9a-f]{6}$/i },
    isActive: { type: Boolean, default: true },

    // tax + ordering
    vatBps: { type: Number, default: 1100, min: 0, max: 10_000, validate: isInt },
    pricesIncludeVat: { type: Boolean, default: false },
    dineInEnabled: { type: Boolean, default: true },
    deliveryEnabled: { type: Boolean, default: false },
    takeawayEnabled: { type: Boolean, default: false },
    deliveryFeeMinor: { type: Number, default: 0, min: 0, max: 10_000_000, validate: isInt },
    minDeliveryOrderMinor: { type: Number, default: 0, min: 0, max: 10_000_000, validate: isInt },
    whatsappNumber: { type: String, default: "", match: /^(\d{6,15})?$/ },

    // payment methods (cash / card machine)
    paymentCash: { type: Boolean, default: true },
    paymentCard: { type: Boolean, default: false },

    // distance pricing: 0 = off
    deliveryPerKmMinor: { type: Number, default: 0, min: 0, max: 10_000_000, validate: isInt },
    freeDeliveryOverMinor: { type: Number, default: 0, min: 0, max: 10_000_000, validate: isInt },
    maxDeliveryKm: { type: Number, default: 0, min: 0, max: 500 },
    locationLat: { type: Number, default: null, min: -90, max: 90 },
    locationLng: { type: Number, default: null, min: -180, max: 180 },

    // business details printed on invoices (admin only, never in the public menu)
    address: { type: String, default: "", maxlength: 200 },
    phone: { type: String, default: "", maxlength: 30 },
    vatNumber: { type: String, default: "", maxlength: 30 },
    invoiceFooter: { type: String, default: "", maxlength: 200 },

    // subscription: set only by the super-admin. NO defaults on purpose: a missing plan means
    // "created before billing existed", and a default would be written back when an old restaurant is saved.
    plan: { type: String, enum: ["none", "trial", "monthly", "annual", "lifetime"] },
    accessUntil: { type: Date },
    suspended: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

export const Restaurant = model("Restaurant", restaurantSchema);