import { api } from "./api";
import type { Lang, Localized } from "./types";

export const ITEM_TAGS = ["vegan", "vegetarian", "spicy", "gluten-free", "halal", "new", "popular"] as const;

export interface AdminRestaurant {
  _id: string;
  slug: string;
  name: Localized;
  description?: Localized;
  logoUrl: string;
  coverUrl: string;
  currency: string;
  defaultLang: Lang;
  tableCount: number;
  accentColor: string;
  isActive: boolean;
  vatBps: number;
  pricesIncludeVat: boolean;
  dineInEnabled: boolean;
  deliveryEnabled: boolean;
  takeawayEnabled?: boolean;
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
  // invoice details; missing on restaurants created before invoices existed
  address?: string;
  phone?: string;
  vatNumber?: string;
  invoiceFooter?: string;
}

export type RestaurantPatch = Partial<Omit<AdminRestaurant, "_id" | "slug">>;

export interface AdminCategory {
  _id: string;
  name: Localized;
  order: number;
  isActive: boolean;
}

export interface AdminItem {
  _id: string;
  category: string;
  name: Localized;
  description?: Localized;
  priceMinor: number;
  imageUrl: string;
  tags: string[];
  isAvailable: boolean;
  order: number;
}

export interface ItemBody {
  category: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  priceMinor: number;
  imageUrl: string;
  tags: string[];
  isAvailable: boolean;
}

type Res<T> = { data: T };
const unwrap = <T>(p: Promise<{ data: Res<T> }>) => p.then((r) => r.data.data);
const done = (p: Promise<unknown>) => p.then(() => undefined);

export const getRestaurant = (id: string, signal?: AbortSignal) =>
  unwrap(api.get<Res<AdminRestaurant>>(`/restaurants/${id}`, { signal }));
export const patchRestaurant = (id: string, body: RestaurantPatch) =>
  unwrap(api.patch<Res<AdminRestaurant>>(`/restaurants/${id}`, body));

export const listCategories = (rid: string, signal?: AbortSignal) =>
  unwrap(api.get<Res<AdminCategory[]>>(`/restaurants/${rid}/categories`, { signal }));
export const createCategory = (rid: string, body: { name: { en: string; ar: string } }) =>
  unwrap(api.post<Res<AdminCategory>>(`/restaurants/${rid}/categories`, body));
export const patchCategory = (id: string, body: { name?: { en: string; ar: string }; isActive?: boolean }) =>
  unwrap(api.patch<Res<AdminCategory>>(`/categories/${id}`, body));
export const deleteCategory = (id: string) => done(api.delete(`/categories/${id}`));
export const reorderCategories = (rid: string, ids: string[]) =>
  done(api.patch(`/restaurants/${rid}/categories/reorder`, { ids }));

export const listItems = (rid: string, signal?: AbortSignal) =>
  unwrap(api.get<Res<AdminItem[]>>(`/restaurants/${rid}/items`, { signal }));
export const createItem = (rid: string, body: ItemBody) =>
  unwrap(api.post<Res<AdminItem>>(`/restaurants/${rid}/items`, body));
export const patchItem = (id: string, body: Partial<ItemBody>) =>
  unwrap(api.patch<Res<AdminItem>>(`/items/${id}`, body));
export const deleteItem = (id: string) => done(api.delete(`/items/${id}`));
export const reorderItems = (rid: string, ids: string[]) =>
  done(api.patch(`/restaurants/${rid}/items/reorder`, { ids }));