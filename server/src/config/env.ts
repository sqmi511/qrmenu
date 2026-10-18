import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CLIENT_URL: z.string().min(1),
  // number of proxies in front of the API (Vercel + Render = 2)
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
  // shown to restaurant owners on the Billing page
  BILLING_WHISH_NUMBER: z.string().trim().max(40).default(""),
  BILLING_WHATSAPP: z.string().trim().regex(/^(\d{6,15})?$/).default(""),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  process.exit(1);
}

export const env = parsed.data;

export const allowedOrigins = env.CLIENT_URL.split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);