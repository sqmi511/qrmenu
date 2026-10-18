import { createContext, useContext } from "react";

export const MAX_QTY = 20;

export interface CartLineState {
  id: string;
  qty: number;
  note: string;
}

export interface Cart {
  lines: CartLineState[];
  qtyById: Record<string, number>;
  add: (id: string) => void;
  /** qty <= 0 removes the line */
  setQty: (id: string, qty: number) => void;
  setNote: (id: string, note: string) => void;
  clear: () => void;
}

export const CartContext = createContext<Cart | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}