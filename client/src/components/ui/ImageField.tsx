import { Loader2, Upload } from "lucide-react";
import { useId, useRef, useState, type ChangeEvent } from "react";
import { apiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { uploadImage } from "../../lib/upload";
import { Button } from "./Button";
import LazyImage from "./LazyImage";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  className?: string;
}

const valid = (s: string) => s === "" || /^https?:\/\//i.test(s) || s.startsWith("/uploads/");

export default function ImageField({ label, value, onChange, wide, className }: Props) {
  const id = useId();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const v = value.trim();

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // allows picking the same file again
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Choose an image file");
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadImage(f));
    } catch (err) {
      setError(apiError(err, "Couldn't upload the image"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <div className="flex items-start gap-3">
        <LazyImage
          key={value}
          src={valid(v) ? v : ""}
          className={cn("shrink-0 rounded-field bg-brand-soft", wide ? "h-16 w-28" : "h-16 w-16")}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode="url"
            autoComplete="off"
            maxLength={500}
            placeholder="https://… or upload"
            className="h-12 w-full rounded-field border border-line bg-surface px-4 text-base outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand"
          />
          <div className="flex gap-2">
            <Button variant="soft" className="h-10" disabled={busy} onClick={() => file.current?.click()}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <Upload className="h-4 w-4" aria-hidden />
              )}
              {busy ? "Uploading…" : "Upload"}
            </Button>
            {value && (
              <Button variant="ghost" className="h-10" disabled={busy} onClick={() => onChange("")}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <input
        ref={file}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => void onPick(e)}
      />
    </div>
  );
}