import { motion } from "framer-motion";
import { ArrowLeft, Banknote, CircleCheck, CreditCard, ExternalLink, MapPin, MessageCircle } from "lucide-react";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import CheckoutSummary from "../components/CheckoutSummary";
import OrderTimeline from "../components/OrderTimeline";
import PageTransition from "../components/PageTransition";
import Badge from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ErrorState, Skeleton } from "../components/ui/Feedback";
import { LangToggle, ThemeToggle } from "../components/ui/Toggles";
import { usePrefs } from "../context/prefs-context";
import { isNotFound } from "../lib/api";
import { formatMoney } from "../lib/format";
import { pick } from "../lib/i18n";
import { useCT } from "../lib/i18n-checkout";
import { spring } from "../lib/motion";
import { useOrder } from "../lib/useOrder";
import { mapsUrl, whatsappUrl } from "../lib/whatsapp";

const card = "rounded-card border border-line bg-surface p-5 shadow-soft";

export default function OrderPage() {
  const { slug, token } = useParams();
  const location = useLocation();
  const { data, error, loading, retry } = useOrder(token);
  const { lang, t, applyDefaultLang } = usePrefs();
  const ct = useCT();
  const defaultLang = data?.restaurant.defaultLang;
  const fresh = (location.state as { fresh?: boolean } | null)?.fresh === true;

  useEffect(() => {
    if (defaultLang) applyDefaultLang(defaultLang);
  }, [defaultLang, applyDefaultLang]);

  let body: ReactNode;

  if (error) {
    const missing = isNotFound(error);
    body = (
      <div className="grid min-h-dvh place-items-center">
        <ErrorState
          title={missing ? t.orderNotFound : t.errorTitle}
          hint={missing ? t.orderNotFoundHint : t.errorHint}
          action={
            missing ? (
              <Link to={slug ? `/r/${slug}` : "/"} className="mt-2 inline-flex h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">
                {t.backToMenu}
              </Link>
            ) : (
              <Button className="mt-2" onClick={retry}>
                {t.retry}
              </Button>
            )
          }
        />
      </div>
    );
  } else if (loading || !data) {
    body = (
      <div role="status" aria-label={t.loading} className="mx-auto max-w-md space-y-4 px-4 pt-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-80 w-full rounded-card" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    );
  } else {
    const { restaurant } = data;
    const delivery = data.orderType === "delivery";
    const cardPay = data.paymentMethod === "card";
    const paid = data.paymentStatus === "paid";
    const menuHref = `/r/${slug ?? restaurant.slug}${data.tableNumber ? `?table=${data.tableNumber}` : ""}`;

    body = (
      <div className="mx-auto max-w-md px-4 pb-16 pt-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            to={menuHref}
            className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t.backToMenu}
          </Link>
          <div className="flex">
            <ThemeToggle />
            <LangToggle />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          {fresh && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring}
              role="status"
              className="mt-4 flex items-center gap-3 rounded-card bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300"
            >
              <CircleCheck className="h-6 w-6 shrink-0" aria-hidden />
              <div>
                <p className="font-bold">{ct.orderPlaced}</p>
                <p className="text-sm">{ct.orderPlacedHint}</p>
              </div>
            </motion.div>
          )}

          <h1 className="mt-4 text-2xl font-extrabold">{t.orderStatus}</h1>
          <p className="mt-1 text-sm text-muted">
            {pick(restaurant.name, lang)} · {delivery ? ct.delivery : t.table(String(data.tableNumber ?? ""))}
          </p>

          {restaurant.whatsappNumber && token && data.status !== "cancelled" && (
            <div className="mt-5">
              <a
                href={whatsappUrl({ order: data, token, lang, origin: window.location.origin })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-semibold text-stone-950 shadow-soft transition hover:brightness-105 active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5" aria-hidden />
                {ct.sendWhatsapp}
              </a>
              <p className="mt-1.5 text-center text-xs text-muted">{ct.whatsappHint}</p>
            </div>
          )}

          <section className={`${card} mt-6`}>
            <OrderTimeline
              status={data.status}
              labels={delivery ? ct.deliveryStatusLabels : undefined}
              hints={delivery ? ct.deliveryStatusHints : undefined}
            />
          </section>

          {data.customer && (
            <section className={`${card} mt-4`}>
              <h2 className="font-bold">{ct.deliveryTo}</h2>
              <p className="mt-2 text-sm font-semibold">{data.customer.name}</p>
              <p className="text-sm text-muted">{data.customer.address}</p>
              {data.deliveryDistanceKm !== null && (
                <p className="mt-1 text-xs text-muted">{ct.away(data.deliveryDistanceKm.toFixed(1))}</p>
              )}
              {data.customer.location && (
                <a
                  href={mapsUrl(data.customer.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-brand-soft px-4 text-sm font-semibold text-brand-ink transition hover:brightness-95"
                >
                  <MapPin className="h-4 w-4" aria-hidden />
                  {ct.viewOnMap}
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              )}
            </section>
          )}

          <section className={`${card} mt-4`}>
            <h2 className="font-bold">{t.yourItems}</h2>
            <ul className="mt-3 divide-y divide-line">
              {data.lines.map((l, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {new Intl.NumberFormat(lang === "ar" ? "ar-LB" : "en-US").format(l.qty)} × {pick(l.name, lang)}
                    </p>
                    {l.note && <p className="mt-0.5 text-xs text-muted">{l.note}</p>}
                  </div>
                  <span className="shrink-0 font-semibold">{formatMoney(l.priceMinor * l.qty, restaurant.currency, lang)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-line pt-3">
              <CheckoutSummary
                subtotal={data.subtotalMinor}
                vat={data.vatMinor}
                deliveryFee={data.deliveryFeeMinor}
                total={data.totalMinor}
                currency={restaurant.currency}
                vatBps={data.vatBps}
                inclusive={data.pricesIncludeVat}
                showDelivery={delivery}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold">
                {cardPay ? <CreditCard className="h-4 w-4" aria-hidden /> : <Banknote className="h-4 w-4" aria-hidden />}
                {cardPay ? ct.payCard : ct.payCash}
              </span>
              <Badge tone={paid ? "brand" : "neutral"}>{paid ? ct.paid : ct.unpaid}</Badge>
            </div>
          </section>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="themed" style={{ "--accent": data?.restaurant.accentColor ?? "#f97316" } as CSSProperties}>
      <PageTransition>{body}</PageTransition>
    </div>
  );
}