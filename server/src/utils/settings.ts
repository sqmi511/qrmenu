export interface Settings {
  vatBps: number;
  pricesIncludeVat: boolean;
  dineInEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeMinor: number;
  minDeliveryOrderMinor: number;
  whatsappNumber: string;
  paymentCash: boolean;
  paymentCard: boolean;
  deliveryPerKmMinor: number;
  freeDeliveryOverMinor: number;
  maxDeliveryKm: number;
  locationLat: number | null;
  locationLng: number | null;
}

export const SETTING_FIELDS =
  "vatBps pricesIncludeVat dineInEnabled deliveryEnabled deliveryFeeMinor minDeliveryOrderMinor whatsappNumber paymentCash paymentCard deliveryPerKmMinor freeDeliveryOverMinor maxDeliveryKm locationLat locationLng";

const DEFAULTS: Settings = {
  vatBps: 1100,
  pricesIncludeVat: false,
  dineInEnabled: true,
  deliveryEnabled: false,
  deliveryFeeMinor: 0,
  minDeliveryOrderMinor: 0,
  whatsappNumber: "",
  paymentCash: true,
  paymentCard: false,
  deliveryPerKmMinor: 0,
  freeDeliveryOverMinor: 0,
  maxDeliveryKm: 0,
  locationLat: null,
  locationLng: null,
};

// .lean() skips schema defaults, so restaurants created before these fields existed get them here
export function withSettings<T extends Partial<Settings>>(r: T): T & Settings {
  return {
    ...r,
    vatBps: r.vatBps ?? DEFAULTS.vatBps,
    pricesIncludeVat: r.pricesIncludeVat ?? DEFAULTS.pricesIncludeVat,
    dineInEnabled: r.dineInEnabled ?? DEFAULTS.dineInEnabled,
    deliveryEnabled: r.deliveryEnabled ?? DEFAULTS.deliveryEnabled,
    deliveryFeeMinor: r.deliveryFeeMinor ?? DEFAULTS.deliveryFeeMinor,
    minDeliveryOrderMinor: r.minDeliveryOrderMinor ?? DEFAULTS.minDeliveryOrderMinor,
    whatsappNumber: r.whatsappNumber ?? DEFAULTS.whatsappNumber,
    paymentCash: r.paymentCash ?? DEFAULTS.paymentCash,
    paymentCard: r.paymentCard ?? DEFAULTS.paymentCard,
    deliveryPerKmMinor: r.deliveryPerKmMinor ?? DEFAULTS.deliveryPerKmMinor,
    freeDeliveryOverMinor: r.freeDeliveryOverMinor ?? DEFAULTS.freeDeliveryOverMinor,
    maxDeliveryKm: r.maxDeliveryKm ?? DEFAULTS.maxDeliveryKm,
    locationLat: r.locationLat ?? null,
    locationLng: r.locationLng ?? null,
  };
}