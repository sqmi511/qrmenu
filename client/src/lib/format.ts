import type { Lang } from "./types";

const digitsCache = new Map<string, number>();

export function fractionDigits(currency: string) {
  let d = digitsCache.get(currency);
  if (d === undefined) {
    d = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    digitsCache.set(currency, d);
  }
  return d;
}

export function formatMoney(minor: number, currency: string, lang: Lang) {
  const d = fractionDigits(currency);
  return new Intl.NumberFormat(lang === "ar" ? "ar-LB" : "en-US", { style: "currency", currency }).format(
    minor / 10 ** d,
  );
}

/** "12.5" -> 1250 minor units; null when invalid or above the server limit. */
export function toMinor(input: string, currency: string) {
  const s = input.trim().replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,9})?$/.test(s)) return null;
  const n = Math.round(Number(s) * 10 ** fractionDigits(currency));
  return n <= 10_000_000 ? n : null;
}

export function fromMinor(minor: number, currency: string) {
  const d = fractionDigits(currency);
  return (minor / 10 ** d).toFixed(d);
}