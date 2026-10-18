import { useMemo } from "react";
import { useCart } from "../context/cart-context";
import type { MenuItem, PublicMenu } from "./types";

export interface CartLine {
  item: MenuItem;
  qty: number;
  note: string;
}

/** Resolves cart lines against the live menu: sold-out or deleted items drop out, prices are always current. */
export function useCartView(menu?: PublicMenu) {
  const { lines } = useCart();
  return useMemo(() => {
    const items = new Map<string, MenuItem>();
    menu?.categories.forEach((c) => c.items.forEach((i) => items.set(i._id, i)));
    const resolved: CartLine[] = [];
    for (const l of lines) {
      const item = items.get(l.id);
      if (item?.isAvailable) resolved.push({ item, qty: l.qty, note: l.note });
    }
    return {
      lines: resolved,
      count: resolved.reduce((s, l) => s + l.qty, 0),
      total: resolved.reduce((s, l) => s + l.item.priceMinor * l.qty, 0),
    };
  }, [menu, lines]);
}