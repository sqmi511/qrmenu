import { Category } from "../models/Category.js";
import { Restaurant } from "../models/Restaurant.js";
import { HttpError, notFound } from "./httpError.js";

export async function requireRestaurant(id: string) {
  if (!(await Restaurant.exists({ _id: id }))) throw notFound("Restaurant");
}

export async function requireCategory(categoryId: string, restaurantId: string) {
  if (!(await Category.exists({ _id: categoryId, restaurant: restaurantId }))) {
    throw new HttpError(400, "Category does not belong to this restaurant");
  }
}