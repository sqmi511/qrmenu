import type { Variants } from "framer-motion";

export const spring = { type: "spring", stiffness: 380, damping: 30 } as const;

// custom = item index, for a capped stagger of 40ms
export const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...spring, delay: Math.min(i, 8) * 0.04 },
  }),
};