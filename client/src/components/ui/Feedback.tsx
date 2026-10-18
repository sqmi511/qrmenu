import { motion } from "framer-motion";
import { TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-field bg-line/80 motion-reduce:animate-none", className)}
    />
  );
}

interface StateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, hint, action }: StateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-live="polite"
      className="flex flex-col items-center gap-3 px-6 py-16 text-center"
    >
      <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand-ink">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
      {action}
    </motion.div>
  );
}

export function ErrorState(props: Omit<StateProps, "icon">) {
  return <EmptyState icon={TriangleAlert} {...props} />;
}