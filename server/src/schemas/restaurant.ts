import { z } from "zod";
import { imageUrl, localized, localizedOptional, nonEmpty } from "./common.js";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only");

const shape = {
  slug: slugSchema,
  name: localized(80),
  description: localizedOptional(300),
  logoUrl: imageUrl,
  coverUrl: imageUrl,
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "ISO 4217 code"),
  defaultLang: z.enum(["en", "ar"]),
  tableCount: z.number().int().min(1).max(500),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Hex color like #f97316"),
  isActive: z.boolean(),
  vatBps: z.number().int().min(0).max(10_000),
  pricesIncludeVat: z.boolean(),
  dineInEnabled: z.boolean(),
  deliveryEnabled: z.boolean(),
  deliveryFeeMinor: z.number().int().min(0).max(10_000_000),
  minDeliveryOrderMinor: z.number().int().min(0).max(10_000_000),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^(\d{6,15})?$/, "Digits only, with country code, no + or spaces"),
  paymentCash: z.boolean(),
  paymentCard: z.boolean(),
  deliveryPerKmMinor: z.number().int().min(0).max(10_000_000),
  freeDeliveryOverMinor: z.number().int().min(0).max(10_000_000),
  maxDeliveryKm: z.number().min(0).max(500),
  locationLat: z.number().min(-90).max(90).nullable(),
  locationLng: z.number().min(-180).max(180).nullable(),
  address: z.string().trim().max(200),
  phone: z.string().trim().max(30),
  vatNumber: z.string().trim().max(30),
  invoiceFooter: z.string().trim().max(200),
};

export const createRestaurantBody = z.strictObject(shape).partial().required({ slug: true, name: true });
export const updateRestaurantBody = z.strictObject(shape).partial().refine(nonEmpty, "Empty update");