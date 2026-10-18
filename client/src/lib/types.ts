export type Lang = "en" | "ar";

export interface Localized {
  en: string;
  ar?: string;
}

export interface MenuItem {
  _id: string;
  category: string;
  name: Localized;
  description?: Localized;
  priceMinor: number;
  imageUrl: string;
  tags: string[];
  isAvailable: boolean;
}

export interface MenuCategory {
  _id: string;
  name: Localized;
  items: MenuItem[];
}

export interface PublicRestaurant {
  _id: string;
  slug: string;
  name: Localized;
  description?: Localized;
  logoUrl: string;
  coverUrl: string;
  currency: string;
  defaultLang: Lang;
  accentColor: string;
  tableCount: number;
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

export interface PublicMenu {
  restaurant: PublicRestaurant;
  categories: MenuCategory[];
}

export type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "served" | "cancelled";
export type OrderType = "dine_in" | "delivery";
export type PaymentMethod = "cash" | "card";
export type PaymentStatus = "unpaid" | "paid";

export interface LatLng {
  lat: number;
  lng: number;
}

/** delivery form state */
export interface CustomerInput {
  name: string;
  phone: string;
  address: string;
  notes: string;
  location: LatLng | null;
}

export interface PublicOrder {
  orderType: OrderType;
  status: OrderStatus;
  tableNumber: number | null;
  subtotalMinor: number;
  vatMinor: number;
  deliveryFeeMinor: number;
  deliveryDistanceKm: number | null;
  vatBps: number;
  pricesIncludeVat: boolean;
  totalMinor: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  customer: { name: string; phone: string; address: string; notes: string; location: LatLng | null } | null;
  lines: { name: Localized; priceMinor: number; qty: number; note: string }[];
  restaurant: Pick<PublicRestaurant, "slug" | "name" | "currency" | "defaultLang" | "accentColor" | "whatsappNumber">;
}