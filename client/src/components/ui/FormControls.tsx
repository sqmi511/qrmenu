import { useId, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import Switch from "./Switch";

const control =
  "w-full rounded-field border border-line bg-surface text-base outline-none transition-shadow placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand";

export function TextAreaField({
  label,
  hint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <textarea id={id} rows={3} className={cn(control, "resize-none px-4 py-3")} {...props} />
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SelectField({
  label,
  hint,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <select id={id} className={cn(control, "h-12 px-3")} {...props}>
        {children}
      </select>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}