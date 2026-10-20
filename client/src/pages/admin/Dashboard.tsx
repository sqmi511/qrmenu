import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import {
  Armchair,
  ArrowRight,
  BellRing,
  Bike,
  ClipboardList,
  ExternalLink,
  History,
  QrCode,
  Receipt,
  Store,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import PageTransition from "../../components/PageTransition";
import { Button } from "../../components/ui/Button";
import { ErrorState, Skeleton } from "../../components/ui/Feedback";
import { useAuth } from "../../context/auth-context";
import { apiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";
import { rise, spring } from "../../lib/motion";
import type { Range, Stats } from "../../lib/statsApi";
import { useAdminRestaurant } from "../../lib/useAdmin";
import { useStats } from "../../lib/useReports";

const card = "rounded-card border border-line bg-surface p-5 shadow-soft";
const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(Math.round(v)));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: 0.8, ease: "easeOut" });
    return () => c.stop();
  }, [mv, value, reduce]);
  return <motion.span>{text}</motion.span>;
}

function Stat({
  i,
  icon: Icon,
  label,
  hint,
  children,
}: {
  i: number;
  icon: LucideIcon;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <motion.section variants={rise} custom={i} initial="hidden" animate="show" className={card}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted">{label}</h2>
        <span className="grid h-9 w-9 place-items-center rounded-field bg-brand-soft text-brand-ink">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums sm:text-3xl">{children}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </motion.section>
  );
}

function RangeTabs({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div role="tablist" aria-label="Period" className="relative grid max-w-sm grid-cols-3 rounded-full bg-line/50 p-1">
      {RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          role="tab"
          aria-selected={value === r.id}
          onClick={() => onChange(r.id)}
          className={cn(
            "relative h-11 rounded-full text-sm font-semibold transition-colors",
            value === r.id ? "text-white" : "text-muted hover:text-ink",
          )}
        >
          {value === r.id && (
            <motion.span layoutId="range-tab" transition={spring} className="absolute inset-0 rounded-full bg-brand shadow-soft" />
          )}
          <span className="relative">{r.label}</span>
        </button>
      ))}
    </div>
  );
}

function SalesChart({ stats, currency }: { stats: Stats; currency: string }) {
  const money = (n: number) => formatMoney(n, currency, "en");
  const byDay = new Map(stats.daily.map((d) => [d.day, d] as const));
  const days: { key: string; label: string; sales: number; orders: number }[] = [];
  const end = new Date(stats.to).getTime();
  const d = new Date(stats.from);
  while (d.getTime() < end) {
    const hit = byDay.get(d.toLocaleDateString("sv-SE")); // YYYY-MM-DD, local
    days.push({
      key: d.toLocaleDateString("sv-SE"),
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      sales: hit?.salesMinor ?? 0,
      orders: hit?.orders ?? 0,
    });
    d.setDate(d.getDate() + 1);
  }
  const max = Math.max(1, ...days.map((x) => x.sales));
  const step = days.length <= 7 ? 1 : 5;

  return (
    <div role="img" aria-label={`Sales per day, ${money(stats.salesMinor)} in total`}>
      <div className="flex h-40 items-end gap-1">
        {days.map((x, i) => (
          <div
            key={x.key}
            title={`${x.label}: ${money(x.sales)} · ${x.orders} ${x.orders === 1 ? "order" : "orders"}`}
            className="flex h-full flex-1 items-end"
          >
            <motion.div
              aria-hidden
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ ...spring, delay: Math.min(i, 30) * 0.015 }}
              style={{ height: `${Math.max((x.sales / max) * 100, 2)}%`, originY: 1 }}
              className={cn("w-full rounded-t-md", x.sales > 0 ? "bg-brand" : "bg-line")}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-muted">
        {days.map((x, i) => (
          <span key={x.key} className="relative h-4 flex-1">
            {i % step === 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{x.label}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function StaffHome({ name }: { name: string }) {
  const links: { to: string; label: string; icon: LucideIcon }[] = [
    { to: "/admin/orders", label: "Live orders", icon: ClipboardList },
    { to: "/admin/history", label: "Order history", icon: History },
    { to: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
    { to: "/admin/qr", label: "QR codes", icon: QrCode },
  ];
  return (
    <PageTransition>
      <h1 className="text-2xl font-extrabold sm:text-3xl">{name}</h1>
      <p className="mt-1 text-sm text-muted">Sales figures are visible to the owner only.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className={cn(card, "flex items-center gap-3 font-semibold transition hover:shadow-lift")}>
            <l.icon className="h-5 w-5 text-brand-ink" aria-hidden />
            {l.label}
            <ArrowRight className="ms-auto h-4 w-4 text-muted" aria-hidden />
          </Link>
        ))}
      </div>
    </PageTransition>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const rid = user?.restaurant?._id;
  const admin = user?.role === "admin";
  const [range, setRange] = useState<Range>("today");
  const { data: restaurant } = useAdminRestaurant(admin ? rid : undefined);
  const { data, error, loading, reload } = useStats(admin ? rid : undefined, range);

  if (!user?.restaurant) return <ErrorState title="No restaurant" hint="This account isn't linked to a restaurant." />;
  if (!admin) return <StaffHome name={user.restaurant.name.en} />;
  if (error && !data) {
    return <ErrorState title="Couldn't load the dashboard" hint={apiError(error)} action={<Button onClick={reload}>Try again</Button>} />;
  }
  if (!data || !restaurant) {
    return (
      <div role="status" aria-label="Loading dashboard" className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-11 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  const currency = restaurant.currency;
  const money = (n: number) => formatMoney(n, currency, "en");
  const avg = data.orders > 0 ? Math.round(data.salesMinor / data.orders) : 0;
  const paidPct = data.salesMinor > 0 ? Math.round((data.collectedMinor / data.salesMinor) * 100) : 0;
  const takeawayOrders = data.takeawayOrders ?? 0;
  const pctOf = (n: number) => (data.orders > 0 ? Math.round((n / data.orders) * 100) : 0);
  const dinePct = pctOf(data.dineInOrders);
  const takePct = pctOf(takeawayOrders);
  const topMax = Math.max(1, data.top[0]?.qty ?? 1);

  return (
    <PageTransition>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">{restaurant.name.en}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/history"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-soft px-5 text-sm font-semibold text-brand-ink transition hover:brightness-95"
          >
            <History className="h-4 w-4" aria-hidden />
            History
          </Link>
          <a
            href={`/r/${restaurant.slug}?table=1`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted hover:text-ink"
          >
            View menu
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>

      {data.pendingNow > 0 && (
        <Link
          to="/admin/orders"
          className="mt-5 flex items-center gap-3 rounded-card bg-amber-500/15 p-4 font-semibold text-amber-800 dark:text-amber-200"
        >
          <BellRing className="h-5 w-5 shrink-0" aria-hidden />
          {data.pendingNow} {data.pendingNow === 1 ? "order is" : "orders are"} waiting for you
          <ArrowRight className="ms-auto h-4 w-4" aria-hidden />
        </Link>
      )}

      <div className="mt-6">
        <RangeTabs value={range} onChange={setRange} />
      </div>

      {Boolean(error) && (
        <p role="alert" className="mt-4 rounded-field bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {apiError(error)}{" "}
          <button type="button" onClick={reload} className="font-bold underline">
            Retry
          </button>
        </p>
      )}

      <div className={cn("transition-opacity", loading && "opacity-60")} aria-busy={loading}>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat i={0} icon={Receipt} label="Orders" hint={`${data.cancelled} cancelled`}>
            <CountUp value={data.orders} format={(n) => String(n)} />
          </Stat>
          <Stat i={1} icon={TrendingUp} label="Sales" hint={`Includes ${money(data.vatMinor)} VAT`}>
            <CountUp value={data.salesMinor} format={money} />
          </Stat>
          <Stat i={2} icon={Receipt} label="Average order">
            <CountUp value={avg} format={money} />
          </Stat>
          <Stat i={3} icon={Wallet} label="Collected" hint={`${paidPct}% of sales marked paid`}>
            <CountUp value={data.collectedMinor} format={money} />
          </Stat>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {range !== "today" && (
            <section className={cn(card, "lg:col-span-2")}>
              <h2 className="font-bold">Sales per day</h2>
              <div className="mt-4">
                <SalesChart key={range} stats={data} currency={currency} />
              </div>
            </section>
          )}

          <section className={cn(card, range === "today" && "lg:col-span-2")}>
            <h2 className="flex items-center gap-2 font-bold">
              <Trophy className="h-4 w-4 text-brand-ink" aria-hidden />
              Top items
            </h2>
            {data.top.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No orders in this period yet.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {data.top.map((t, i) => (
                  <li key={t.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-semibold">
                        {i + 1}. {t.name.en}
                      </span>
                      <span className="shrink-0 text-muted">
                        {t.qty} sold · {money(t.salesMinor)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-line/60">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(t.qty / topMax) * 100}%` }}
                        transition={{ ...spring, delay: i * 0.05 }}
                        className="h-full rounded-full bg-brand"
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <section className={cn(card, "mt-4")}>
          <h2 className="font-bold">Order types</h2>
          <div
            className="mt-4 flex h-3 overflow-hidden rounded-full bg-line/60"
            role="img"
            aria-label={`${dinePct}% dine-in, ${takePct}% takeaway`}
          >
            <motion.div animate={{ width: `${dinePct}%` }} transition={spring} className="bg-brand" />
            <motion.div animate={{ width: `${takePct}%` }} transition={spring} className="bg-brand/50" />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-2">
              <Armchair className="h-4 w-4 text-brand-ink" aria-hidden />
              Dine-in <strong>{data.dineInOrders}</strong>
            </span>
            <span className="inline-flex items-center gap-2">
              <Store className="h-4 w-4 text-brand-ink/60" aria-hidden />
              Takeaway <strong>{takeawayOrders}</strong>
            </span>
            <span className="inline-flex items-center gap-2">
              <Bike className="h-4 w-4 text-muted" aria-hidden />
              Delivery <strong>{data.deliveryOrders}</strong>
            </span>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}