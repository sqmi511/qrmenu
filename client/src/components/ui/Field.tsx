import type { LucideIcon } from "lucide-react";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  trailing?: ReactNode;
}

export default function Field({ label, icon: Icon, hint, trailing, className, id, ...props }: Props) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
        )}
        <input
          id={fid}
          className={cn(
            "h-12 w-full rounded-field border border-line bg-surface text-base outline-none transition-shadow placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand",
            Icon ? "ps-12" : "ps-4",
            trailing ? "pe-12" : "pe-4",
          )}
          {...props}
        />
        {trailing && <div className="absolute end-1 top-0 flex h-full items-center">{trailing}</div>}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}