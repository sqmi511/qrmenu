import { z } from "zod";
import { ITEM_TAGS } from "../models/Item.js";
import { imageUrl, localized, localizedOptional, nonEmpty, objectId } from "./common.js";

const shape = {
  category: objectId,
  name: localized(100),
  description: localizedOptional(400),
  priceMinor: z.number().int().min(0).max(10_000_000),
  imageUrl,
  tags: z.array(z.enum(ITEM_TAGS)).max(ITEM_TAGS.length),
  isAvailable: z.boolean(),
  order: z.number().int().min(0),
};

export const createItemBody = z.strictObject(shape).partial().required({ category: true, name: true, priceMinor: true });
export const updateItemBody = z.strictObject(shape).partial().refine(nonEmpty, "Empty update");
export const listItemsQuery = z.object({ category: objectId.optional() });