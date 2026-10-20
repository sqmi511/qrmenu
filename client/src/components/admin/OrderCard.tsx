import { motion } from "framer-motion";
import {
  Armchair,
  Banknote,
  Bike,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Store,
  X,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";
import type { AdminOrder } from "../../lib/ordersApi";
import { spring } from "../../lib/motion";
import type { OrderStatus } from "../../lib/types";
import { mapsUrl } from "../../lib/whatsapp";
import { Button } from "../ui/Button";

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  pending: { label: "New", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  accepted: { label: "Accepted", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  preparing: { label: "Preparing", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  ready: { label: "Ready", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  served: { label: "Served", cls: "bg-stone-500/15 text-muted" },
  cancelled: { label: "Cancelled", cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

const NEXT: Partial<
  Record<OrderStatus, { to: OrderStatus; label: string; delivery?: string; takeaway?: string }>
> = {
  pending: { to: "accepted", label: "Accept" },
  accepted: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready", label: "Mark ready", delivery: "Out for delivery", takeaway: "Ready for pickup" },
  ready: { to: "served", label: "Mark served", delivery: "Mark delivered", takeaway: "Mark picked up" },
};

const CANCELLABLE: OrderStatus[] = ["pending", "accepted", "preparing"];

function timeAgo(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60_000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

interface Props {
  order: AdminOrder;
  currency: string;
  restaurantName: string;
  now: number;
  isNew: boolean;
  busy: boolean;
  onAdvance: (s: OrderStatus) => void;
  onCancel: () => void;
  onPay: (paid: boolean) => void;
  onInvoice: () => void;
}

export default function OrderCard({
  order,
  currency,
  restaurantName,
  now,
  isNew,
  busy,
  onAdvance,
  onCancel,
  onPay,
  onInvoice,
}: Props) {
  const money = (n: number) => formatMoney(n, currency, "en");
  const delivery = order.orderType === "delivery";
  const takeaway = order.orderType === "takeaway";
  const c = order.customer;
  const st = STATUS[order.status];
  const next = NEXT[order.status];
  const statusLabel = delivery
    ? order.status === "ready"
      ? "Out for delivery"
      : order.status === "served"
        ? "Delivered"
        : st.label
    : takeaway
      ? order.status === "ready"
        ? "Ready for pickup"
        : order.status === "served"
          ? "Picked up"
          : st.label
      : st.label;
  const nextLabel = next
    ? delivery && next.delivery
      ? next.delivery
      : takeaway && next.takeaway
        ? next.takeaway
        : next.label
    : "";
  const cardPay = order.paymentMethod === "card";
  const paid = order.paymentStatus === "paid";
  const waDigits = c?.phone.replace(/\D/g, "") ?? "";
  const waText = c ? `Hello ${c.name}, this is ${restaurantName} about your order.` : "";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={spring}
      className={cn(
        "flex flex-col gap-3 rounded-card border bg-surface p-4 shadow-soft",
        isNew ? "border-brand ring-2 ring-brand/40" : "border-line",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-lg font-extrabold">
            {delivery ? (
              <Bike className="h-5 w-5 shrink-0 text-brand-ink" aria-hidden />
            ) : takeaway ? (
              <Store className="h-5 w-5 shrink-0 text-brand-ink" aria-hidden />
            ) : (
              <Armchair className="h-5 w-5 shrink-0 text-brand-ink" aria-hidden />
            )}
            {delivery ? "Delivery" : takeaway ? "Takeaway" : `Table ${order.tableNumber ?? "?"}`}
          </p>
          <p className="text-xs text-muted">
            {timeAgo(now - Date.parse(order.createdAt))}
            {delivery && order.deliveryDistanceKm != null && ` · ${order.deliveryDistanceKm.toFixed(1)} km`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isNew && (
            <span className="relative flex h-3 w-3" aria-label="New order">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-brand" />
            </span>
          )}
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", st.cls)}>{statusLabel}</span>
        </div>
      </header>

      {takeaway && order.pickupNote && (
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-ink">
          <Clock className="h-4 w-4" aria-hidden />
          Pickup: {order.pickupNote}
        </p>
      )}

      <ul className="divide-y divide-line text-sm">
        {order.lines.map((l, i) => (
          <li key={i} className="flex items-start justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="font-semibold">
                {l.qty} × {l.nameSnapshot.en}
              </p>
              {l.note && <p className="mt-0.5 text-xs italic text-muted">“{l.note}”</p>}
            </div>
            <span className="shrink-0 text-muted">{money(l.priceMinorSnapshot * l.qty)}</span>
          </li>
        ))}
      </ul>

      <dl className="space-y-1 border-t border-line pt-3 text-sm">
        {(order.vatMinor ?? 0) > 0 && (
          <div className="flex justify-between text-muted">
            <dt>{order.pricesIncludeVat ? "Includes VAT" : "VAT"}</dt>
            <dd>{money(order.vatMinor ?? 0)}</dd>
          </div>
        )}
        {delivery && (
          <div className="flex justify-between text-muted">
            <dt>Delivery fee</dt>
            <dd>{(order.deliveryFeeMinor ?? 0) > 0 ? money(order.deliveryFeeMinor ?? 0) : "Free"}</dd>
          </div>
        )}
        <div className="flex justify-between text-base font-extrabold">
          <dt>Total</dt>
          <dd>{money(order.totalMinor)}</dd>
        </div>
      </dl>

      {order.status !== "cancelled" && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold">
            {cardPay ? <CreditCard className="h-4 w-4" aria-hidden /> : <Banknote className="h-4 w-4" aria-hidden />}
            {cardPay ? "Card machine" : "Cash"}
          </span>
          {paid ? (
            <span className="flex items-center gap-1">
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Paid
              </span>
              <Button variant="ghost" className="h-9 px-3 text-xs" disabled={busy} onClick={() => onPay(false)}>
                Undo
              </Button>
            </span>
          ) : (
            <Button variant="soft" className="h-10" disabled={busy} onClick={() => onPay(true)}>
              Mark paid
            </Button>
          )}
        </div>
      )}

      {order.status !== "cancelled" && (
        <Button variant="ghost" className="h-10 self-start px-3" disabled={busy} onClick={onInvoice}>
          <FileText className="h-4 w-4" aria-hidden />
          {order.invoiceNo ? `Invoice #${order.invoiceNo}` : "Invoice"}
        </Button>
      )}

      {c && (
        <section className="space-y-2 rounded-field bg-brand-soft p-3 text-sm">
          <p className="font-bold">{c.name}</p>
          {c.address && <p className="text-muted">{c.address}</p>}
          {c.notes && <p className="text-xs italic text-muted">“{c.notes}”</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={`tel:${c.phone}`}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold"
            >
              <Phone className="h-4 w-4" aria-hidden />
              {c.phone}
            </a>
            {c.location && (
              <a
                href={mapsUrl(c.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold"
              >
                <MapPin className="h-4 w-4" aria-hidden />
                Map
              </a>
            )}
            {waDigits.length >= 6 && (
              <a
                href={`https://wa.me/${waDigits}?text=${encodeURIComponent(waText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-stone-950"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp customer
              </a>
            )}
          </div>
        </section>
      )}

      {(next || CANCELLABLE.includes(order.status)) && (
        <footer className="mt-auto flex gap-2">
          {next && (
            <Button className="h-12 flex-1" disabled={busy} onClick={() => onAdvance(next.to)}>
              {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
              {nextLabel}
            </Button>
          )}
          {CANCELLABLE.includes(order.status) && (
            <Button variant="ghost" className="h-12" disabled={busy} onClick={onCancel}>
              <X className="h-4 w-4" aria-hidden />
              Cancel
            </Button>
          )}
        </footer>
      )}
    </motion.article>
  );
}