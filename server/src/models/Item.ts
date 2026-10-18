import { Schema, model } from "mongoose";
import { isInt, makeLocalized } from "./shared.js";

export const ITEM_TAGS = ["vegan", "vegetarian", "spicy", "gluten-free", "halal", "new", "popular"] as const;

const itemSchema = new Schema(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    name: { type: makeLocalized(100), required: true },
    description: { type: makeLocalized(400, false), default: () => ({}) },
    priceMinor: { type: Number, required: true, min: 0, max: 10_000_000, validate: isInt },
    imageUrl: { type: String, default: "", maxlength: 500 },
    tags: { type: [{ type: String, enum: ITEM_TAGS }], default: [] },
    isAvailable: { type: Boolean, default: true },
    order: { type: Number, default: 0, min: 0, validate: isInt },
  },
  { timestamps: true, versionKey: false },
);

itemSchema.index({ restaurant: 1, category: 1, order: 1 });

export const Item = model("Item", itemSchema);