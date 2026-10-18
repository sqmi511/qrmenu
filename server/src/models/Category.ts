import { Schema, model } from "mongoose";
import { isInt, makeLocalized } from "./shared.js";

const categorySchema = new Schema(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: { type: makeLocalized(60), required: true },
    order: { type: Number, default: 0, min: 0, validate: isInt },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

categorySchema.index({ restaurant: 1, order: 1 });

export const Category = model("Category", categorySchema);