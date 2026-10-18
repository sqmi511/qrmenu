import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  clearLabel: string;
}

export default function SearchInput({ value, onChange, placeholder, clearLabel }: Props) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        className="h-12 w-full rounded-field border border-line bg-surface ps-12 pe-12 text-base outline-none transition-shadow placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute end-1 top-0 flex h-full items-center">
        <AnimatePresence>
          {value && (
            <motion.button
              type="button"
              aria-label={clearLabel}
              onClick={() => onChange("")}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
              className="grid h-11 w-11 place-items-center rounded-full text-muted hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}