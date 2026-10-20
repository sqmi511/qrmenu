import { Armchair, Bike, FileText, History as HistoryIcon, Loader2, Store } from "lucide-react";
import { useState } from "react";
import InvoiceDialog from "../../components/admin/InvoiceDialog";
import PageTransition from "../../components/PageTransition";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import Field from "../../components/ui/Field";
import { SelectField } from "../../components/ui/FormControls";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import { apiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";
import { issueInvoice, type AdminOrder } from "../../lib/ordersApi";
import type { HistoryFilters } from "../../lib/statsApi";
import type { OrderStatus } from "../../lib/types";
import { useAdminRestaurant } from "../../lib/useAdmin";
import { useHistory } from "../../lib/useReports";

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  pending: { label: "New", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  accepted: { label: "Accepted", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  preparing: { label: "Preparing", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  ready: { label: "Ready", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  served: { label: "Served", cls: "bg-stone-500/15 text-muted" },
  cancelled: { label: "Cancelled", cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

const fmtDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const rid = user?.restaurant?._id;
  const { data: restaurant } = useAdminRestaurant(rid);
  const [f, setF] = useState<HistoryFilters>({ status: "", type: "", from: "", to: "" });
  const { rows, hasMore, error, loading, more, loadMore, replace, reload } = useHistory(rid, f);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [invId, setInvId] = useState<string | null>(null);
  const [invOpen, setInvOpen] = useState(false);

  const currency = restaurant?.currency ?? "USD";
  const money = (n: number) => formatMoney(n, currency, "en");
  const invOrder = rows.find((o) => o._id === invId) ?? null;
  const filtered = f.status !== "" || f.type !== "" || f.from !== "" || f.to !== "";

  // the number is assigned on first open and reused afterwards
  const openInvoice = async (o: AdminOrder) => {
    if (!o.invoiceNo) {
      setBusyId(o._id);
      try {
        replace(await issueInvoice(o._id));
      } catch (e) {
        toast(apiError(e, "Couldn't create the invoice"), "error");
        setBusyId(null);
        return;
      }
      setBusyId(null);
    }
    setInvId(o._id);
    setInvOpen(true);
  };

  if (!rid) return <ErrorState title="No restaurant" hint="This account isn't linked to a restaurant." />;

  return (
    <PageTransition>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Order history</h1>
      <p className="mt-1 text-sm text-muted">Newest first. Filter by status, type or date.</p>

      <section className="mt-6 grid gap-4 rounded-card border border-line bg-surface p-5 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Status"
          value={f.status}
          onChange={(e) => setF({ ...f, status: e.target.value as HistoryFilters["status"] })}
        >
          <option value="">All</option>
          {(Object.keys(STATUS) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS[s].label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Type"
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value as HistoryFilters["type"] })}
        >
          <option value="">All</option>
          <option value="dine_in">Dine-in</option>
          <option value="delivery">Delivery</option>
          <option value="takeaway">Takeaway</option>
        </SelectField>
        <Field label="From" type="date" value={f.from} max={f.to || undefined} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <Field label="To" type="date" value={f.to} min={f.from || undefined} onChange={(e) => setF({ ...f, to: e.target.value })} />
        {filtered && (
          <div className="sm:col-span-2 lg:col-span-4">
            <Button variant="ghost" onClick={() => setF({ status: "", type: "", from: "", to: "" })}>
              Clear filters
            </Button>
          </div>
        )}
      </section>

      {error && rows.length === 0 ? (
        <ErrorState title="Couldn't load orders" hint={apiError(error)} action={<Button onClick={reload}>Try again</Button>} />
      ) : loading && rows.length === 0 ? (
        <div role="status" aria-label="Loading orders" className="mt-6 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No orders found"
          hint={filtered ? "Try different filters." : "Orders appear here once guests place them."}
        />
      ) : (
        <>
          <ul className={cn("mt-6 space-y-2 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
            {rows.map((o) => {
              const delivery = o.orderType === "delivery";
              const takeaway = o.orderType === "takeaway";
              const st = STATUS[o.status];
              const paid = o.paymentStatus === "paid";
              return (
                <li
                  key={o._id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-line bg-surface p-4 shadow-soft"
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="flex items-center gap-2 font-bold">
                      {delivery ? (
                        <Bike className="h-4 w-4 shrink-0 text-brand-ink" aria-hidden />
                      ) : takeaway ? (
                        <Store className="h-4 w-4 shrink-0 text-brand-ink" aria-hidden />
                      ) : (
                        <Armchair className="h-4 w-4 shrink-0 text-brand-ink" aria-hidden />
                      )}
                      {delivery
                        ? `Delivery · ${o.customer?.name ?? ""}`
                        : takeaway
                          ? `Takeaway · ${o.customer?.name ?? ""}`
                          : `Table ${o.tableNumber ?? "?"}`}
                    </p>
                    <p className="text-xs text-muted">
                      {fmtDate.format(new Date(o.createdAt))}
                      {o.invoiceNo ? ` · Invoice #${o.invoiceNo}` : ""}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {o.lines.map((l) => `${l.qty}× ${l.nameSnapshot.en}`).join(", ")}
                    </p>
                  </div>

                  <div className="ms-auto flex flex-wrap items-center gap-2">
                    <span className="font-extrabold tabular-nums">{money(o.totalMinor)}</span>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", st.cls)}>{st.label}</span>
                    {o.status !== "cancelled" && (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-bold",
                          paid ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-line/60 text-muted",
                        )}
                      >
                        {paid ? "Paid" : "Unpaid"}
                      </span>
                    )}
                    {o.status !== "cancelled" && (
                      <Button variant="ghost" className="h-10 px-3" disabled={busyId === o._id} onClick={() => void openInvoice(o)}>
                        {busyId === o._id ? (
                          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
                        ) : (
                          <FileText className="h-4 w-4" aria-hidden />
                        )}
                        Invoice
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="soft"
                disabled={more}
                onClick={() => void loadMore().catch((e) => toast(apiError(e, "Couldn't load more"), "error"))}
              >
                {more && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      <InvoiceDialog open={invOpen} onClose={() => setInvOpen(false)} order={invOrder} restaurant={restaurant} />
    </PageTransition>
  );
}