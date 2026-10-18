import type { Access } from "../context/auth-context";
import { api } from "./api";

export type Status = Access["status"];
export type PlanName = Access["plan"];

export interface SuperRow {
  _id: string;
  slug: string;
  name: { en: string; ar?: string };
  ownerEmail: string | null;
  plan: PlanName;
  status: Status;
  accessUntil: string | null;
  daysLeft: number | null;
  createdAt: string;
}

export interface Summary {
  restaurants: number;
  pending: number;
  trial: number;
  active: number;
  grace: number;
  expired: number;
  suspended: number;
  lifetimeSold: number;
  lifetimeLimit: number;
  revenueCents: number;
  prices: { monthlyCents: number; annualCents: number; lifetimeCents: number };
}

export interface PaymentRow {
  _id: string;
  plan: "monthly" | "annual" | "lifetime";
  amountCents: number;
  method: string;
  reference: string;
  note: string;
  coversUntil: string | null;
  createdAt: string;
  restaurant: { slug: string; name: { en: string } } | null;
}

export const PAY_METHODS = [
  ["whish", "Whish Money"],
  ["omt", "OMT"],
  ["bank", "Bank transfer"],
  ["card", "Card"],
  ["cash", "Cash"],
  ["other", "Other"],
] as const;

export interface GrantBody {
  plan: "monthly" | "annual" | "lifetime";
  amountUsd: number;
  method: string;
  reference?: string;
  note?: string;
}

export const fetchRestaurants = (signal?: AbortSignal) =>
  api
    .get<{ data: { restaurants: SuperRow[]; summary: Summary } }>("/super/restaurants", { signal })
    .then((r) => r.data.data);
export const fetchPayments = (signal?: AbortSignal) =>
  api.get<{ data: PaymentRow[] }>("/super/payments", { signal }).then((r) => r.data.data);

export const createTenant = (body: { name: { en: string }; slug: string; ownerEmail: string }) =>
  api
    .post<{ data: { slug: string; ownerEmail: string; tempPassword: string } }>("/super/restaurants", body)
    .then((r) => r.data.data);
export const grantPlan = (id: string, body: GrantBody) => api.post(`/super/restaurants/${id}/grant`, body);
export const extendAccess = (id: string, days: number) => api.post(`/super/restaurants/${id}/extend`, { days });
export const setSuspended = (id: string, suspended: boolean) =>
  api.patch(`/super/restaurants/${id}/suspend`, { suspended });
export const resetPassword = (id: string) =>
  api
    .post<{ data: { ownerEmail: string; tempPassword: string } }>(`/super/restaurants/${id}/reset-password`)
    .then((r) => r.data.data);