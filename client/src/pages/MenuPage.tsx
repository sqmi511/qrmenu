import axios from "axios";
import { motion } from "framer-motion";
import { Armchair, SearchX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import CartDrawer from "../components/menu/CartDrawer";
import CartFab from "../components/menu/CartFab";
import CategoryNav from "../components/menu/CategoryNav";
import MenuItemCard from "../components/menu/MenuItemCard";
import PageTransition from "../components/PageTransition";
import Badge from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import LazyImage from "../components/ui/LazyImage";
import SearchInput from "../components/ui/SearchInput";
import { LangToggle, ThemeToggle } from "../components/ui/Toggles";
import { usePrefs } from "../context/prefs-context";
import { isNotFound } from "../lib/api";
import { pick } from "../lib/i18n";
import { spring } from "../lib/motion";
import { useCartView } from "../lib/useCartView";
import { useMenu } from "../lib/useMenu";

const CLOSED = {
  en: { title: "Temporarily unavailable", hint: "This menu isn't available right now. Please ask the staff." },
  ar: { title: "غير متاح مؤقتاً", hint: "هذه القائمة غير متاحة حالياً. اطلب المساعدة من الموظفين." },
};

function MenuSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} role="status">
      <Skeleton className="h-44 rounded-none sm:h-60" />
      <div className="mx-auto max-w-5xl px-4">
        <Skeleton className="relative -mt-10 h-20 w-20 rounded-card border-4 border-bg" />
        <Skeleton className="mt-3 h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        <Skeleton className="mt-6 h-12 w-full" />
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-24 rounded-full" />
          ))}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex gap-4 rounded-card border border-line bg-surface p-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-4 h-5 w-16" />
              </div>
              <Skeleton className="h-28 w-28 shrink-0 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const table = (params.get("table") ?? "").match(/^\d{1,3}$/)?.[0] ?? null;

  const { data, error, loading, retry } = useMenu(slug);
  const { lang, t, applyDefaultLang } = usePrefs();
  const cart = useCartView(data);
  const [cartOpen, setCartOpen] = useState(false);
  const closeCart = useCallback(() => setCartOpen(false), [setCartOpen]);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const lockUntil = useRef(0);
  const restaurant = data?.restaurant;

  useEffect(() => {
    if (restaurant) applyDefaultLang(restaurant.defaultLang);
  }, [restaurant, applyDefaultLang]);

  useEffect(() => {
    if (restaurant) document.title = pick(restaurant.name, lang);
  }, [restaurant, lang]);

  const sections = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.categories;
    return data.categories
      .map((c) => ({
        ...c,
        items: c.items.filter((i) =>
          [i.name.en, i.name.ar, i.description?.en, i.description?.ar].some((s) => s?.toLowerCase().includes(q)),
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [data, query]);

  const ids = sections.map((s) => s._id).join(",");
  const current = sections.some((s) => s._id === activeId) ? activeId : (sections[0]?._id ?? null);

  // scroll-spy
  useEffect(() => {
    if (!ids) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (performance.now() < lockUntil.current) return;
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActiveId((hit.target as HTMLElement).dataset.id ?? null);
      },
      { rootMargin: "-150px 0px -65% 0px" },
    );
    ids.split(",").forEach((id) => {
      const el = document.getElementById(`cat-${id}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);

  const jump = (id: string) => {
    setActiveId(id);
    lockUntil.current = performance.now() + 900; // ignore spy while smooth-scrolling
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  let body: ReactNode;

  if (error) {
    // 503: the restaurant's subscription ended or it was suspended
    const closed = axios.isAxiosError(error) && error.response?.status === 503;
    const missing = !closed && isNotFound(error);
    body = (
      <div className="grid min-h-dvh place-items-center">
        <ErrorState
          title={closed ? CLOSED[lang].title : missing ? t.notFound : t.errorTitle}
          hint={closed ? CLOSED[lang].hint : missing ? t.notFoundHint : t.errorHint}
          action={
            missing ? (
              <Link to="/" className="mt-2 inline-flex h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">
                {t.home}
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
  } else if (loading || !data || !restaurant) {
    body = <MenuSkeleton label={t.loading} />;
  } else {
    body = (
      <>
        <header>
          <div className="relative h-44 overflow-hidden bg-linear-to-br from-brand to-ember-900 sm:h-60">
            {restaurant.coverUrl && (
              <LazyImage
                key={restaurant.coverUrl}
                src={restaurant.coverUrl}
                icon={null}
                className="absolute inset-0 h-full w-full"
              />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
            <div className="absolute end-4 top-4 flex gap-2">
              <ThemeToggle variant="glass" />
              <LangToggle variant="glass" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="relative z-10 mx-auto max-w-5xl px-4"
          >
            <div className="-mt-10 flex items-end justify-between gap-3">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-card border-4 border-bg bg-surface shadow-lift">
                {restaurant.logoUrl ? (
                  <LazyImage key={restaurant.logoUrl} src={restaurant.logoUrl} icon={null} className="h-full w-full" />
                ) : (
                  <span className="text-3xl font-extrabold text-brand-ink">
                    {pick(restaurant.name, lang).charAt(0)}
                  </span>
                )}
              </div>
              {table && (
                <Badge tone="brand" className="mb-1 gap-1.5 px-3 py-1.5 text-sm">
                  <Armchair className="h-4 w-4" aria-hidden />
                  {t.table(table)}
                </Badge>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{pick(restaurant.name, lang)}</h1>
            {pick(restaurant.description, lang) && (
              <p className="mt-1 max-w-prose text-sm text-muted">{pick(restaurant.description, lang)}</p>
            )}
          </motion.div>
        </header>

        <div className="sticky top-0 z-20 mt-4 border-b border-line bg-bg/85 backdrop-blur-xl">
          <div className="mx-auto max-w-5xl space-y-2 px-4 py-3">
            <SearchInput value={query} onChange={setQuery} placeholder={t.search} clearLabel={t.clearSearch} />
            {sections.length > 0 && (
              <CategoryNav
                label={t.categories}
                activeId={current}
                onSelect={jump}
                items={sections.map((s) => ({ id: s._id, label: pick(s.name, lang) }))}
              />
            )}
          </div>
        </div>

        <main className="mx-auto max-w-5xl px-4 pb-32 pt-2">
          {sections.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t.noResults}
              hint={t.noResultsHint}
              action={
                <Button variant="soft" onClick={() => setQuery("")}>
                  {t.clearSearch}
                </Button>
              }
            />
          ) : (
            sections.map((c) => (
              <section key={c._id} id={`cat-${c._id}`} data-id={c._id} className="scroll-mt-36 pt-4">
                <h2 className="mb-3 text-xl font-extrabold">{pick(c.name, lang)}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {c.items.map((it, i) => (
                    <MenuItemCard key={it._id} item={it} currency={restaurant.currency} index={i} />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      </>
    );
  }

  return (
    <div className="themed" style={{ "--accent": restaurant?.accentColor ?? "#f97316" } as CSSProperties}>
      <PageTransition>{body}</PageTransition>
      {restaurant && slug && (
        <>
          <CartFab
            count={cart.count}
            total={cart.total}
            currency={restaurant.currency}
            onOpen={() => setCartOpen(true)}
          />
          <CartDrawer
            open={cartOpen}
            onClose={closeCart}
            lines={cart.lines}
            subtotal={cart.total}
            restaurant={restaurant}
            slug={slug}
            table={table}
          />
        </>
      )}
    </div>
  );
}