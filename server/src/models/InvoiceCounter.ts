import { Schema, model } from "mongoose";

// one document per restaurant; _id is the restaurant id
const counterSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const InvoiceCounter = model("InvoiceCounter", counterSchema);