import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { usePrefs } from "../../context/prefs-context";
import { IconButton, type Variant } from "./Button";

export function ThemeToggle({ variant = "ghost" }: { variant?: Variant }) {
  const { theme, toggleTheme, t } = usePrefs();
  return (
    <IconButton variant={variant} aria-label={t.theme} onClick={toggleTheme}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.15 }}
          className="grid place-items-center"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  );
}

export function LangToggle({ variant = "ghost" }: { variant?: Variant }) {
  const { lang, setLang, t } = usePrefs();
  return (
    <IconButton
      variant={variant}
      aria-label={t.language}
      onClick={() => setLang(lang === "en" ? "ar" : "en")}
      className="text-base font-bold leading-normal"
    >
      <span className="leading-normal">{lang === "en" ? "ع" : "EN"}</span>
    </IconButton>
  );
}