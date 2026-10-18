import { Router } from "express";
import * as s from "../controllers/super.js";

// mounted behind requireAuth + requireRole("super")
const r = Router();

r.get("/restaurants", s.listRestaurants);
r.post("/restaurants", s.createRestaurant);
r.post("/restaurants/:id/grant", s.grantPlan);
r.post("/restaurants/:id/extend", s.extendAccess);
r.patch("/restaurants/:id/suspend", s.setSuspended);
r.post("/restaurants/:id/reset-password", s.resetOwnerPassword);
r.get("/payments", s.listPayments);

export default r;