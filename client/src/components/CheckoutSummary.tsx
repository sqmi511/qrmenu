import { motion } from "framer-motion";
import { usePrefs } from "../context/prefs-context";
import { formatMoney } from "../lib/format";
import { useCT } from "../lib/i18n-checkout";

interface Props {
  subtotal: number;
  vat: number;
  deliveryFee: number;
  total: number;
  currency: string;
  vatBps: number;
  inclusive: boolean;
  showDelivery: boolean;
}

export default function CheckoutSummary(p: Props) {
  const { lang, t } = usePrefs();
  const ct = useCT();
  const money = (n: number) => formatMoney(n, p.currency, lang);
  const pct = new Intl.NumberFormat(lang === "ar" ? "ar-LB" : "en-US").format(p.vatBps / 100);
  const row = "flex items-center justify-between gap-3 text-sm";

  return (
    <dl className="space-y-1.5">
      <div className={row}>
        <dt className="text-muted">{ct.subtotal}</dt>
        <dd className="font-semibold">{money(p.subtotal)}</dd>
      </div>
      {p.vatBps > 0 && (
        <div className={row}>
          <dt className="text-muted">{p.inclusive ? ct.vatIncluded(pct) : ct.vat(pct)}</dt>
          <dd className="font-semibold">{money(p.vat)}</dd>
        </div>
      )}
      {p.showDelivery && (
        <div className={row}>
          <dt className="text-muted">{ct.deliveryFee}</dt>
          <dd className="font-semibold">{p.deliveryFee > 0 ? money(p.deliveryFee) : ct.free}</dd>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
        <dt className="font-semibold text-muted">{t.total}</dt>
        <motion.dd
          key={p.total}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="text-xl font-extrabold"
        >
          {money(p.total)}
        </motion.dd>
      </div>
    </dl>
  );
}