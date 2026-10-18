import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { usePrefs } from "../../context/prefs-context";
import { formatMoney } from "../../lib/format";
import { spring } from "../../lib/motion";

interface Props {
  count: number;
  total: number;
  currency: string;
  onOpen: () => void;
}

export default function CartFab({ count, total, currency, onOpen }: Props) {
  const { lang, t } = usePrefs();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={spring}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <motion.button
            type="button"
            onClick={onOpen}
            whileTap={{ scale: 0.97 }}
            aria-label={`${t.viewOrder}, ${t.cartCount(count)}`}
            className="pointer-events-auto mx-auto flex h-14 w-full max-w-md items-center justify-between rounded-full bg-brand px-5 text-white shadow-lift"
          >
            <span className="flex items-center gap-3">
              <span className="relative">
                <ShoppingBag className="h-6 w-6" aria-hidden />
                <motion.span
                  key={count}
                  initial={{ scale: 1.6 }}
                  animate={{ scale: 1 }}
                  transition={spring}
                  className="absolute -end-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-extrabold text-brand-ink"
                >
                  {count}
                </motion.span>
              </span>
              <span className="font-semibold">{t.viewOrder}</span>
            </span>
            <span className="font-extrabold">{formatMoney(total, currency, lang)}</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}