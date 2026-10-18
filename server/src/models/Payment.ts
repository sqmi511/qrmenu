import { Schema, model } from "mongoose";
import { isInt } from "./shared.js";

export const PAY_METHODS = ["whish", "omt", "bank", "card", "cash", "other"] as const;

// your own ledger: one row each time you activate a paid plan
const paymentSchema = new Schema(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    plan: { type: String, enum: ["monthly", "annual", "lifetime"], required: true },
    amountCents: { type: Number, required: true, min: 0, validate: isInt },
    method: { type: String, enum: PAY_METHODS, required: true },
    reference: { type: String, trim: true, maxlength: 80, default: "" },
    note: { type: String, trim: true, maxlength: 200, default: "" },
    coversUntil: { type: Date, default: null },
    grantedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

paymentSchema.index({ createdAt: -1 });

export const Payment = model("Payment", paymentSchema);