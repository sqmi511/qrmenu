import { motion } from "framer-motion";
import { Minus, Plus, Trash2 } from "lucide-react";
import { usePrefs } from "../../context/prefs-context";
import { cn } from "../../lib/cn";

interface Props {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md";
  max?: number;
}

export default function QuantityStepper({ value, onChange, size = "md", max = 20 }: Props) {
  const { t, lang } = usePrefs();
  const btn = cn(
    "grid shrink-0 place-items-center rounded-full text-brand-ink transition-colors hover:bg-brand/15 disabled:opacity-40",
    size === "sm" ? "h-10 w-10" : "h-11 w-11",
  );
  return (
    <div role="group" aria-label={t.quantity} className="inline-flex items-center rounded-full bg-brand-soft">
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        className={btn}
        aria-label={value <= 1 ? t.remove : t.decrease}
        onClick={() => onChange(value - 1)}
      >
        {value <= 1 ? <Trash2 className="h-4 w-4" aria-hidden /> : <Minus className="h-4 w-4" aria-hidden />}
      </motion.button>
      <span className="grid min-w-6 place-items-center overflow-hidden text-center text-sm font-extrabold tabular-nums">
        <motion.span key={value} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.15 }}>
          {new Intl.NumberFormat(lang === "ar" ? "ar-LB" : "en-US").format(value)}
        </motion.span>
      </span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        className={btn}
        aria-label={t.increase}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </motion.button>
    </div>
  );
}