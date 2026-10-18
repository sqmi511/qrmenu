import { z } from "zod";
import { PAY_METHODS } from "../models/Payment.js";
import { email } from "./auth.js";
import { localized } from "./common.js";
import { slugSchema } from "./restaurant.js";

export const createTenantBody = z.strictObject({
  name: localized(80),
  slug: slugSchema,
  ownerEmail: email,
});

export const grantBody = z.strictObject({
  plan: z.enum(["monthly", "annual", "lifetime"]),
  amountUsd: z.number().min(0).max(100_000),
  method: z.enum(PAY_METHODS),
  reference: z.string().trim().max(80).optional(),
  note: z.string().trim().max(200).optional(),
});

export const extendBody = z.strictObject({ days: z.number().int().min(1).max(365) });
export const suspendBody = z.strictObject({ suspended: z.boolean() });