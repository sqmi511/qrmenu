import { motion } from "framer-motion";
import { Ban, BellRing, Check, ChefHat, Receipt, ThumbsUp, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { usePrefs } from "../context/prefs-context";
import { cn } from "../lib/cn";
import { spring } from "../lib/motion";
import type { OrderStatus } from "../lib/types";

const STEPS = ["pending", "accepted", "preparing", "ready", "served"] as const;

const ICONS: Record<(typeof STEPS)[number], LucideIcon> = {
  pending: Receipt,
  accepted: ThumbsUp,
  preparing: ChefHat,
  ready: BellRing,
  served: UtensilsCrossed,
};

interface Props {
  status: OrderStatus;
  /** override labels/hints, e.g. for delivery orders */
  labels?: Record<string, string>;
  hints?: Record<string, string>;
}

export default function OrderTimeline({ status, labels, hints }: Props) {
  const { t } = usePrefs();
  const L = labels ?? t.statusLabels;
  const H = hints ?? t.statusHints;

  if (status === "cancelled") {
    return (
      <div role="status" className="flex items-center gap-3 rounded-field bg-red-500/10 p-4 text-red-700 dark:text-red-300">
        <Ban className="h-6 w-6 shrink-0" aria-hidden />
        <div>
          <p className="font-bold">{L.cancelled}</p>
          <p className="text-sm">{H.cancelled}</p>
        </div>
      </div>
    );
  }

  const idx = STEPS.indexOf(status);

  return (
    <ol aria-live="polite">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        const Icon = ICONS[s];
        const last = i === STEPS.length - 1;
        return (
          <li key={s} aria-current={current ? "step" : undefined} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="relative">
                {current && !last && (
                  <span aria-hidden className="absolute inset-0 rounded-full bg-brand/40 motion-safe:animate-ping" />
                )}
                <motion.span
                  animate={{ scale: current ? 1.1 : 1 }}
                  transition={spring}
                  className={cn(
                    "relative grid h-11 w-11 place-items-center rounded-full transition-colors duration-300",
                    i <= idx ? "bg-brand text-white shadow-soft" : "bg-line/70 text-muted",
                  )}
                >
                  {done ? <Check className="h-5 w-5" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
                </motion.span>
              </div>
              {!last && (
                <div className="relative my-1 min-h-6 w-0.5 flex-1 overflow-hidden rounded bg-line">
                  <motion.div
                    initial={false}
                    animate={{ scaleY: done ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 origin-top bg-brand"
                  />
                </div>
              )}
            </div>
            <div className={cn("pt-2", !last && "pb-6")}>
              <p className={cn("font-bold", i > idx && "text-muted")}>{L[s]}</p>
              {current && (
                <motion.p
                  key={s}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-0.5 text-sm text-muted"
                >
                  {H[s]}
                </motion.p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}