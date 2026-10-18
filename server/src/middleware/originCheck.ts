import type { RequestHandler } from "express";
import { allowedOrigins } from "../config/env.js";

const allowed = new Set(allowedOrigins);
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

// CSRF defense for cookie auth: browsers always send Origin on cross-site writes.
export const originCheck: RequestHandler = (req, res, next) => {
  if (SAFE.has(req.method)) return next();
  const origin = req.get("origin");
  if (origin && !allowed.has(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  next();
};