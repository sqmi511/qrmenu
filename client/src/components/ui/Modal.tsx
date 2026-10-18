import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import { spring } from "../../lib/motion";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: ReactNode;
}

const FOCUSABLE =
  "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";

// open modals, top-most last: only the top one reacts to Esc/Tab
const stack: symbol[] = [];

export default function Modal({ open, onClose, title, wide, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const token = Symbol();
    stack.push(token);
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const els = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(token), 1);
      document.body.style.overflow = prevOverflow;
      opener?.focus();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
        >
          <div aria-hidden onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={spring}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col rounded-t-card bg-bg shadow-lift outline-none sm:rounded-card",
              wide ? "sm:max-w-2xl" : "sm:max-w-md",
            )}
          >
            <header className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
              <h2 className="text-lg font-extrabold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-11 w-11 place-items-center rounded-full hover:bg-line/60"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}