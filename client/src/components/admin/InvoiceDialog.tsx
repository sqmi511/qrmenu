import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AdminRestaurant } from "../../lib/adminApi";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";
import type { AdminOrder } from "../../lib/ordersApi";
import { Button } from "../ui/Button";
import Modal from "../ui/Modal";

type Format = "receipt" | "a4";

function Line({ en, ar, value, strong }: { en: string; ar: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", strong && "text-base font-extrabold")}>
      <span>
        {en} /{" "}
        <span lang="ar" dir="rtl">
          {ar}
        </span>
      </span>
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

function InvoiceSheet({ order, restaurant, format }: { order: AdminOrder; restaurant: AdminRestaurant; format: Format }) {
  const money = (n: number) => formatMoney(n, restaurant.currency, "en");
  const delivery = order.orderType === "delivery";
  const takeaway = order.orderType === "takeaway";
  const c = order.customer;
  const pct = (order.vatBps ?? 0) / 100;
  const vat = order.vatMinor ?? 0;
  const no = order.invoiceNo ? `INV-${String(order.invoiceNo).padStart(6, "0")}` : "-";
  const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(order.invoicedAt ?? order.createdAt),
  );
  const paid = order.paymentStatus === "paid";

  return (
    <div
      className={cn(
        "mx-auto bg-white p-4 text-[12px] leading-snug text-black",
        format === "receipt" ? "w-[72mm]" : "w-full max-w-[180mm] text-[13px]",
      )}
    >
      <header className="text-center">
        <h2 className="text-base font-extrabold">{restaurant.name.en}</h2>
        {restaurant.name.ar && (
          <p lang="ar" dir="rtl" className="font-bold">
            {restaurant.name.ar}
          </p>
        )}
        {restaurant.address && <p>{restaurant.address}</p>}
        {restaurant.phone && <p>{restaurant.phone}</p>}
        {restaurant.vatNumber && <p>VAT No. / الرقم الضريبي: {restaurant.vatNumber}</p>}
      </header>

      <div className="my-2 space-y-0.5 border-y border-dashed border-black py-2">
        <p className="font-extrabold">
          Invoice / <span lang="ar">فاتورة</span> {no}
        </p>
        <p>{date}</p>
        <p>
          {delivery ? (
            <>
              Delivery / <span lang="ar">توصيل</span>
            </>
          ) : takeaway ? (
            <>
              Takeaway / <span lang="ar">سفري</span>
            </>
          ) : (
            <>
              Table / <span lang="ar">طاولة</span> {order.tableNumber ?? ""}
            </>
          )}
        </p>
        {takeaway && order.pickupNote && (
          <p>
            Pickup / <span lang="ar">الاستلام</span>: {order.pickupNote}
          </p>
        )}
        {c && (
          <>
            <p>
              {c.name} · {c.phone}
            </p>
            {c.address && <p>{c.address}</p>}
          </>
        )}
      </div>

      <ul className="divide-y divide-dotted divide-stone-400">
        {order.lines.map((l, i) => (
          <li key={i} className="py-1">
            <div className="flex justify-between gap-2">
              <span className="font-semibold">
                {l.qty} × {l.nameSnapshot.en}
              </span>
              <span className="tabular-nums">{money(l.priceMinorSnapshot * l.qty)}</span>
            </div>
            {l.nameSnapshot.ar && (
              <div lang="ar" dir="rtl" className="text-stone-600">
                {l.nameSnapshot.ar}
              </div>
            )}
            {l.qty > 1 && <div className="text-stone-500">@ {money(l.priceMinorSnapshot)}</div>}
          </li>
        ))}
      </ul>

      <div className="mt-2 space-y-0.5 border-t border-dashed border-black pt-2">
        <Line en="Subtotal" ar="المجموع الفرعي" value={money(order.subtotalMinor ?? order.totalMinor)} />
        {vat > 0 && (
          <Line
            en={order.pricesIncludeVat ? `Includes VAT ${pct}%` : `VAT ${pct}%`}
            ar={order.pricesIncludeVat ? `شامل الضريبة ${pct}%` : `ضريبة القيمة المضافة ${pct}%`}
            value={money(vat)}
          />
        )}
        {delivery && (
          <Line
            en="Delivery fee"
            ar="رسوم التوصيل"
            value={(order.deliveryFeeMinor ?? 0) > 0 ? money(order.deliveryFeeMinor ?? 0) : "Free / مجاني"}
          />
        )}
        <Line strong en="Total" ar="المجموع" value={money(order.totalMinor)} />
      </div>

      <p className="mt-2 border-t border-dashed border-black pt-2">
        {order.paymentMethod === "card" ? "Card machine / جهاز البطاقات" : "Cash / نقداً"} ·{" "}
        {paid ? "Paid / مدفوع" : "Unpaid / غير مدفوع"}
      </p>

      <footer className="mt-3 text-center">
        {restaurant.invoiceFooter ? (
          <p>{restaurant.invoiceFooter}</p>
        ) : (
          <p>
            Thank you / <span lang="ar">شكراً لزيارتكم</span>
          </p>
        )}
      </footer>
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  order: AdminOrder | null;
  restaurant: AdminRestaurant | undefined;
}

export default function InvoiceDialog({ open, onClose, order, restaurant }: Props) {
  const [format, setFormat] = useState<Format>("receipt");
  const [printing, setPrinting] = useState(false);

  // render the print sheet first, then open the print dialog
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    return () => {
      window.removeEventListener("afterprint", done);
      cancelAnimationFrame(id);
    };
  }, [printing]);

  const ready = order && restaurant;
  const incomplete = ready && (!restaurant.address || !restaurant.vatNumber);

  return (
    <Modal open={open} onClose={onClose} title="Invoice" wide>
      {ready && (
        <>
          <div role="group" aria-label="Paper format" className="mb-4 grid max-w-sm grid-cols-2 gap-1 rounded-full bg-line/50 p-1">
            {(
              [
                ["receipt", "Receipt 80 mm"],
                ["a4", "A4"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={format === id}
                onClick={() => setFormat(id)}
                className={cn(
                  "h-11 rounded-full text-sm font-semibold transition-colors",
                  format === id ? "bg-brand text-white shadow-soft" : "text-muted hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="max-h-[50dvh] overflow-auto rounded-field border border-line bg-stone-200 p-3">
            <InvoiceSheet order={order} restaurant={restaurant} format={format} />
          </div>

          {incomplete && (
            <p role="status" className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">
              Add your address and VAT number in Settings, Business details, so they print on the invoice.
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <Button disabled={printing || !order.invoiceNo} onClick={() => setPrinting(true)}>
              <Printer className="h-4 w-4" aria-hidden />
              Print
            </Button>
          </div>

          {printing && (
            <>
              <style>
                {`@page{size:${format === "receipt" ? "80mm auto" : "A4"};margin:${format === "receipt" ? "4mm" : "12mm"}}
@media print{body>*:not(#invoice-print){display:none!important}body{background:#fff!important}}`}
              </style>
              {createPortal(
                <div id="invoice-print" className="hidden print:block">
                  <InvoiceSheet order={order} restaurant={restaurant} format={format} />
                </div>,
                document.body,
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
}