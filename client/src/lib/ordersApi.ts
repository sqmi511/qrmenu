import { api } from "./api";
import type { LatLng, Localized, OrderStatus, OrderType, PaymentMethod, PaymentStatus } from "./types";

export interface AdminOrder {
  _id: string;
  orderType?: OrderType;
  tableNumber?: number;
  customer?: { name: string; phone: string; address: string; notes?: string; location?: LatLng };
  lines: { nameSnapshot: Localized; priceMinorSnapshot: number; qty: number; note?: string }[];
  subtotalMinor?: number;
  vatMinor?: number;
  deliveryFeeMinor?: number;
  deliveryDistanceKm?: number;
  vatBps?: number;
  pricesIncludeVat?: boolean;
  totalMinor: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  invoiceNo?: number;
  invoicedAt?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export const listOrders = (rid: string, signal?: AbortSignal) =>
  api
    .get<{ data: AdminOrder[] }>(`/restaurants/${rid}/orders`, { params: { limit: 100 }, signal })
    .then((r) => r.data.data);

export const updateOrderStatus = (id: string, status: OrderStatus) =>
  api.patch<{ data: AdminOrder }>(`/orders/${id}/status`, { status }).then((r) => r.data.data);

export const setPaymentStatus = (id: string, paymentStatus: PaymentStatus) =>
  api.patch<{ data: AdminOrder }>(`/orders/${id}/payment`, { paymentStatus }).then((r) => r.data.data);

/** Assigns the invoice number on first call; later calls return the same number. */
export const issueInvoice = (id: string) =>
  api.post<{ data: AdminOrder }>(`/orders/${id}/invoice`).then((r) => r.data.data);