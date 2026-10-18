import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export default function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "brand";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "brand" ? "bg-brand-soft text-brand-ink" : "bg-line/60 text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}