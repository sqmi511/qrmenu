import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { spring } from "../../lib/motion";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}

export default function Switch({ checked, onChange, label, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors before:absolute before:-inset-2 disabled:opacity-50",
        checked ? "bg-brand" : "bg-line",
      )}
    >
      <motion.span
        layout
        transition={spring}
        className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow-soft", checked ? "end-1" : "start-1")}
      />
    </button>
  );
}