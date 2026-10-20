import { api } from "./api";
import type { AdminOrder } from "./ordersApi";
import type { Localized, OrderStatus, OrderType } from "./types";

export type Range = "today" | "7d" | "30d";

export interface Stats {
  from: string;
  to: string;
  tz: string;
  orders: number;
  salesMinor: number;
  vatMinor: number;
  collectedMinor: number;
  deliveryOrders: number;
  takeawayOrders?: number;
  dineInOrders: number;
  cancelled: number;
  pendingNow: number;
  daily: { day: string; orders: number; salesMinor: number }[];
  top: { id: string; name: Localized; qty: number; salesMinor: number }[];
}

/** Local-midnight bounds: [from, to). */
export function rangeBounds(range: Range) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const from = new Date(start);
  from.setDate(from.getDate() - (range === "today" ? 0 : range === "7d" ? 6 : 29));
  const to = new Date(start);
  to.setDate(to.getDate() + 1);
  return { from, to };
}

export async function fetchStats(rid: string, range: Range, signal?: AbortSignal) {
  const { from, to } = rangeBounds(range);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data } = await api.get<{ data: Stats }>(`/restaurants/${rid}/stats`, {
    params: { from: from.toISOString(), to: to.toISOString(), tz },
    signal,
  });
  return data.data;
}

export interface HistoryFilters {
  status: OrderStatus | "";
  type: OrderType | "";
  /** YYYY-MM-DD, local */
  from: string;
  to: string;
}

export async function fetchHistory(rid: string, f: HistoryFilters, cursor?: string, signal?: AbortSignal) {
  const day = (s: string) => new Date(`${s}T00:00:00`); // parsed as local time
  const params: Record<string, string | number> = { limit: 20 };
  if (f.status) params.status = f.status;
  if (f.type) params.type = f.type;
  if (f.from) params.from = day(f.from).toISOString();
  if (f.to) {
    const d = day(f.to);
    d.setDate(d.getDate() + 1); // include the whole end day
    params.to = d.toISOString();
  }
  if (cursor) params.cursor = cursor;
  const { data } = await api.get<{ data: AdminOrder[]; nextCursor: string | null }>(
    `/restaurants/${rid}/orders/history`,
    { params, signal },
  );
  return data;
}