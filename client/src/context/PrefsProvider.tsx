import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { dict } from "../lib/i18n";
import type { Lang } from "../lib/types";
import { PrefsContext, type Theme } from "./prefs-context";

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage unavailable */
  }
};

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  const [lang, setLangState] = useState<Lang>(() => (read("lang") === "ar" ? "ar" : "en"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    write("theme", next);
  }, [theme]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    write("lang", l);
  }, []);

  const applyDefaultLang = useCallback((l: Lang) => {
    if (!read("lang")) setLangState(l);
  }, []);

  const value = useMemo(
    () => ({ theme, toggleTheme, lang, setLang, applyDefaultLang, t: dict[lang] }),
    [theme, toggleTheme, lang, setLang, applyDefaultLang],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}