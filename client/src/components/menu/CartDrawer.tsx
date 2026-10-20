import { AnimatePresence, motion } from "framer-motion";
import {
  Armchair,
  Bike,
  Clock,
  Loader2,
  Pencil,
  Phone,
  ShoppingBag,
  Store,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/cart-context";
import { usePrefs } from "../../context/prefs-context";
import { apiError, placeOrder, type OrderInput } from "../../lib/api";
import { cn } from "../../lib/cn";
import { quoteDelivery } from "../../lib/delivery";
import { formatMoney } from "../../lib/format";
import { pick } from "../../lib/i18n";
import { useCT } from "../../lib/i18n-checkout";
import { spring } from "../../lib/motion";
import { computeTotals } from "../../lib/pricing";
import type { CustomerInput, OrderType, PaymentMethod, PublicRestaurant } from "../../lib/types";
import type { CartLine } from "../../lib/useCartView";
import CheckoutSummary from "../CheckoutSummary";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/Feedback";
import Field from "../ui/Field";
import LazyImage from "../ui/LazyImage";
import QuantityStepper from "../ui/QuantityStepper";
import DeliveryForm from "./DeliveryForm";
import PaymentPicker from "./PaymentPicker";

interface Props {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  subtotal: number;
  restaurant: PublicRestaurant;
  slug: string;
  table: string | null;
}

const CUSTOMER_KEY = "customer";
const emptyCustomer: CustomerInput = { name: "", phone: "", address: "", notes: "", location: null };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

function loadCustomer(): CustomerInput {
  try {
    const o = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "null") as Record<string, unknown> | null;
    if (o && typeof o === "object") {
      return { name: str(o.name, 80), phone: str(o.phone, 20), address: str(o.address, 300), notes: "", location: null };
    }
  } catch {
    /* ignore */
  }
  return emptyCustomer;
}

function saveCustomer(c: CustomerInput) {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: c.name, phone: c.phone, address: c.address }));
  } catch {
    /* storage unavailable */
  }
}

function TypeToggle({
  types,
  value,
  onChange,
}: {
  types: OrderType[];
  value: OrderType;
  onChange: (t: OrderType) => void;
}) {
  const ct = useCT();
  const meta: Record<OrderType, { label: string; icon: LucideIcon }> = {
    dine_in: { label: ct.dineIn, icon: Armchair },
    delivery: { label: ct.delivery, icon: Bike },
    takeaway: { label: ct.takeaway, icon: Store },
  };
  return (
    <div
      role="radiogroup"
      aria-label={ct.orderType}
      className={cn("relative grid rounded-full bg-line/50 p-1", types.length === 3 ? "grid-cols-3" : "grid-cols-2")}
    >
      {types.map((ty) => {
        const M = meta[ty];
        const active = ty === value;
        return (
          <button
            key={ty}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(ty)}
            className={cn(
              "relative flex h-11 items-center justify-center gap-1.5 rounded-full px-1 text-sm font-semibold transition-colors",
              active ? "text-white" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="order-type"
                transition={spring}
                className="absolute inset-0 rounded-full bg-brand shadow-soft"
              />
            )}
            <M.icon className="relative h-4 w-4 shrink-0" aria-hidden />
            <span className="relative truncate">{M.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Row({ line, currency }: { line: CartLine; currency: string }) {
  const { lang, t } = usePrefs();
  const { setQty, setNote } = useCart();
  const [noteOpen, setNoteOpen] = useState(!!line.note);
  const id = line.item._id;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.15 } }}
      className="flex gap-3 py-4"
    >
      <LazyImage key={line.item.imageUrl} src={line.item.imageUrl} className="h-16 w-16 shrink-0 rounded-xl bg-brand-soft" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold leading-snug">{pick(line.item.name, lang)}</h3>
          <span className="shrink-0 font-extrabold text-brand-ink">
            {formatMoney(line.item.priceMinor * line.qty, currency, lang)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <QuantityStepper size="sm" value={line.qty} onChange={(v) => setQty(id, v)} />
          {!noteOpen && (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              {t.addNote}
            </button>
          )}
        </div>
        {noteOpen && (
          <input
            value={line.note}
            onChange={(e) => setNote(id, e.target.value)}
            maxLength={200}
            placeholder={t.notePlaceholder}
            aria-label={t.noteLabel}
            className="mt-2 h-11 w-full rounded-field border border-line bg-surface px-3 text-sm outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand"
          />
        )}
      </div>
    </motion.li>
  );
}

export default function CartDrawer({ open, onClose, lines, subtotal, restaurant, slug, table }: Props) {
  const { lang, t } = usePrefs();
  const ct = useCT();
  const { clear } = useCart();
  const navigate = useNavigate();
  const currency = restaurant.currency;

  const types: OrderType[] = [];
  if (restaurant.dineInEnabled) types.push("dine_in");
  if (restaurant.deliveryEnabled) types.push("delivery");
  if (restaurant.takeawayEnabled) types.push("takeaway");

  const methods: PaymentMethod[] = [];
  if (restaurant.paymentCash) methods.push("cash");
  if (restaurant.paymentCard) methods.push("card");

  // a QR scan carries ?table=; a plain link is more likely a delivery customer
  const [chosen, setChosen] = useState<OrderType>(() =>
    table || !restaurant.deliveryEnabled ? "dine_in" : "delivery",
  );
  const orderType: OrderType | undefined = types.includes(chosen) ? chosen : types[0];
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const payment: PaymentMethod | undefined = methods.includes(method) ? method : methods[0];

  const [tableInput, setTableInput] = useState("");
  const [form, setForm] = useState<CustomerInput>(loadCustomer);
  const [pickupNote, setPickupNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const off = lang === "ar" ? "-100%" : "100%";

  const delivery = orderType === "delivery";
  const takeaway = orderType === "takeaway";
  const quote = delivery ? quoteDelivery(restaurant, subtotal, form.location) : null;
  const fee = delivery ? (quote?.ok ? quote.feeMinor : restaurant.deliveryFeeMinor) : 0;
  const quoteMsg = quote && !quote.ok ? (quote.reason === "too_far" ? ct.outsideArea : ct.shareForFee) : null;
  const totals = computeTotals(subtotal, {
    vatBps: restaurant.vatBps,
    pricesIncludeVat: restaurant.pricesIncludeVat,
    deliveryFeeMinor: fee,
  });
  const belowMin = delivery && subtotal < restaurant.minDeliveryOrderMinor;

  // Esc to close + scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // move focus in, restore on close
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus();
  }, [open]);

  const submit = async () => {
    if (busy || lines.length === 0 || !orderType || !payment) return;
    const itemLines = lines.map((l) => ({ itemId: l.item._id, qty: l.qty, note: l.note.trim() || undefined }));
    let input: OrderInput;

    if (orderType === "dine_in") {
      const n = Number(table ?? tableInput);
      if (!Number.isInteger(n) || n < 1) return setError(t.tableRequired);
      if (n > restaurant.tableCount) return setError(`${t.tableLabel}: ${t.tableHint(restaurant.tableCount)}`);
      input = { orderType, tableNumber: n, paymentMethod: payment, lines: itemLines };
    } else if (orderType === "takeaway") {
      const phone = form.phone.replace(/[\s()-]/g, "");
      if (form.name.trim().length < 2) return setError(ct.nameRequired);
      if (!/^\+?\d{6,15}$/.test(phone)) return setError(ct.phoneInvalid);
      input = {
        orderType,
        paymentMethod: payment,
        customer: { name: form.name.trim(), phone },
        pickupNote: pickupNote.trim() || undefined,
        lines: itemLines,
      };
    } else {
      const phone = form.phone.replace(/[\s()-]/g, "");
      if (form.name.trim().length < 2) return setError(ct.nameRequired);
      if (!/^\+?\d{6,15}$/.test(phone)) return setError(ct.phoneInvalid);
      if (form.address.trim().length < 5) return setError(ct.addressRequired);
      if (belowMin) return setError(ct.minDelivery(formatMoney(restaurant.minDeliveryOrderMinor, currency, lang)));
      if (quoteMsg) return setError(quoteMsg);
      input = {
        orderType,
        paymentMethod: payment,
        customer: {
          name: form.name.trim(),
          phone,
          address: form.address.trim(),
          notes: form.notes.trim() || undefined,
          location: form.location ?? undefined,
        },
        lines: itemLines,
      };
    }

    setBusy(true);
    setError(null);
    try {
      const { token } = await placeOrder(slug, input);
      if (orderType !== "dine_in") saveCustomer(form);
      clear();
      navigate(`/r/${slug}/order/${token}`, { state: { fresh: true } });
    } catch (e) {
      setError(apiError(e, t.orderFailed));
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          aria-hidden
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
      )}
      {open && (
        <motion.aside
          key="panel"
          role="dialog"
          aria-modal="true"
          aria-label={t.cart}
          initial={{ x: off }}
          animate={{ x: 0 }}
          exit={{ x: off }}
          transition={spring}
          className="fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col bg-bg shadow-lift"
        >
          <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <h2 className="text-lg font-extrabold">{t.cart}</h2>
              <p className="text-xs text-muted">{t.cartCount(lines.reduce((s, l) => s + l.qty, 0))}</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-line/60"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4">
            {lines.length === 0 ? (
              <EmptyState icon={ShoppingBag} title={t.cartEmpty} hint={t.cartEmptyHint} />
            ) : (
              <>
                <ul className="divide-y divide-line">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <Row key={l.item._id} line={l} currency={currency} />
                    ))}
                  </AnimatePresence>
                </ul>

                <section className="space-y-4 border-t border-line py-5">
                  {!orderType || !payment ? (
                    <p role="status" className="text-sm text-muted">
                      {ct.ordersOff}
                    </p>
                  ) : (
                    <>
                      {types.length > 1 && <TypeToggle types={types} value={orderType} onChange={setChosen} />}
                      {delivery ? (
                        <DeliveryForm value={form} onChange={setForm} />
                      ) : takeaway ? (
                        <div className="space-y-4">
                          <Field
                            label={ct.name}
                            icon={User}
                            autoComplete="name"
                            maxLength={80}
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                          />
                          <Field
                            label={ct.phone}
                            icon={Phone}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            maxLength={20}
                            hint={ct.phoneHintTakeaway}
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d+\s()-]/g, "") })}
                          />
                          <Field
                            label={ct.pickupTimeOptional}
                            icon={Clock}
                            maxLength={80}
                            autoComplete="off"
                            hint={ct.pickupTimeHint}
                            value={pickupNote}
                            onChange={(e) => setPickupNote(e.target.value)}
                          />
                        </div>
                      ) : table ? (
                        <p className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
                          <Armchair className="h-4 w-4" aria-hidden />
                          {t.table(table)}
                        </p>
                      ) : (
                        <Field
                          label={t.tableLabel}
                          icon={Armchair}
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={3}
                          hint={t.tableHint(restaurant.tableCount)}
                          value={tableInput}
                          onChange={(e) => setTableInput(e.target.value.replace(/\D/g, ""))}
                        />
                      )}
                      <PaymentPicker methods={methods} value={payment} onChange={setMethod} type={orderType} />
                    </>
                  )}
                </section>
              </>
            )}
          </div>

          {lines.length > 0 && (
            <footer className="space-y-3 border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <CheckoutSummary
                subtotal={totals.subtotalMinor}
                vat={totals.vatMinor}
                deliveryFee={totals.deliveryFeeMinor}
                total={totals.totalMinor}
                currency={currency}
                vatBps={restaurant.vatBps}
                inclusive={restaurant.pricesIncludeVat}
                showDelivery={delivery}
              />
              {quote?.ok && quote.distanceKm !== null && (
                <p className="text-xs text-muted">{ct.away(quote.distanceKm.toFixed(1))}</p>
              )}
              {quoteMsg && (
                <p role="status" className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  {quoteMsg}
                </p>
              )}
              {belowMin && (
                <p role="status" className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  {ct.minDelivery(formatMoney(restaurant.minDeliveryOrderMinor, currency, lang))}
                </p>
              )}
              <AnimatePresence>
                {error && (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-field bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <Button
                className="h-12 w-full"
                disabled={busy || !orderType || !payment || belowMin || !!quoteMsg}
                onClick={() => void submit()}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                {t.placeOrder}
              </Button>
            </footer>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}