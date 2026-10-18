import { Router } from "express";
import * as auth from "../controllers/auth.js";
import * as billing from "../controllers/billing.js";
import * as categories from "../controllers/categories.js";
import * as history from "../controllers/history.js";
import * as invoices from "../controllers/invoices.js";
import * as items from "../controllers/items.js";
import * as orders from "../controllers/orders.js";
import { getPublicMenu } from "../controllers/public.js";
import * as restaurants from "../controllers/restaurants.js";
import * as staff from "../controllers/staff.js";
import * as stats from "../controllers/stats.js";
import * as uploads from "../controllers/uploads.js";
import { openGate, requireActive } from "../middleware/access.js";
import { authUser, requireAuth, requireRole } from "../middleware/auth.js";
import { limiter } from "../middleware/rateLimit.js";
import { imageUpload } from "../middleware/upload.js";
import { HttpError } from "../utils/httpError.js";
import authRoutes from "./auth.js";
import superRoutes from "./super.js";

const r = Router();
const admin = requireRole("admin");

// public (a restaurant whose subscription ended answers 503)
r.use("/public/restaurants/:slug", openGate);
r.get("/public/restaurants/:slug/menu", limiter(120, 60 * 1000), getPublicMenu);
r.post("/public/restaurants/:slug/orders", limiter(30, 10 * 60 * 1000), orders.createOrder);
r.get("/public/orders/:token", orders.getPublicOrder);
r.use("/auth", authRoutes);

// everything below requires a session
r.use(requireAuth);

// reachable even when the subscription has ended
r.get("/billing", admin, billing.getBilling);
r.post("/account/password", limiter(10, 15 * 60 * 1000), auth.changePassword);

// super-admin only
r.use("/super", requireRole("super"), superRoutes);

// everything below needs an active subscription
r.use(requireActive);

// any :restaurantId must be the caller's own restaurant (404 otherwise, so ids can't be probed)
r.param("restaurantId", (_req, res, next, value: string) => {
  if (value.toLowerCase() !== authUser(res).restaurant) return next(new HttpError(404, "Restaurant not found"));
  next();
});

// restaurant (own only)
r.get("/restaurants/:id", restaurants.getRestaurant);
r.patch("/restaurants/:id", admin, restaurants.updateRestaurant);

// categories: staff can read, admin can write
r.get("/restaurants/:restaurantId/categories", categories.listCategories);
r.post("/restaurants/:restaurantId/categories", admin, categories.createCategory);
r.patch("/restaurants/:restaurantId/categories/reorder", admin, categories.reorderCategories);
r.patch("/categories/:id", admin, categories.updateCategory);
r.delete("/categories/:id", admin, categories.deleteCategory);

// items
r.get("/restaurants/:restaurantId/items", items.listItems);
r.post("/restaurants/:restaurantId/items", admin, items.createItem);
r.patch("/restaurants/:restaurantId/items/reorder", admin, items.reorderItems);
r.get("/items/:id", items.getItem);
r.patch("/items/:id", admin, items.updateItem);
r.delete("/items/:id", admin, items.deleteItem);

// orders: admin and staff
r.get("/restaurants/:restaurantId/orders", orders.listOrders);
r.get("/restaurants/:restaurantId/orders/history", history.listHistory);
r.patch("/orders/:id/status", orders.updateOrderStatus);
r.patch("/orders/:id/payment", orders.updateOrderPayment);
r.post("/orders/:id/invoice", invoices.issueInvoice);

// sales figures: admin only
r.get("/restaurants/:restaurantId/stats", admin, stats.getStats);

// image upload (admin only; role and limit are checked before the body is parsed)
r.post("/uploads/image", admin, limiter(30, 10 * 60 * 1000), imageUpload, uploads.uploadImage);

// staff accounts (admin only)
r.get("/staff", admin, staff.listStaff);
r.post("/staff", admin, staff.createStaff);
r.delete("/staff/:id", admin, staff.deleteStaff);

export default r;