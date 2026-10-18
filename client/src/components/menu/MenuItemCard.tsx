import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useCart } from "../../context/cart-context";
import { usePrefs } from "../../context/prefs-context";
import { useToast } from "../../context/toast-context";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";
import { pick } from "../../lib/i18n";
import { rise } from "../../lib/motion";
import type { MenuItem } from "../../lib/types";
import Badge from "../ui/Badge";
import LazyImage from "../ui/LazyImage";
import QuantityStepper from "../ui/QuantityStepper";

interface Props {
  item: MenuItem;
  currency: string;
  index: number;
}

export default function MenuItemCard({ item, currency, index }: Props) {
  const { lang, t } = usePrefs();
  const { qtyById, add, setQty } = useCart();
  const { toast } = useToast();
  const desc = pick(item.description, lang);
  const name = pick(item.name, lang);
  const qty = qtyById[item._id] ?? 0;

  const onAdd = () => {
    add(item._id);
    if (qty === 0) toast(t.added(name));
  };

  return (
    <motion.article
      variants={rise}
      custom={index}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      className="flex gap-4 rounded-card border border-line bg-surface p-3 shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-base font-bold leading-snug">{name}</h3>
        {desc && <p className="mt-1 line-clamp-2 text-sm text-muted">{desc}</p>}
        {item.tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <li key={tag}>
                <Badge tone={tag === "new" || tag === "popular" ? "brand" : "neutral"}>{t.tags[tag] ?? tag}</Badge>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-center gap-2 pt-3">
          <span className="text-base font-extrabold text-brand-ink">{formatMoney(item.priceMinor, currency, lang)}</span>
          {!item.isAvailable && <Badge>{t.unavailable}</Badge>}

          {item.isAvailable && (
            <div className="ms-auto">
              <AnimatePresence mode="wait" initial={false}>
                {qty > 0 ? (
                  <motion.div
                    key="stepper"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <QuantityStepper size="sm" value={qty} onChange={(v) => setQty(item._id, v)} />
                  </motion.div>
                ) : (
                  <motion.button
                    key="add"
                    type="button"
                    aria-label={`${t.add}: ${name}`}
                    onClick={onAdd}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileTap={{ scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="grid h-10 w-10 place-items-center rounded-full bg-brand text-white shadow-soft hover:brightness-110"
                  >
                    <Plus className="h-5 w-5" aria-hidden />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      <LazyImage
        key={item.imageUrl}
        src={item.imageUrl}
        className={cn("h-28 w-28 shrink-0 self-start rounded-2xl bg-brand-soft", !item.isAvailable && "grayscale")}
      />
    </motion.article>
  );
}