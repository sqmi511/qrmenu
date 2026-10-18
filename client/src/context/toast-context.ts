import { createContext, useContext } from "react";

export type ToastTone = "success" | "error";

export interface ToastApi {
  toast: (message: string, tone?: ToastTone) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}