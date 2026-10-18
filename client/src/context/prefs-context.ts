import { createContext, useContext } from "react";
import { dict } from "../lib/i18n";
import type { Lang } from "../lib/types";

export type Theme = "light" | "dark";

export interface Prefs {
  theme: Theme;
  toggleTheme: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  /** applies a restaurant's default language only if the visitor never chose one */
  applyDefaultLang: (l: Lang) => void;
  t: (typeof dict)["en"];
}

export const PrefsContext = createContext<Prefs | null>(null);

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside PrefsProvider");
  return ctx;
}