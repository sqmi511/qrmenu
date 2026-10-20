import { formatMoney } from "./format";
import { dict, pick } from "./i18n";
import { checkoutDict } from "./i18n-checkout";
import type { Lang, LatLng, PublicOrder } from "./types";

export const mapsUrl = (l: LatLng) => `https://www.google.com/maps?q=${l.lat},${l.lng}`;

/** wa.me link with the order pre-filled. The customer still taps Send. */
export function whatsappUrl(o: { order: PublicOrder; token: string; lang: Lang; origin: string }) {
  const { order, token, lang, origin } = o;
  const t = dict[lang];
  const ct = checkoutDict[lang];
  const r = order.restaurant;
  const money = (n: number) => formatMoney(n, r.currency, lang);
  const pct = String(order.vatBps / 100);
  const delivery = order.orderType === "delivery";
  const takeaway = order.orderType === "takeaway";
  const c = order.customer;

  const itemRows = order.lines.flatMap((l) => {
    const row = `${l.qty} × ${pick(l.name, lang)} - ${money(l.priceMinor * l.qty)}`;
    return l.note ? [row, `   ${ct.waNote}: ${l.note}`] : [row];
  });

  const kind = delivery ? ct.delivery : takeaway ? ct.takeaway : t.table(String(order.tableNumber ?? ""));

  const parts: (string | null)[] = [
    ct.waNewOrder(pick(r.name, lang)),
    kind,
    takeaway && order.pickupNote ? `${ct.pickupTime}: ${order.pickupNote}` : null,
    "",
    ...itemRows,
    "",
    `${ct.subtotal}: ${money(order.subtotalMinor)}`,
    order.vatMinor > 0 ? `${order.pricesIncludeVat ? ct.vatIncluded(pct) : ct.vat(pct)}: ${money(order.vatMinor)}` : null,
    delivery ? `${ct.deliveryFee}: ${order.deliveryFeeMinor > 0 ? money(order.deliveryFeeMinor) : ct.free}` : null,
    `*${t.total}: ${money(order.totalMinor)}*`,
    `${ct.payment}: ${order.paymentMethod === "card" ? ct.payCard : ct.payCash}`,
  ];

  if (c) {
    parts.push(
      "",
      `${ct.name}: ${c.name}`,
      `${ct.phone}: ${c.phone}`,
      c.address ? `${ct.address}: ${c.address}` : null,
      c.notes ? `${ct.waNote}: ${c.notes}` : null,
      c.location ? `${ct.waLocation}: ${mapsUrl(c.location)}` : null,
    );
  }
  parts.push("", `${ct.waTrack}: ${origin}/r/${r.slug}/order/${token}`);

  const text = parts.filter((p): p is string => p !== null).join("\n");
  return `https://wa.me/${r.whatsappNumber}?text=${encodeURIComponent(text)}`;
}