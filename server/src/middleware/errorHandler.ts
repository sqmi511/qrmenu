import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Route not found" });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    const big = err.code === "LIMIT_FILE_SIZE";
    res.status(big ? 413 : 400).json({ error: big ? "Image is too large (max 5 MB)" : "Upload failed" });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: "Validation failed",
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    });
    return;
  }
  const e = err as { code?: number; type?: string; keyValue?: Record<string, unknown> };
  if (e.code === 11000) {
    res.status(409).json({ error: "Already exists", fields: Object.keys(e.keyValue ?? {}) });
    return;
  }
  if (e.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }
  if (e.type === "entity.too.large") {
    res.status(413).json({ error: "Payload too large" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};