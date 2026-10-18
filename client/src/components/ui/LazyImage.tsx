import { UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { assetUrl } from "../../lib/assets";
import { cn } from "../../lib/cn";

interface Props {
  src?: string;
  alt?: string;
  className?: string;
  /** placeholder icon; null hides it */
  icon?: LucideIcon | null;
}

// Use key={src} on the caller so state resets when src changes.
export default function LazyImage({ src, alt = "", className, icon: Icon = UtensilsCrossed }: Props) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const showImg = !!src && state !== "error";

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {Icon && state !== "loaded" && (
        <div className="absolute inset-0 grid place-items-center text-brand-ink/60">
          <Icon className="h-1/3 w-1/3" aria-hidden />
        </div>
      )}
      {showImg && (
        <img
          src={assetUrl(src)}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={cn(
            "h-full w-full object-cover transition duration-400 motion-reduce:transition-none",
            state === "loaded" ? "scale-100 opacity-100" : "scale-105 opacity-0",
          )}
        />
      )}
    </div>
  );
}