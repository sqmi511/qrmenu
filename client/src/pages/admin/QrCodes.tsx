import { motion } from "framer-motion";
import { Armchair, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PageTransition from "../../components/PageTransition";
import { Button } from "../../components/ui/Button";
import { ErrorState, Skeleton } from "../../components/ui/Feedback";
import Field from "../../components/ui/Field";
import { ToggleRow } from "../../components/ui/FormControls";
import { useAuth } from "../../context/auth-context";
import type { AdminRestaurant } from "../../lib/adminApi";
import { apiError } from "../../lib/api";
import { pick } from "../../lib/i18n";
import { rise } from "../../lib/motion";
import { useAdminRestaurant } from "../../lib/useAdmin";

interface Card {
  key: string;
  url: string;
  title: string;
  subtitle: string;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const PREVIEW = 8;

function QrCard({ card, name, accent, size }: { card: Card; name: string; accent: string; size: number }) {
  return (
    <div
      className="break-inside-avoid rounded-3xl border-4 bg-white p-5 text-center text-black"
      style={{ borderColor: accent }}
    >
      <p className="text-lg font-extrabold">{name}</p>
      <div className="mx-auto my-3 w-fit bg-white p-2">
        <QRCodeSVG value={card.url} size={size} level="M" />
      </div>
      <p className="text-2xl font-extrabold">{card.title}</p>
      <p lang="ar" dir="rtl" className="text-lg font-bold">
        {card.subtitle}
      </p>
      <p className="mt-2 text-xs text-stone-600">Scan to view the menu and order · امسح لعرض القائمة والطلب</p>
      <p className="mt-1 break-all text-[10px] text-stone-400">{card.url}</p>
    </div>
  );
}

function QrSheet({ restaurant }: { restaurant: AdminRestaurant }) {
  const max = restaurant.tableCount;
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState(String(max));
  const [general, setGeneral] = useState(true);
  const [printing, setPrinting] = useState(false);

  const a = clamp(Number(from) || 1, 1, max);
  const b = clamp(Number(to) || max, a, max);
  const base = `${window.location.origin}/r/${restaurant.slug}`;
  const name = pick(restaurant.name, "en");

  const cards: Card[] = [
    ...(general ? [{ key: "menu", url: base, title: "Menu", subtitle: "القائمة" }] : []),
    ...Array.from({ length: b - a + 1 }, (_, i) => {
      const n = a + i;
      return { key: String(n), url: `${base}?table=${n}`, title: `Table ${n}`, subtitle: `طاولة ${n}` };
    }),
  ];

  // render the sheet first, then open the print dialog
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

  return (
    <>
      <h1 className="text-2xl font-extrabold sm:text-3xl">QR codes</h1>
      <p className="mt-1 text-sm text-muted">
        Print one per table. Guests scan it, order, and the table number is filled in for them.
      </p>

      <section className="mt-6 grid gap-4 rounded-card border border-line bg-surface p-5 shadow-soft sm:grid-cols-2">
        <Field
          label="From table"
          icon={Armchair}
          inputMode="numeric"
          maxLength={3}
          value={from}
          onChange={(e) => setFrom(e.target.value.replace(/\D/g, ""))}
        />
        <Field
          label="To table"
          icon={Armchair}
          inputMode="numeric"
          maxLength={3}
          hint={`You have ${max} tables. Change this in Settings.`}
          value={to}
          onChange={(e) => setTo(e.target.value.replace(/\D/g, ""))}
        />
        <div className="sm:col-span-2">
          <ToggleRow
            label="Include a general menu QR"
            hint="No table number. For the door, delivery flyers and takeaway."
            checked={general}
            onChange={setGeneral}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button disabled={cards.length === 0 || printing} onClick={() => setPrinting(true)}>
            <Printer className="h-4 w-4" aria-hidden />
            Print {cards.length} {cards.length === 1 ? "card" : "cards"}
          </Button>
          <p className="text-xs text-muted">A4, two per row. In the print dialog, turn on background graphics.</p>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.slice(0, PREVIEW).map((c, i) => (
          <motion.div key={c.key} variants={rise} custom={i} initial="hidden" animate="show">
            <QrCard card={c} name={name} accent={restaurant.accentColor} size={140} />
          </motion.div>
        ))}
      </div>
      {cards.length > PREVIEW && (
        <p className="mt-3 text-sm text-muted">+ {cards.length - PREVIEW} more in the printout</p>
      )}

      {/* print-only sheet; the app itself is hidden while printing */}
      <style>{"@page{margin:12mm}@media print{#root{display:none!important}body{background:#fff!important}}"}</style>
      {printing &&
        createPortal(
          <div className="hidden print:block">
            <div className="grid grid-cols-2 gap-6">
              {cards.map((c) => (
                <QrCard key={c.key} card={c} name={name} accent={restaurant.accentColor} size={200} />
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default function QrCodes() {
  const { user } = useAuth();
  const { data, error, reload } = useAdminRestaurant(user?.restaurant?._id);

  if (!user?.restaurant) return <ErrorState title="No restaurant" hint="This account isn't linked to a restaurant." />;
  if (error && !data) {
    return (
      <ErrorState title="Couldn't load" hint={apiError(error)} action={<Button onClick={reload}>Try again</Button>} />
    );
  }
  if (!data) {
    return (
      <div role="status" aria-label="Loading" className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-56 w-full rounded-card" />
      </div>
    );
  }
  return (
    <PageTransition>
      <QrSheet restaurant={data} />
    </PageTransition>
  );
}