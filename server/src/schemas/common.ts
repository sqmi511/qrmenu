import { z } from "zod";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
export const idParam = z.object({ id: objectId });
export const restaurantIdParam = z.object({ restaurantId: objectId });

export const localized = (max: number) =>
  z.strictObject({ en: z.string().trim().min(1).max(max), ar: z.string().trim().max(max).optional() });

export const localizedOptional = (max: number) =>
  z.strictObject({ en: z.string().trim().max(max).optional(), ar: z.string().trim().max(max).optional() });

// /uploads/<restaurant>/<image>.ext (the file part is 24 hex for database images, 32 for older disk files)
const UPLOAD_PATH = /^\/uploads\/[a-f\d]{24}\/[a-f\d]{24,32}\.(?:jpg|png|webp|gif)$/;

// blocks javascript:/data: URLs and path tricks
export const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || /^https?:\/\//i.test(v) || UPLOAD_PATH.test(v),
    "Must be an http(s) URL or an uploaded image",
  );

export const reorderBody = z.strictObject({
  ids: z
    .array(objectId)
    .min(1)
    .max(500)
    .refine((a) => new Set(a).size === a.length, "Duplicate ids"),
});

export const nonEmpty = (o: object) => Object.keys(o).length > 0;