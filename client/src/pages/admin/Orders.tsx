import { AnimatePresence, motion } from "framer-motion";
import { Inbox, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import InvoiceDialog from "../../components/admin/InvoiceDialog";
import OrderCard from "../../components/admin/OrderCard";
import PageTransition from "../../components/PageTransition";
import { Button } from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import { apiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { spring } from "../../lib/motion";
import { issueInvoice, setPaymentStatus, updateOrderStatus, type AdminOrder } from "../../lib/ordersApi";
import { playChime, saveSoundPref, soundPref, unlockSound } from "../../lib/sound";
import type { OrderStatus } from "../../lib/types";
import { useAdminRestaurant } from "../../lib/useAdmin";
import { useLiveOrders } from "../../lib/useLiveOrders";
import { useNow } from "../../lib/useNow";

const ACTIVE: OrderStatus[] = ["pending", "accepted", "preparing", "ready"];
type Tab = "active" | "done";

export default function Orders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const rid = user?.restaurant?._id;
  const restaurantName = user?.restaurant?.name.en ?? "Restaurant";
  const { data: restaurant } = useAdminRestaurant(rid);
  const now = useNow();

  const [tab, setTab] = useState<Tab>("active");
  const [sound, setSound] = useState(soundPref);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminOrder | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [invId, setInvId] = useState<string | null>(null);
  const [invOpen, setInvOpen] = useState(false);

  const onNew = (o: AdminOrder) => {
    setFresh((s) => new Set(s).add(o._id));
    toast(
      o.orderType === "delivery"
        ? "New delivery order"
        : o.orderType === "takeaway"
          ? "New takeaway order"
          : `New order · Table ${o.tableNumber ?? "?"}`,
    );
    if (sound) playChime();
    if ("vibrate" in navigator) navigator.vibrate(200);
  };
  const { orders, setOrders, error, live, reload } = useLiveOrders(rid, onNew);

  // after a page reload the audio context is suspended until the first interaction
  useEffect(() => {
    if (!sound) return;
    const unlock = () => void unlockSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [sound]);

  const pending = orders?.filter((o) => o.status === "pending").length ?? 0;
  useEffect(() => {
    const prev = document.title;
    document.title = pending > 0 ? `(${pending}) Orders` : "Orders";
    return () => {
      document.title = prev;
    };
  }, [pending]);

  const toggleSound = async () => {
    const next = !sound;
    setSound(next);
    saveSoundPref(next);
    if (next) {
      await unlockSound();
      playChime();
    }
  };

  const mutate = async (o: AdminOrder, fn: () => Promise<AdminOrder>, fail: string) => {
    setBusyId(o._id);
    try {
      const saved = await fn();
      setOrders((cur) => cur?.map((x) => (x._id === saved._id ? saved : x)));
      return saved;
    } catch (e) {
      toast(apiError(e, fail), "error");
      reload();
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const advance = (o: AdminOrder, status: OrderStatus) =>
    mutate(o, () => updateOrderStatus(o._id, status), "Couldn't update the order");
  const pay = (o: AdminOrder, paid: boolean) =>
    mutate(o, () => setPaymentStatus(o._id, paid ? "paid" : "unpaid"), "Couldn't update the payment");

  // the number is assigned on the first open and reused afterwards
  const openInvoice = async (o: AdminOrder) => {
    if (!o.invoiceNo) {
      const saved = await mutate(o, () => issueInvoice(o._id), "Couldn't create the invoice");
      if (!saved) return;
    }
    setInvId(o._id);
    setInvOpen(true);
  };

  const confirmCancel = async () => {
    if (cancelTarget) await advance(cancelTarget, "cancelled");
    setCancelOpen(false);
  };

  if (!rid) return <ErrorState title="No restaurant" hint="This account isn't linked to a restaurant." />;
  if (error && !orders) {
    return (
      <ErrorState
        title="Couldn't load orders"
        hint={apiError(error)}
        action={<Button onClick={reload}>Try again</Button>}
      />
    );
  }
  if (!orders) {
    return (
      <div role="status" aria-label="Loading orders" className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-72 rounded-card" />
        </div>
      </div>
    );
  }

  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const done = orders.filter((o) => !ACTIVE.includes(o.status));
  const shown = tab === "active" ? active : done;
  const currency = restaurant?.currency ?? "USD";
  const invOrder = orders.find((o) => o._id === invId) ?? null;

  return (
    <PageTransition>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Orders</h1>
          <p
            role="status"
            className={cn(
              "mt-1 inline-flex items-center gap-1.5 text-sm font-semibold",
              live ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300",
            )}
          >
            {live ? <Wifi className="h-4 w-4" aria-hidden /> : <WifiOff className="h-4 w-4" aria-hidden />}
            {live ? "Live" : "Reconnecting…"}
          </p>
        </div>
        <Button variant={sound ? "soft" : "ghost"} aria-pressed={sound} onClick={() => void toggleSound()}>
          {sound ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
          Sound {sound ? "on" : "off"}
        </Button>
      </div>

      <div role="tablist" aria-label="Order filter" className="relative mt-6 grid max-w-sm grid-cols-2 rounded-full bg-line/50 p-1">
        {(
          [
            ["active", `Active (${active.length})`],
            ["done", `Done (${done.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "relative h-11 rounded-full text-sm font-semibold transition-colors",
              tab === id ? "text-white" : "text-muted hover:text-ink",
            )}
          >
            {tab === id && (
              <motion.span layoutId="orders-tab" transition={spring} className="absolute inset-0 rounded-full bg-brand shadow-soft" />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={tab === "active" ? "No active orders" : "Nothing here yet"}
          hint={tab === "active" ? "New orders appear here instantly, with a sound if you turned it on." : undefined}
        />
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {shown.map((o) => (
              <OrderCard
                key={o._id}
                order={o}
                currency={currency}
                restaurantName={restaurantName}
                now={now}
                isNew={fresh.has(o._id) && o.status === "pending"}
                busy={busyId === o._id}
                onAdvance={(s) => void advance(o, s)}
                onPay={(paid) => void pay(o, paid)}
                onInvoice={() => void openInvoice(o)}
                onCancel={() => {
                  setCancelTarget(o);
                  setCancelOpen(true);
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <InvoiceDialog open={invOpen} onClose={() => setInvOpen(false)} order={invOrder} restaurant={restaurant} />

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this order?"
        message="The customer will see it as cancelled. This can't be undone."
        confirmLabel="Yes, cancel order"
        busy={busyId !== null}
        onConfirm={() => void confirmCancel()}
        onCancel={() => setCancelOpen(false)}
      />
    </PageTransition>
  );
}