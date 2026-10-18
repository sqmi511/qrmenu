import { Schema } from "mongoose";

export const makeLocalized = (max: number, requiredEn = true) =>
  new Schema(
    {
      en: { type: String, trim: true, maxlength: max, required: requiredEn, default: "" },
      ar: { type: String, trim: true, maxlength: max, default: "" },
    },
    { _id: false },
  );

export const isInt = { validator: Number.isInteger, message: "{PATH} must be an integer" };