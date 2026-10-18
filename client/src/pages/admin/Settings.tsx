import { AnimatePresence, motion } from "framer-motion";
import {
  Armchair,
  Coins,
  Link2,
  Loader2,
  LocateFixed,
  MapPin,
  MessageCircle,
  Palette,
  Percent,
  Ruler,
  Store,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import PageTransition from "../../components/PageTransition";
import { Button } from "../../components/ui/Button";
import { ErrorState, Skeleton } from "../../components/ui/Feedback";
import Field from "../../components/ui/Field";
import { SelectField, TextAreaField, ToggleRow } from "../../components/ui/FormControls";
import ImageField from "../../components/ui/ImageField";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import { patchRestaurant, type AdminRestaurant, type RestaurantPatch } from "../../lib/adminApi";
import { apiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { fromMinor, toMinor } from "../../lib/format";
import { rise, spring } from "../../lib/motion";
import { useAdminRestaurant } from "../../lib/useAdmin";

interface Form {
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  defaultLang: "en" | "ar";
  currency: string;
  tableCount: string;
  isActive: boolean;
  accent: string;
  logoUrl: string;
  coverUrl: string;
  dineIn: boolean;
  delivery: boolean;
  fee: string;
  minOrder: string;
  perKm: string;
  freeOver: string;
  maxKm: string;
  lat: string;
  lng: string;
  whatsapp: string;
  payCash: boolean;
  payCard: boolean;
  vat: string;
  inclVat: boolean;
}

const init = (r: AdminRestaurant): Form => ({
  nameEn: r.name.en,
  nameAr: r.name.ar ?? "",
  descEn: r.description?.en ?? "",
  descAr: r.description?.ar ?? "",
  defaultLang: r.defaultLang,
  currency: r.currency,
  tableCount: String(r.tableCount),
  isActive: r.isActive,
  accent: r.accentColor,
  logoUrl: r.logoUrl,
  coverUrl: r.coverUrl,
  dineIn: r.dineInEnabled,
  delivery: r.deliveryEnabled,
  fee: fromMinor(r.deliveryFeeMinor, r.currency),
  minOrder: fromMinor(r.minDeliveryOrderMinor, r.currency),
  perKm: fromMinor(r.deliveryPerKmMinor ?? 0, r.currency),
  freeOver: fromMinor(r.freeDeliveryOverMinor ?? 0, r.currency),
  maxKm: String(r.maxDeliveryKm ?? 0),
  lat: r.locationLat == null ? "" : String(r.locationLat),
  lng: r.locationLng == null ? "" : String(r.locationLng),
  whatsapp: r.whatsappNumber,
  payCash: r.paymentCash ?? true,
  payCard: r.paymentCard ?? false,
  vat: String(r.vatBps / 100),
  inclVat: r.pricesIncludeVat,
});

const validUrl = (s: string) => s === "" || /^https?:\/\//i.test(s) || s.startsWith("/uploads/");
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function Section({ i, title, hint, children }: { i: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <motion.section
      variants={rise}
      custom={i}
      initial="hidden"
      animate="show"
      className="rounded-card border border-line bg-surface p-5 shadow-soft"
    >
      <h2 className="font-bold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </motion.section>
  );
}

function SettingsForm({ restaurant }: { restaurant: AdminRestaurant }) {
  const { toast } = useToast();
  const [f, setF] = useState<Form>(() => init(restaurant));
  const [base, setBase] = useState<Form>(f);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setError(null);
  };
  const dirty = JSON.stringify(f) !== JSON.stringify(base);

  const locate = () => {
    if (!("geolocation" in navigator)) return setError("Location isn't available in this browser");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setF((s) => ({ ...s, lat: String(round6(p.coords.latitude)), lng: String(round6(p.coords.longitude)) }));
        setError(null);
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location. You can type the coordinates instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const save = async () => {
    if (busy) return;
    const cur = f.currency.trim().toUpperCase();
    const nameEn = f.nameEn.trim();
    const vat = Number(f.vat.replace(",", "."));
    const tables = Number(f.tableCount);
    const fee = toMinor(f.fee.trim() || "0", cur);
    const min = toMinor(f.minOrder.trim() || "0", cur);
    const perKm = toMinor(f.perKm.trim() || "0", cur);
    const freeOver = toMinor(f.freeOver.trim() || "0", cur);
    const maxKm = Number(f.maxKm.trim().replace(",", ".") || "0");
    const latS = f.lat.trim();
    const lngS = f.lng.trim();
    const lat = latS === "" ? null : Number(latS);
    const lng = lngS === "" ? null : Number(lngS);
    const wa = f.whatsapp.replace(/\D/g, "");
    const logo = f.logoUrl.trim();
    const cover = f.coverUrl.trim();

    if (!nameEn) return setError("Enter the restaurant name");
    if (!/^[A-Z]{3}$/.test(cur)) return setError("Currency must be a 3-letter code, for example USD");
    if (!Number.isInteger(tables) || tables < 1 || tables > 500) return setError("Tables must be between 1 and 500");
    if (!/^#[0-9a-f]{6}$/i.test(f.accent)) return setError("Accent color must look like #f97316");
    if (!validUrl(logo) || !validUrl(cover)) return setError("Images must be an http(s) link or an uploaded file");
    if (!f.dineIn && !f.delivery) return setError("Enable dine-in or delivery so guests can order");
    if (!f.payCash && !f.payCard) return setError("Enable at least one payment method");
    if (f.vat.trim() === "" || !Number.isFinite(vat) || vat < 0 || vat > 100) return setError("VAT must be between 0 and 100");
    if (fee === null || min === null || perKm === null || freeOver === null) {
      return setError("Enter valid amounts for the delivery fees and minimums");
    }
    if (!Number.isFinite(maxKm) || maxKm < 0 || maxKm > 500) return setError("Maximum distance must be between 0 and 500 km");
    if ((lat === null) !== (lng === null)) return setError("Set both latitude and longitude, or leave both empty");
    if (lat !== null && lng !== null) {
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) return setError("Latitude must be between -90 and 90");
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) return setError("Longitude must be between -180 and 180");
    }
    if ((perKm > 0 || maxKm > 0) && lat === null) {
      return setError("Set the restaurant location to use distance-based pricing or a delivery radius");
    }
    if (wa && (wa.length < 6 || wa.length > 15)) return setError("WhatsApp number needs 6 to 15 digits with country code");

    const body: RestaurantPatch = {
      name: { en: nameEn, ar: f.nameAr.trim() },
      description: { en: f.descEn.trim(), ar: f.descAr.trim() },
      defaultLang: f.defaultLang,
      currency: cur,
      tableCount: tables,
      isActive: f.isActive,
      accentColor: f.accent,
      logoUrl: logo,
      coverUrl: cover,
      dineInEnabled: f.dineIn,
      deliveryEnabled: f.delivery,
      deliveryFeeMinor: fee,
      minDeliveryOrderMinor: min,
      deliveryPerKmMinor: perKm,
      freeDeliveryOverMinor: freeOver,
      maxDeliveryKm: maxKm,
      locationLat: lat,
      locationLng: lng,
      whatsappNumber: wa,
      paymentCash: f.payCash,
      paymentCard: f.payCard,
      vatBps: Math.round(vat * 100),
      pricesIncludeVat: f.inclVat,
    };

    setBusy(true);
    setError(null);
    try {
      const saved = await patchRestaurant(restaurant._id, body);
      const next = init({ ...restaurant, ...saved });
      setF(next);
      setBase(next);
      toast("Settings saved");
    } catch (e) {
      setError(apiError(e, "Couldn't save settings"));
    } finally {
      setBusy(false);
    }
  };

  const colorOk = /^#[0-9a-f]{6}$/i.test(f.accent);

  return (
    <>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-muted">Changes apply to your public menu after you save.</p>

      <div className="mt-6 space-y-4">
        <Section i={0} title="Restaurant">
          <Field
            className="sm:col-span-2"
            label="Menu link"
            icon={Link2}
            readOnly
            value={`${window.location.origin}/r/${restaurant.slug}`}
            hint="Your QR codes point here, so it can't be changed."
          />
          <Field label="Name (English)" icon={Store} maxLength={80} value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
          <Field label="Name (Arabic)" dir="rtl" maxLength={80} value={f.nameAr} onChange={(e) => set("nameAr", e.target.value)} />
          <TextAreaField label="Description (English)" maxLength={300} value={f.descEn} onChange={(e) => set("descEn", e.target.value)} />
          <TextAreaField label="Description (Arabic)" dir="rtl" maxLength={300} value={f.descAr} onChange={(e) => set("descAr", e.target.value)} />
          <SelectField label="Default language" value={f.defaultLang} onChange={(e) => set("defaultLang", e.target.value as "en" | "ar")}>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </SelectField>
          <Field
            label="Currency"
            icon={Coins}
            maxLength={3}
            autoComplete="off"
            hint="Changing it doesn't convert your prices."
            value={f.currency}
            onChange={(e) => set("currency", e.target.value.toUpperCase())}
          />
          <div className="sm:col-span-2">
            <ToggleRow
              label="Menu is public"
              hint="Turn off to hide the whole menu from guests"
              checked={f.isActive}
              onChange={(v) => set("isActive", v)}
            />
          </div>
        </Section>

        <Section i={1} title="Branding" hint="Uploaded images are applied when you save.">
          <Field
            label="Accent color"
            icon={Palette}
            maxLength={7}
            autoComplete="off"
            value={f.accent}
            onChange={(e) => set("accent", e.target.value)}
            trailing={
              <input
                type="color"
                aria-label="Pick accent color"
                value={colorOk ? f.accent.toLowerCase() : "#f97316"}
                onChange={(e) => set("accent", e.target.value)}
                className="me-1 h-9 w-9 cursor-pointer rounded-full border-0 bg-transparent p-0"
              />
            }
          />
          <div className="hidden sm:block" />
          <ImageField label="Logo" value={f.logoUrl} onChange={(v) => set("logoUrl", v)} />
          <ImageField label="Cover image" wide value={f.coverUrl} onChange={(v) => set("coverUrl", v)} />
        </Section>

        <Section i={2} title="Ordering" hint="Guests choose between the types you enable.">
          <div className="sm:col-span-2">
            <ToggleRow label="Dine-in orders" hint="Guests scan the table QR code" checked={f.dineIn} onChange={(v) => set("dineIn", v)} />
            <ToggleRow label="Delivery orders" hint="Paid on delivery" checked={f.delivery} onChange={(v) => set("delivery", v)} />
          </div>
          <Field
            label="Number of tables"
            icon={Armchair}
            inputMode="numeric"
            maxLength={3}
            value={f.tableCount}
            onChange={(e) => set("tableCount", e.target.value.replace(/\D/g, ""))}
          />
          <Field
            label="WhatsApp number"
            icon={MessageCircle}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            hint="With country code, for example 96170123456."
            value={f.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
          />
        </Section>

        <Section i={3} title="Payment" hint="Guests pay in person. You mark each order as paid on the Orders page.">
          <div className="sm:col-span-2">
            <ToggleRow label="Cash" hint="At the table, or to the driver" checked={f.payCash} onChange={(v) => set("payCash", v)} />
            <ToggleRow
              label="Card machine (Visa, Mastercard)"
              hint="On your card terminal, or the driver's"
              checked={f.payCard}
              onChange={(v) => set("payCard", v)}
            />
          </div>
        </Section>

        <Section
          i={4}
          title="Delivery pricing"
          hint="Fee = base fee + price per km × distance (rounded up). Leave price per km at 0 for a flat fee."
        >
          <Field label="Base delivery fee" icon={Coins} inputMode="decimal" disabled={!f.delivery} value={f.fee} onChange={(e) => set("fee", e.target.value)} />
          <Field label="Price per km" icon={Ruler} inputMode="decimal" disabled={!f.delivery} value={f.perKm} onChange={(e) => set("perKm", e.target.value)} />
          <Field label="Minimum delivery order" icon={Coins} inputMode="decimal" disabled={!f.delivery} value={f.minOrder} onChange={(e) => set("minOrder", e.target.value)} />
          <Field
            label="Free delivery over"
            icon={Coins}
            inputMode="decimal"
            disabled={!f.delivery}
            hint="0 = never free"
            value={f.freeOver}
            onChange={(e) => set("freeOver", e.target.value)}
          />
          <Field
            label="Maximum distance (km)"
            icon={Ruler}
            inputMode="decimal"
            disabled={!f.delivery}
            hint="0 = no limit. Straight-line distance."
            value={f.maxKm}
            onChange={(e) => set("maxKm", e.target.value)}
          />
          <div className="hidden sm:block" />
          <Field label="Restaurant latitude" icon={MapPin} inputMode="decimal" autoComplete="off" value={f.lat} onChange={(e) => set("lat", e.target.value)} />
          <Field label="Restaurant longitude" icon={MapPin} inputMode="decimal" autoComplete="off" value={f.lng} onChange={(e) => set("lng", e.target.value)} />
          <div className="sm:col-span-2">
            <Button variant="soft" disabled={locating} onClick={locate}>
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <LocateFixed className="h-4 w-4" aria-hidden />
              )}
              Use my current location
            </Button>
            <p className="mt-1.5 text-xs text-muted">
              Stand at the restaurant and tap this. Guests must share their own location when distance pricing is on.
              The location is public on your menu.
            </p>
          </div>
        </Section>

        <Section i={5} title="Tax">
          <Field
            label="VAT rate (%)"
            icon={Percent}
            inputMode="decimal"
            value={f.vat}
            onChange={(e) => set("vat", e.target.value)}
          />
          <div className="self-end">
            <ToggleRow
              label="Prices include VAT"
              hint="Off: VAT is added at checkout"
              checked={f.inclVat}
              onChange={(v) => set("inclVat", v)}
            />
          </div>
        </Section>
      </div>

      <AnimatePresence>
        {(dirty || error) && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={spring}
            className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-4 md:start-64 md:px-8"
          >
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-3 shadow-lift">
              <p
                role={error ? "alert" : "status"}
                className={cn("text-sm font-medium", error ? "text-red-700 dark:text-red-300" : "text-muted")}
              >
                {error ?? "You have unsaved changes"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setF(base);
                    setError(null);
                  }}
                >
                  Discard
                </Button>
                <Button disabled={busy} onClick={() => void save()}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                  Save changes
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { data, error, reload } = useAdminRestaurant(user?.role === "admin" ? user.restaurant?._id : undefined);

  if (user?.role !== "admin") return <ErrorState title="Admins only" hint="Ask the owner to change these settings." />;
  if (!user.restaurant) return <ErrorState title="No restaurant" hint="This account isn't linked to a restaurant." />;
  if (error && !data) {
    return (
      <ErrorState title="Couldn't load settings" hint={apiError(error)} action={<Button onClick={reload}>Try again</Button>} />
    );
  }
  if (!data) {
    return (
      <div role="status" aria-label="Loading settings" className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-72 w-full rounded-card" />
        <Skeleton className="h-48 w-full rounded-card" />
      </div>
    );
  }
  return (
    <PageTransition>
      <SettingsForm restaurant={data} />
    </PageTransition>
  );
}