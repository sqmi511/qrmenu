import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { allowedOrigins, env } from "./config/env.js";
import { UPLOAD_DIR } from "./config/uploads.js";
import { serveImage } from "./controllers/images.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { limiter } from "./middleware/rateLimit.js";
import { originCheck } from "./middleware/originCheck.js";
import routes from "./routes/index.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (env.NODE_ENV === "production") app.set("trust proxy", env.TRUST_PROXY);

  // CORP cross-origin: uploaded images are loaded by the client from another origin
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: allowedOrigins, credentials: true }));

  // 1) old local files from development, if any; 2) images stored in MongoDB
  app.use(
    "/uploads",
    express.static(UPLOAD_DIR, {
      index: false,
      dotfiles: "ignore",
      maxAge: "30d",
      immutable: true,
      setHeaders: (res) => res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox"),
    }),
  );
  app.get("/uploads/:rid/:file", serveImage);

  app.use(originCheck);
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 });
  });
  app.use("/api", limiter(300, 60 * 1000), routes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}