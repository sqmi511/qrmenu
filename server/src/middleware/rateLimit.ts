import { rateLimit } from "express-rate-limit";

export const limiter = (limit: number, windowMs: number, skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, try again later" },
  });