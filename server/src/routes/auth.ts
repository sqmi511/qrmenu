import { Router } from "express";
import * as auth from "../controllers/auth.js";
import { authUser, requireAuth } from "../middleware/auth.js";
import { limiter } from "../middleware/rateLimit.js";
import { signSocketToken } from "../utils/token.js";

const r = Router();

r.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// no public registration: restaurants are created by the super-admin
r.post("/login", limiter(10, 15 * 60 * 1000, true), auth.login); // only failures count
r.post("/logout", auth.logout);
r.get("/me", requireAuth, auth.me);
r.get("/socket-token", requireAuth, (_req, res) => {
  res.json({ data: { token: signSocketToken(authUser(res).id) } });
});

export default r;