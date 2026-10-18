import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CartContext, MAX_QTY, type CartLineState } from "./cart-context";

const keyFor = (slug: string) => `cart:${slug}`;

function load(slug: string): CartLineState[] {
  try {
    const raw = JSON.parse(localStorage.getItem(keyFor(slug)) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .flatMap((l: unknown) => {
        const o = l as Partial<CartLineState> | null;
        if (
          o &&
          typeof o.id === "string" &&
          /^[a-f\d]{24}$/i.test(o.id) &&
          typeof o.qty === "number" &&
          Number.isInteger(o.qty) &&
          o.qty >= 1 &&
          o.qty <= MAX_QTY
        ) {
          return [{ id: o.id, qty: o.qty, note: typeof o.note === "string" ? o.note.slice(0, 200) : "" }];
        }
        return [];
      })
      .slice(0, 50);
  } catch {
    return [];
  }
}

// mount with key={slug} so each restaurant gets its own cart
export function CartProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [lines, setLines] = useState<CartLineState[]>(() => load(slug));

  useEffect(() => {
    try {
      localStorage.setItem(keyFor(slug), JSON.stringify(lines));
    } catch {
      /* storage unavailable */
    }
  }, [slug, lines]);

  const add = useCallback((id: string) => {
    setLines((ls) => {
      const cur = ls.find((l) => l.id === id);
      if (!cur) return ls.length >= 50 ? ls : [...ls, { id, qty: 1, note: "" }];
      if (cur.qty >= MAX_QTY) return ls;
      return ls.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l));
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((ls) =>
      qty <= 0
        ? ls.filter((l) => l.id !== id)
        : ls.map((l) => (l.id === id ? { ...l, qty: Math.min(qty, MAX_QTY) } : l)),
    );
  }, []);

  const setNote = useCallback((id: string, note: string) => {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, note: note.slice(0, 200) } : l)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      qtyById: Object.fromEntries(lines.map((l) => [l.id, l.qty])) as Record<string, number>,
      add,
      setQty,
      setNote,
      clear,
    }),
    [lines, add, setQty, setNote, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}