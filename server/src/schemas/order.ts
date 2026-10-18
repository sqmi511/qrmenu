import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "../models/Order.js";
import { objectId } from "./common.js";

const lines = z
  .array(
    z.strictObject({
      itemId: objectId,
      qty: z.number().int().min(1).max(20),
      note: z.string().trim().max(200).optional(),
    }),
  )
  .min(1)
  .max(50)
  .refine((a) => new Set(a.map((l) => l.itemId.toLowerCase())).size === a.length, "Duplicate items");

const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s()-]/g, ""))
  .refine((s) => /^\+?\d{6,15}$/.test(s), "Invalid phone number");

const customer = z.strictObject({
  name: z.string().trim().min(2).max(80),
  phone,
  address: z.string().trim().min(5).max(300),
  notes: z.string().trim().max(200).optional(),
  location: z
    .strictObject({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
});

const paymentMethod = z.enum(PAYMENT_METHODS).default("cash");

export const createOrderBody = z.discriminatedUnion("orderType", [
  z.strictObject({
    orderType: z.literal("dine_in"),
    tableNumber: z.number().int().min(1).max(500),
    paymentMethod,
    lines,
  }),
  z.strictObject({ orderType: z.literal("delivery"), customer, paymentMethod, lines }),
]);

export const listOrdersQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const updateStatusBody = z.strictObject({ status: z.enum(ORDER_STATUSES) });
export const updatePaymentBody = z.strictObject({ paymentStatus: z.enum(PAYMENT_STATUSES) });

export const tokenParam = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{32}$/, "Invalid token") });