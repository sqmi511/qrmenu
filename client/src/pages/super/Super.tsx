import { motion } from "framer-motion";
import { Copy, ExternalLink, KeyRound, Loader2, Plus, Receipt, Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import PageTransition from "../../components/PageTransition";
import Badge from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import Field from "../../components/ui/Field";
import { SelectField } from "../../components/ui/FormControls";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../context/toast-context";
import { apiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";
import { rise, spring } from "../../lib/motion";
import {
  createTenant,
  extendAccess,
  grantPlan,
  PAY_METHODS,
  resetPassword,
  setSuspended,
  type Status,
  type Summary,
  type SuperRow,
} from "../../lib/superApi";
import { useSuperData } from "../../lib/useSuper";

const card = "rounded-card border border-line bg-surface p-5 shadow-soft";
const usd = (cents: number) => formatMoney(cents, "USD", "en");
const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(iso)) : "");

const STATUS: Record<Status, { label: string; cls: string }> = {
  pending: { label: "Awaiting plan", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  trial: { label: "Free access", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  grace: { label: "Grace", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  expired: { label: "Expired", cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
  suspended: { label: "Suspended", cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
};
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

interface Cred {
  title: string;
  text: string;
}
interface Ask {
  kind: "suspend" | "reactivate" | "reset";
  row: SuperRow;
}

/* ---------- create restaurant ---------- */
function CreateForm({ onCreated, onClose }: { onCreated: (c: Cred) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [edited, setEdited] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await createTenant({ name: { en: name.trim() }, slug, ownerEmail: email.trim() });
      const origin = window.location.origin;
      onCreated({
        title: "Restaurant created",
        text: `Menu: ${origin}/r/${r.slug}\nAdmin login: ${origin}/admin/login\nEmail: ${r.ownerEmail}\nTemporary password: ${r.tempPassword}\n\nYour menu goes live once your plan is activated (see Billing in your dashboard). Please change the password after your first login.`,
      });
    } catch (err) {
      setError(apiError(err, "Couldn't create the restaurant"));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Restaurant name"
        icon={Store}
        required
        maxLength={80}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (!edited) setSlug(slugify(e.target.value));
        }}
      />
      <Field
        label="Menu link"
        required
        minLength={3}
        maxLength={40}
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        autoComplete="off"
        hint={`${window.location.host}/r/${slug || "name"}`}
        value={slug}
        onChange={(e) => {
          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
          setEdited(true);
        }}
      />
      <Field label="Owner email" type="email" inputMode="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
      <p className="text-xs text-muted">The restaurant stays offline until you activate a plan. Use Free days if you want to give a demo.</p>
      {error && (
        <p role="alert" className="rounded-field bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          Create
        </Button>
      </div>
    </form>
  );
}

/* ---------- activate plan / free days ---------- */
type Mode = "monthly" | "annual" | "lifetime" | "days";

function ManageForm({ row, summary, onDone, onClose }: { row: SuperRow; summary: Summary; onDone: () => void; onClose: () => void }) {
  const { toast } = useToast();
  const p = summary.prices;
  const cents = { monthly: p.monthlyCents, annual: p.annualCents, lifetime: p.lifetimeCents };
  const isLifetime = row.plan === "lifetime";
  const lifetimeOpen = summary.lifetimeSold < summary.lifetimeLimit;

  const [mode, setMode] = useState<Mode>("monthly");
  const [amount, setAmount] = useState(String(p.monthlyCents / 100));
  const [method, setMethod] = useState("whish");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (m: Mode) => {
    setMode(m);
    if (m !== "days") setAmount(String(cents[m] / 100));
  };

  if (isLifetime) {
    return <p className="text-sm text-muted">This restaurant already has a lifetime plan. Nothing to activate.</p>;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    try {
      if (mode === "days") {
        const n = Number(days);
        if (!Number.isInteger(n) || n < 1 || n > 365) return setError("Days must be between 1 and 365");
        setBusy(true);
        await extendAccess(row._id, n);
        toast(`Added ${n} days`);
      } else {
        const usdAmount = Number(amount);
        if (!Number.isFinite(usdAmount) || usdAmount < 0) return setError("Enter a valid amount");
        setBusy(true);
        await grantPlan(row._id, { plan: mode, amountUsd: usdAmount, method, reference: reference.trim() || undefined, note: note.trim() || undefined });
        toast(`${cap(mode)} plan activated`);
      }
      onDone();
    } catch (err) {
      setError(apiError(err, "Couldn't save"));
      setBusy(false);
    }
  };

  const modes: [Mode, string][] = [
    ["monthly", `Monthly ${usd(p.monthlyCents)}`],
    ["annual", `Annual ${usd(p.annualCents)}`],
    ...(lifetimeOpen ? ([["lifetime", `Lifetime ${usd(p.lifetimeCents)}`]] as [Mode, string][]) : []),
    ["days", "Free days"],
  ];

  return (
    <form onSubmit={submit} className="space-y-4">
      <div role="radiogroup" aria-label="Plan" className="flex flex-wrap gap-2">
        {modes.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            onClick={() => pick(id)}
            className={cn("h-11 rounded-full px-4 text-sm font-semibold transition-colors", mode === id ? "bg-brand text-white shadow-soft" : "bg-line/60 text-muted hover:text-ink")}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "days" ? (
        <Field label="Days to add" inputMode="numeric" maxLength={3} value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} hint="Free time, for a demo or goodwill. Not counted as income." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount received (USD)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <SelectField label="Method" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAY_METHODS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </SelectField>
          <Field label="Reference" maxLength={80} hint="Transaction number or their QRM code" value={reference} onChange={(e) => setReference(e.target.value)} />
          <Field label="Note (optional)" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-field bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          {mode === "days" ? "Add days" : "Activate"}
        </Button>
      </div>
    </form>
  );
}

/* ---------- page ---------- */
export default function Super() {
  const { data, error, reload } = useSuperData();
  const { toast } = useToast();
  const [tab, setTab] = useState<"restaurants" | "payments">("restaurants");
  const [createOpen, setCreateOpen] = useState(false);
  const [manageRow, setManageRow] = useState<SuperRow | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [cred, setCred] = useState<Cred | null>(null);
  const [credOpen, setCredOpen] = useState(false);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (error && !data) {
    return <ErrorState title="Couldn't load" hint={apiError(error)} action={<Button onClick={reload}>Try again</Button>} />;
  }
  if (!data) {
    return (
      <div role="status" aria-label="Loading" className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  const { restaurants, summary, payments } = data;
  const showCred = (c: Cred) => {
    setCred(c);
    setCredOpen(true);
  };

  const confirm = async () => {
    if (!ask) return;
    setBusy(true);
    try {
      if (ask.kind === "reset") {
        const r = await resetPassword(ask.row._id);
        setAskOpen(false);
        showCred({
          title: "New temporary password",
          text: `Admin login: ${window.location.origin}/admin/login\nEmail: ${r.ownerEmail}\nTemporary password: ${r.tempPassword}`,
        });
      } else {
        await setSuspended(ask.row._id, ask.kind === "suspend");
        toast(ask.kind === "suspend" ? "Suspended" : "Reactivated");
        setAskOpen(false);
        reload();
      }
    } catch (e) {
      toast(apiError(e, "Failed"), "error");
    } finally {
      setBusy(false);
    }
  };

  const stats: [string, string, string][] = [
    ["Restaurants", String(summary.restaurants), `${summary.pending} awaiting plan · ${summary.suspended + summary.expired} offline`],
    ["Paying", String(summary.active), `${summary.grace} in grace`],
    ["Lifetime sold", `${summary.lifetimeSold} / ${summary.lifetimeLimit}`, usd(summary.prices.lifetimeCents) + " each"],
    ["Income logged", usd(summary.revenueCents), "all payments you recorded"],
  ];

  const untilLine = (r: SuperRow) => {
    if (r.plan === "none") return "Offline until you activate a plan";
    if (r.plan === "lifetime") return "Forever";
    return `Until ${date(r.accessUntil)}${r.daysLeft !== null && r.daysLeft > 0 ? ` (${r.daysLeft} days left)` : ""}`;
  };

  return (
    <PageTransition>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Restaurants</h1>
          <p className="mt-1 text-sm text-muted">Create restaurants, activate plans after you receive payment.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          New restaurant
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value, hint], i) => (
          <motion.section key={label} variants={rise} custom={i} initial="hidden" animate="show" className={card}>
            <h2 className="text-sm font-semibold text-muted">{label}</h2>
            <p className="mt-2 text-2xl font-extrabold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-muted">{hint}</p>
          </motion.section>
        ))}
      </div>

      <div role="tablist" aria-label="View" className="relative mt-6 grid max-w-sm grid-cols-2 rounded-full bg-line/50 p-1">
        {(
          [
            ["restaurants", `Restaurants (${restaurants.length})`],
            ["payments", `Payments (${payments.length})`],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn("relative h-11 rounded-full text-sm font-semibold transition-colors", tab === id ? "text-white" : "text-muted hover:text-ink")}>
            {tab === id && <motion.span layoutId="super-tab" transition={spring} className="absolute inset-0 rounded-full bg-brand shadow-soft" />}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {tab === "restaurants" ? (
        restaurants.length === 0 ? (
          <EmptyState icon={Store} title="No restaurants yet" hint="Create the first one and send the login to the owner." />
        ) : (
          <ul className="mt-4 space-y-2">
            {restaurants.map((r) => {
              const st = STATUS[r.status];
              const offline = r.status === "suspended";
              return (
                <li key={r._id} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-line bg-surface p-4 shadow-soft">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      {r.name.en}
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", st.cls)}>{st.label}</span>
                      {r.plan !== "none" && <Badge>{cap(r.plan)}</Badge>}
                    </p>
                    <p className="text-xs text-muted">
                      /r/{r.slug} · {r.ownerEmail ?? "no owner"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{untilLine(r)}</p>
                  </div>
                  <div className="ms-auto flex flex-wrap items-center gap-1">
                    <Button
                      variant="soft"
                      className="h-10"
                      onClick={() => {
                        setManageRow(r);
                        setManageOpen(true);
                      }}
                    >
                      <Receipt className="h-4 w-4" aria-hidden />
                      Plan
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-10 px-3"
                      onClick={() => {
                        setAsk({ kind: "reset", row: r });
                        setAskOpen(true);
                      }}
                    >
                      <KeyRound className="h-4 w-4" aria-hidden />
                      Reset password
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-10 px-3"
                      onClick={() => {
                        setAsk({ kind: offline ? "reactivate" : "suspend", row: r });
                        setAskOpen(true);
                      }}
                    >
                      {offline ? "Reactivate" : "Suspend"}
                    </Button>
                    <a href={`/r/${r.slug}`} target="_blank" rel="noreferrer" aria-label={`Open ${r.name.en} menu`} className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-line/60 hover:text-ink">
                      <ExternalLink className="h-4 w-4" aria-hidden />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : payments.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments yet" hint="Activate a paid plan on a restaurant and it appears here." />
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-card border border-line bg-surface shadow-soft">
          {payments.map((p) => (
            <li key={p._id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div className="min-w-0">
                <p className="font-bold">{p.restaurant?.name.en ?? "Deleted restaurant"}</p>
                <p className="text-xs text-muted">
                  {date(p.createdAt)} · {PAY_METHODS.find(([v]) => v === p.method)?.[1] ?? p.method}
                  {p.reference ? ` · ${p.reference}` : ""}
                </p>
              </div>
              <div className="text-end">
                <p className="font-extrabold tabular-nums">{usd(p.amountCents)}</p>
                <p className="text-xs text-muted">
                  {cap(p.plan)}
                  {p.coversUntil ? ` · until ${date(p.coversUntil)}` : " · forever"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New restaurant">
        <CreateForm
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => {
            setCreateOpen(false);
            showCred(c);
            reload();
          }}
        />
      </Modal>

      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title={manageRow ? `Plan · ${manageRow.name.en}` : "Plan"} wide>
        {manageRow && (
          <ManageForm
            key={manageRow._id}
            row={manageRow}
            summary={summary}
            onClose={() => setManageOpen(false)}
            onDone={() => {
              setManageOpen(false);
              reload();
            }}
          />
        )}
      </Modal>

      <Modal open={credOpen} onClose={() => setCredOpen(false)} title={cred?.title ?? ""}>
        <p className="text-sm text-muted">Shown only once. Copy it and send it to the owner.</p>
        <pre className="mt-3 whitespace-pre-wrap break-all rounded-field bg-line/50 p-3 text-sm">{cred?.text}</pre>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="soft"
            onClick={() =>
              void navigator.clipboard.writeText(cred?.text ?? "").then(
                () => toast("Copied"),
                () => toast("Couldn't copy", "error"),
              )
            }
          >
            <Copy className="h-4 w-4" aria-hidden />
            Copy
          </Button>
          <Button onClick={() => setCredOpen(false)}>Done</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={askOpen}
        title={ask?.kind === "reset" ? "Reset password?" : ask?.kind === "suspend" ? "Suspend restaurant?" : "Reactivate restaurant?"}
        message={
          ask?.kind === "reset"
            ? `A new temporary password is created for ${ask.row.ownerEmail ?? "the owner"}. The old one stops working.`
            : ask?.kind === "suspend"
              ? `${ask.row.name.en}'s public menu goes offline now and its owner can't use the dashboard.`
              : `${ask?.row.name.en ?? "The restaurant"} comes back online.`
        }
        confirmLabel={ask?.kind === "reset" ? "Reset" : ask?.kind === "suspend" ? "Suspend" : "Reactivate"}
        busy={busy}
        onConfirm={() => void confirm()}
        onCancel={() => setAskOpen(false)}
      />
    </PageTransition>
  );
}