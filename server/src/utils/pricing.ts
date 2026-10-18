export interface PricingRules {
  vatBps: number; // 1100 = 11%
  pricesIncludeVat: boolean;
  deliveryFeeMinor: number;
}

export function computeTotals(subtotalMinor: number, r: PricingRules) {
  const vatMinor = r.pricesIncludeVat
    ? Math.round((subtotalMinor * r.vatBps) / (10_000 + r.vatBps))
    : Math.round((subtotalMinor * r.vatBps) / 10_000);
  const totalMinor = subtotalMinor + (r.pricesIncludeVat ? 0 : vatMinor) + r.deliveryFeeMinor;
  return { subtotalMinor, vatMinor, deliveryFeeMinor: r.deliveryFeeMinor, totalMinor };
}