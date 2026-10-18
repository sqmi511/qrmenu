import axios from "axios";
import type { LatLng, PaymentMethod, PublicMenu, PublicOrder } from "./types";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
  withCredentials: true,
  timeout: 10_000,
});

export async function fetchMenu(slug: string, signal?: AbortSignal) {
  const { data } = await api.get<{ data: PublicMenu }>(`/public/restaurants/${encodeURIComponent(slug)}/menu`, {
    signal,
  });
  return data.data;
}

interface OrderLineInput {
  itemId: string;
  qty: number;
  note?: string;
}

export type OrderInput =
  | { orderType: "dine_in"; tableNumber: number; paymentMethod: PaymentMethod; lines: OrderLineInput[] }
  | {
      orderType: "delivery";
      paymentMethod: PaymentMethod;
      customer: { name: string; phone: string; address: string; notes?: string; location?: LatLng };
      lines: OrderLineInput[];
    };

export async function placeOrder(slug: string, input: OrderInput) {
  const { data } = await api.post<{ data: { token: string } }>(
    `/public/restaurants/${encodeURIComponent(slug)}/orders`,
    input,
  );
  return data.data;
}

export async function fetchOrder(token: string, signal?: AbortSignal) {
  const { data } = await api.get<{ data: PublicOrder }>(`/public/orders/${encodeURIComponent(token)}`, { signal });
  return data.data;
}

export const isNotFound = (e: unknown) =>
  axios.isAxiosError(e) && [400, 404].includes(e.response?.status ?? 0);

interface ApiErrorBody {
  error?: string;
  details?: { path: string; message: string }[];
  fields?: string[];
}

/** Turns any thrown API error into a short user-facing message. */
export function apiError(e: unknown, fallback = "Something went wrong") {
  if (!axios.isAxiosError<ApiErrorBody>(e)) return fallback;
  if (!e.response) return "Cannot reach the server";
  const d = e.response.data;
  if (d?.details?.length) {
    const { path, message } = d.details[0];
    return path ? `${path}: ${message}` : message;
  }
  if (d?.fields?.length) return `${d.fields[0]} is already taken`;
  return d?.error ?? fallback;
}