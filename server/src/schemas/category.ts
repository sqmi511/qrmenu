import { z } from "zod";
import { localized, nonEmpty } from "./common.js";

const shape = {
  name: localized(60),
  order: z.number().int().min(0),
  isActive: z.boolean(),
};

export const createCategoryBody = z.strictObject(shape).partial().required({ name: true });
export const updateCategoryBody = z.strictObject(shape).partial().refine(nonEmpty, "Empty update");