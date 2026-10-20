import { Banknote, CreditCard, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { useCT } from "../../lib/i18n-checkout";
import type { OrderType, PaymentMethod } from "../../lib/types";

interface Props {
  methods: PaymentMethod[];
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  type: OrderType;
}

export default function PaymentPicker({ methods, value, onChange, type }: Props) {
  const ct = useCT();
  const meta: Record<PaymentMethod, { label: string; hint: string; icon: LucideIcon }> = {
    cash: { label: ct.payCash, hint: ct.payCashHint(type), icon: Banknote },
    card: { label: ct.payCard, hint: ct.payCardHint(type), icon: CreditCard },
  };

  return (
    <div>
      <p id="pay-label" className="mb-1.5 text-sm font-semibold">
        {ct.payment}
      </p>
      <div role="radiogroup" aria-labelledby="pay-label" className="grid gap-2">
        {methods.map((m) => {
          const M = meta[m];
          const active = m === value;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(m)}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-field border p-3 text-start transition-colors",
                active ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-muted",
              )}
            >
              <M.icon className={cn("h-5 w-5 shrink-0", active ? "text-brand-ink" : "text-muted")} aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-bold">{M.label}</span>
                <span className="block text-xs text-muted">{M.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}