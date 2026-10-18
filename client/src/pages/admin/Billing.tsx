import { motion } from "framer-motion";
import { Check, Copy, MessageCircle, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import ChangePassword from "../../components/admin/ChangePassword";
import PageTransition from "../../components/PageTransition";
import Badge from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ErrorState, Skeleton } from "../../components/ui/Feedback";
import { type Access, useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import { apiError } from "../../lib/api";
import { useBilling } from "../../lib/billingApi";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";
import { rise } from "../../lib/motion";

const card = "rounded-card border border-line bg-surface p-5 shadow-soft";
const usd = (cents: number) => formatMoney(cents, "USD", "en");
const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(iso)) : "");
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function statusLine(a: Access): { text: string; tone: "ok" | "warn" | "bad" } {
  switch (a.status) {
    case "pending":
      return { text: "Your account is ready. Choose a plan below. Your menu goes live as soon as we confirm your payment.", tone: "warn" };
    case "trial":
      return { text: `Free access · ${plural(a.daysLeft ?? 0, "day")} left (ends ${date(a.accessUntil)})`, tone: "ok" };
    case "active":
      return a.accessUntil
        ? { text: `${a.plan === "annual" ? "Annual" : "Monthly"} plan · ends ${date(a.accessUntil)} (${plural(a.daysLeft ?? 0, "day")} left)`, tone: (a.daysLeft ?? 0) <= 7 ? "warn" : "ok" }
        : { text: "Lifetime plan. It never expires.", tone: "ok" };
    case "grace":
      return { text: `Your subscription ended. The menu stays online for ${plural(a.graceDaysLeft ?? 0, "more day")}.`, tone: "warn" };
    case "expired":
      return { text: "Your subscription ended. Your menu is offline until you renew.", tone: "bad" };
    default:
      return { text: "Your account is suspended. Please contact us.", tone: "bad" };
  }
}

function Plan({ title, price, per, note, highlight, children }: { title: string; price: string; per: string; note?: string; highlight?: boolean; children?: ReactNode }) {
  return (
    <div className={cn("flex flex-col rounded-card border p-5", highlight ? "border-brand bg-brand-soft" : "border-line bg-surface")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        {note && <Badge tone="brand">{note}</Badge>}
      </div>
      <p className="mt-3 text-3xl font-extrabold">{price}</p>
      <p className="text-sm text-muted">{per}</p>
      {children && <div className="mt-3 text-sm text-muted">{children}</div>}
    </div>
  );
}

export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const admin = user?.role === "admin";
  const { data, error, reload } = useBilling(admin);

  if (!admin) {
    return <ErrorState title="Owner only" hint="Ask the restaurant owner about the subscription." />;
  }
  if (error && !data) {
    return <ErrorState title="Couldn't load billing" hint={apiError(error)} action={<Button onClick={reload}>Try again</Button>} />;
  }
  if (!data) {
    return (
      <div role="status" aria-label="Loading billing" className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-48 rounded-card" />
      </div>
    );
  }

  const { access: a, prices, lifetime, pay, payments, reference } = data;
  const st = statusLine(a);
  const saving = prices.monthlyCents * 12 - prices.annualCents;
  const restName = user?.restaurant?.name.en ?? "";
  const wa = pay.whatsapp
    ? `https://wa.me/${pay.whatsapp}?text=${encodeURIComponent(`Hello, I'd like to activate my plan.\nRestaurant: ${restName}\nReference: ${reference}`)}`
    : null;

  const copy = (text: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast("Copied"),
      () => toast("Couldn't copy", "error"),
    );

  return (
    <PageTransition>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Billing</h1>

      <motion.section variants={rise} initial="hidden" animate="show" className={cn(card, "mt-6 flex items-center gap-3", st.tone === "bad" && "border-red-500/40", st.tone === "warn" && "border-amber-500/40")}>
        <Sparkles className="h-5 w-5 shrink-0 text-brand-ink" aria-hidden />
        <p role="status" className="font-semibold">
          {st.text}
        </p>
      </motion.section>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Plan title="Monthly" price={usd(prices.monthlyCents)} per="per month" />
        <Plan title="Annual" price={usd(prices.annualCents)} per="per year" note="Best value" highlight>
          Save {usd(saving)} compared to paying monthly.
        </Plan>
        {lifetime.left > 0 && (
          <Plan title="Lifetime" price={usd(prices.lifetimeCents)} per="one time, forever" note={`${lifetime.left} of ${lifetime.limit} left`}>
            Pay once and never again. Launch offer for the first {lifetime.limit} restaurants.
          </Plan>
        )}
      </div>

      <section className={cn(card, "mt-4")}>
        <h2 className="font-bold">How to pay</h2>
        <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm">
          <li>
            Choose a plan and send the amount by <strong>Whish Money</strong>
            {pay.whish ? (
              <>
                {" "}
                to <strong>{pay.whish}</strong>{" "}
                <button type="button" onClick={() => void copy(pay.whish)} className="ms-1 inline-flex h-8 items-center gap-1 rounded-full bg-line/60 px-3 text-xs font-semibold">
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Copy
                </button>
              </>
            ) : (
              ". Contact us for the number."
            )}
            . Bank transfer, OMT or card are possible too. Just ask.
          </li>
          <li>
            Write your reference code in the note:{" "}
            <strong className="rounded bg-line/60 px-2 py-0.5 font-mono">{reference}</strong>{" "}
            <button type="button" onClick={() => void copy(reference)} className="ms-1 inline-flex h-8 items-center gap-1 rounded-full bg-line/60 px-3 text-xs font-semibold">
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy
            </button>
          </li>
          <li>Send us the receipt. We activate your plan as soon as we confirm the payment.</li>
        </ol>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-[#25D366] px-6 font-semibold text-stone-950 shadow-soft transition hover:brightness-105">
            <MessageCircle className="h-5 w-5" aria-hidden />
            Send receipt on WhatsApp
          </a>
        )}
      </section>

      {payments.length > 0 && (
        <section className={cn(card, "mt-4")}>
          <h2 className="font-bold">Payment history</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {payments.map((p) => (
              <li key={p._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                  {p.plan[0].toUpperCase() + p.plan.slice(1)} · {usd(p.amountCents)}
                </span>
                <span className="text-muted">
                  {date(p.createdAt)}
                  {p.coversUntil ? ` · until ${date(p.coversUntil)}` : " · lifetime"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4">
        <ChangePassword urgent={user?.mustChangePassword} />
      </div>
    </PageTransition>
  );
}