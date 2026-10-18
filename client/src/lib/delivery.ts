import type { LatLng } from "./types";

export interface DeliveryRules {
  deliveryFeeMinor: number;
  deliveryPerKmMinor: number;
  freeDeliveryOverMinor: number;
  maxDeliveryKm: number;
  locationLat: number | null;
  locationLng: number | null;
}

export function haversineKm(a: LatLng, b: LatLng) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Quote =
  | { ok: true; feeMinor: number; distanceKm: number | null }
  | { ok: false; reason: "need_location" | "too_far" };

// Preview only. The server recomputes the fee and is the source of truth.
export function quoteDelivery(r: DeliveryRules, subtotalMinor: number, to?: LatLng | null): Quote {
  const hasOrigin = r.locationLat !== null && r.locationLng !== null;
  const needsDistance = hasOrigin && (r.deliveryPerKmMinor > 0 || r.maxDeliveryKm > 0);
  let distanceKm: number | null = null;

  if (needsDistance) {
    if (!to) return { ok: false, reason: "need_location" };
    const from = { lat: r.locationLat as number, lng: r.locationLng as number };
    distanceKm = Math.round(haversineKm(from, to) * 100) / 100;
    if (r.maxDeliveryKm > 0 && distanceKm > r.maxDeliveryKm) return { ok: false, reason: "too_far" };
  }

  let feeMinor =
    r.deliveryFeeMinor + (r.deliveryPerKmMinor > 0 && distanceKm !== null ? r.deliveryPerKmMinor * Math.ceil(distanceKm) : 0);
  if (r.freeDeliveryOverMinor > 0 && subtotalMinor >= r.freeDeliveryOverMinor) feeMinor = 0;
  return { ok: true, feeMinor, distanceKm };
}