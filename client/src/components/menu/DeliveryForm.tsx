import { LocateFixed, Loader2, MapPin, Phone, StickyNote, User, X } from "lucide-react";
import { useId, useState } from "react";
import { useCT } from "../../lib/i18n-checkout";
import { mapsUrl } from "../../lib/whatsapp";
import type { CustomerInput } from "../../lib/types";
import { Button } from "../ui/Button";
import Field from "../ui/Field";

interface Props {
  value: CustomerInput;
  onChange: (v: CustomerInput) => void;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export default function DeliveryForm({ value, onChange }: Props) {
  const ct = useCT();
  const addrId = useId();
  const [geo, setGeo] = useState<"idle" | "loading" | "failed">("idle");

  const set = <K extends keyof CustomerInput>(k: K, v: CustomerInput[K]) => onChange({ ...value, [k]: v });

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setGeo("failed");
      return;
    }
    setGeo("loading");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onChange({ ...value, location: { lat: round6(p.coords.latitude), lng: round6(p.coords.longitude) } });
        setGeo("idle");
      },
      () => setGeo("failed"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="space-y-4">
      <Field
        label={ct.name}
        icon={User}
        autoComplete="name"
        maxLength={80}
        value={value.name}
        onChange={(e) => set("name", e.target.value)}
      />
      <Field
        label={ct.phone}
        icon={Phone}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={20}
        hint={ct.phoneHint}
        value={value.phone}
        onChange={(e) => set("phone", e.target.value.replace(/[^\d+\s()-]/g, ""))}
      />

      <div>
        <label htmlFor={addrId} className="mb-1.5 block text-sm font-semibold">
          {ct.address}
        </label>
        <textarea
          id={addrId}
          rows={3}
          maxLength={300}
          autoComplete="street-address"
          value={value.address}
          onChange={(e) => set("address", e.target.value)}
          className="w-full resize-none rounded-field border border-line bg-surface px-4 py-3 text-base outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand"
        />
        <p className="mt-1.5 text-xs text-muted">{ct.addressHint}</p>
      </div>

      <div>
        {value.location ? (
          <div className="flex items-center justify-between gap-2 rounded-field bg-brand-soft px-4 py-2">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-brand-ink">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{ct.locationAttached}</span>
              <a
                href={mapsUrl(value.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 underline underline-offset-2"
              >
                {ct.viewOnMap}
              </a>
            </div>
            <button
              type="button"
              aria-label={ct.removeLocation}
              onClick={() => set("location", null)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-brand-ink hover:bg-brand/15"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <Button variant="soft" className="w-full" disabled={geo === "loading"} onClick={locate}>
            {geo === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <LocateFixed className="h-4 w-4" aria-hidden />
            )}
            {geo === "loading" ? ct.locating : ct.useLocation}
          </Button>
        )}
        {geo === "failed" && !value.location && (
          <p role="status" className="mt-2 text-xs text-muted">
            {ct.locationFailed}
          </p>
        )}
      </div>

      <Field
        label={ct.deliveryNotes}
        icon={StickyNote}
        maxLength={200}
        value={value.notes}
        onChange={(e) => set("notes", e.target.value)}
      />
    </div>
  );
}