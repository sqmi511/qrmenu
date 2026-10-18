import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/cn";
import { spring } from "../../lib/motion";

export type Variant = "primary" | "soft" | "ghost" | "glass" | "danger";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold select-none transition-colors disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-soft hover:brightness-110",
  soft: "bg-brand-soft text-brand-ink hover:brightness-95",
  ghost: "text-ink hover:bg-line/60",
  glass: "bg-black/30 text-white backdrop-blur-md hover:bg-black/40",
  danger: "bg-red-600 text-white shadow-soft hover:brightness-110",
};

interface Props extends HTMLMotionProps<"button"> {
  variant?: Variant;
}

export function Button({ variant = "primary", className, ...props }: Props) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      transition={spring}
      className={cn(base, "h-11 px-5 text-sm", variants[variant], className)}
      {...props}
    />
  );
}

export function IconButton({
  variant = "ghost",
  className,
  ...props
}: Props & { "aria-label": string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      transition={spring}
      className={cn(base, "h-11 w-11", variants[variant], className)}
      {...props}
    />
  );
}