import { Coins, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ITEM_TAGS, type AdminCategory, type AdminItem, type ItemBody } from "../../lib/adminApi";
import { apiError } from "../../lib/api";
import { cn } from "../../lib/cn";
import { fromMinor, toMinor } from "../../lib/format";
import { dict } from "../../lib/i18n";
import { Button } from "../ui/Button";
import Field from "../ui/Field";
import { SelectField, TextAreaField, ToggleRow } from "../ui/FormControls";
import ImageField from "../ui/ImageField";
import Modal from "../ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  item: AdminItem | null;
  categories: AdminCategory[];
  defaultCategory: string;
  currency: string;
  onSave: (body: ItemBody) => Promise<void>;
}

interface Form {
  category: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  price: string;
  imageUrl: string;
  tags: string[];
  isAvailable: boolean;
}

const validUrl = (s: string) => s === "" || /^https?:\/\//i.test(s) || s.startsWith("/uploads/");

function ItemForm({ item, categories, defaultCategory, currency, onSave, onClose }: Omit<Props, "open">) {
  const [f, setF] = useState<Form>(() => ({
    category: item?.category ?? defaultCategory,
    nameEn: item?.name.en ?? "",
    nameAr: item?.name.ar ?? "",
    descEn: item?.description?.en ?? "",
    descAr: item?.description?.ar ?? "",
    price: item ? fromMinor(item.priceMinor, currency) : "",
    imageUrl: item?.imageUrl ?? "",
    tags: item?.tags ?? [],
    isAvailable: item?.isAvailable ?? true,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const img = f.imageUrl.trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const nameEn = f.nameEn.trim();
    const priceMinor = toMinor(f.price, currency);
    if (!nameEn) return setError("Enter the item name");
    if (!f.category) return setError("Choose a category");
    if (priceMinor === null) return setError("Enter a valid price, for example 12.50");
    if (!validUrl(img)) return setError("Image must be an http(s) link or an uploaded file");

    setBusy(true);
    setError(null);
    try {
      await onSave({
        category: f.category,
        name: { en: nameEn, ar: f.nameAr.trim() },
        description: { en: f.descEn.trim(), ar: f.descAr.trim() },
        priceMinor,
        imageUrl: img,
        tags: f.tags,
        isAvailable: f.isAvailable,
      });
    } catch (err) {
      setError(apiError(err, "Couldn't save the item"));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name (English)" required maxLength={100} value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
        <Field label="Name (Arabic)" dir="rtl" maxLength={100} value={f.nameAr} onChange={(e) => set("nameAr", e.target.value)} />
        <TextAreaField label="Description (English)" maxLength={400} value={f.descEn} onChange={(e) => set("descEn", e.target.value)} />
        <TextAreaField label="Description (Arabic)" dir="rtl" maxLength={400} value={f.descAr} onChange={(e) => set("descAr", e.target.value)} />
        <Field
          label="Price"
          icon={Coins}
          inputMode="decimal"
          autoComplete="off"
          hint={`In ${currency}, for example 12.50`}
          value={f.price}
          onChange={(e) => set("price", e.target.value)}
        />
        <SelectField label="Category" value={f.category} onChange={(e) => set("category", e.target.value)}>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name.en}
            </option>
          ))}
        </SelectField>

        <ImageField className="sm:col-span-2" label="Photo" value={f.imageUrl} onChange={(v) => set("imageUrl", v)} />

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-sm font-semibold">Tags</legend>
          <div className="flex flex-wrap gap-2">
            {ITEM_TAGS.map((tag) => {
              const on = f.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("tags", on ? f.tags.filter((x) => x !== tag) : [...f.tags, tag])}
                  className={cn(
                    "h-10 rounded-full px-4 text-sm font-semibold transition-colors",
                    on ? "bg-brand text-white" : "bg-line/60 text-muted hover:text-ink",
                  )}
                >
                  {dict.en.tags[tag]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="sm:col-span-2">
          <ToggleRow
            label="Available"
            hint="Turn off to show it as sold out"
            checked={f.isAvailable}
            onChange={(v) => set("isAvailable", v)}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-field bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="sticky -bottom-4 -mx-5 mt-6 flex justify-end gap-2 border-t border-line bg-bg px-5 py-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          {item ? "Save changes" : "Add item"}
        </Button>
      </div>
    </form>
  );
}

export default function ItemEditor({ open, onClose, ...rest }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={rest.item ? "Edit item" : "New item"} wide>
      <ItemForm key={rest.item?._id ?? "new"} onClose={onClose} {...rest} />
    </Modal>
  );
}