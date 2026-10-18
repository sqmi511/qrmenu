import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastContext, type ToastTone } from "./toast-context";

interface Item {
  id: number;
  message: string;
  tone: ToastTone;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const next = useRef(0);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = ++next.current;
    setItems((l) => [...l.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setItems((l) => l.filter((i) => i.id !== id)), 2400);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-60 flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence initial={false}>
          {items.map((i) => (
            <motion.div
              key={i.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-bg shadow-lift"
            >
              {i.tone === "success" ? (
                <CircleCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              ) : (
                <TriangleAlert className="h-4 w-4 shrink-0 text-red-400" aria-hidden />
              )}
              <span className="truncate">{i.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}