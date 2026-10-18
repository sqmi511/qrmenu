import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "../../lib/cn";
import { spring } from "../../lib/motion";

interface Props {
  items: { id: string; label: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  label: string;
}

export default function CategoryNav({ items, activeId, onSelect, label }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const btns = useRef(new Map<string, HTMLButtonElement>());

  // center the active pill; direction-agnostic (works in RTL)
  useEffect(() => {
    const nav = navRef.current;
    const btn = activeId ? btns.current.get(activeId) : undefined;
    if (!nav || !btn) return;
    const n = nav.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const delta = b.left + b.width / 2 - (n.left + n.width / 2);
    nav.scrollTo({
      left: nav.scrollLeft + delta,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [activeId]);

  return (
    <nav ref={navRef} aria-label={label} className="no-scrollbar relative -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      {items.map((c) => {
        const active = c.id === activeId;
        return (
          <button
            key={c.id}
            ref={(el) => {
              if (el) btns.current.set(c.id, el);
              else btns.current.delete(c.id);
            }}
            type="button"
            aria-current={active ? "true" : undefined}
            onClick={() => onSelect(c.id)}
            className={cn(
              "relative h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
              active ? "text-white" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="cat-pill"
                transition={spring}
                className="absolute inset-0 rounded-full bg-brand shadow-soft"
              />
            )}
            <span className="relative">{c.label}</span>
          </button>
        );
      })}
    </nav>
  );
}