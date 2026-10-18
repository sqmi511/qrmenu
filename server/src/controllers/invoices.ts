import mongoose from "mongoose";
import { tenantId } from "../middleware/auth.js";
import { InvoiceCounter } from "../models/InvoiceCounter.js";
import { Order } from "../models/Order.js";
import { idParam } from "../schemas/common.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, notFound } from "../utils/httpError.js";

/** Assigns the next invoice number once. Calling it again returns the same number. */
export const issueInvoice = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const restaurant = tenantId(res);

  // the counter bump and the order update commit together, so numbers never skip or repeat
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: id, restaurant }).session(session);
      if (!order) throw notFound("Order");
      if (order.status === "cancelled") throw new HttpError(409, "Cancelled orders can't be invoiced");
      if (order.invoiceNo) return;

      const counter = await InvoiceCounter.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(restaurant) },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, session },
      );
      if (!counter) throw new HttpError(500, "Couldn't create the invoice number");

      order.invoiceNo = counter.seq;
      order.invoicedAt = new Date();
      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }

  const doc = await Order.findOne({ _id: id, restaurant }).select("-publicToken").lean();
  res.json({ data: doc });
});