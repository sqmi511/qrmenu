import { env } from "./env.js";

// prices are in USD cents
export const PLANS = {
  trialDays: 30,
  graceDays: 7,
  monthlyCents: 2000,
  annualCents: 20000,
  lifetimeCents: 40000,
  lifetimeLimit: 10, // first 10 customers; raise it to open more lifetime slots
} as const;

export const BILLING = { whishNumber: env.BILLING_WHISH_NUMBER, whatsapp: env.BILLING_WHATSAPP };