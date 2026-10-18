import { Reorder, useDragControls } from "framer-motion";
import { Check, GripVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { AdminCategory } from "../../lib/adminApi";
import { Button, IconButton } from "../ui/Button";
import Field from "../ui/Field";
import Modal from "../ui/Modal";
import Switch from "../ui/Switch";

export interface CategoryActions {
  create: (en: string, ar: string) => Promise<boolean>;
  rename: (c: AdminCategory, en: string, ar: string) => Promise<boolean>;
  toggle: (c: AdminCategory, v: boolean) => void;
  remove: (c: AdminCategory) => void;
  reorder: (next: AdminCategory[]) => void;
  persist: () => void;
  move: (c: AdminCategory, dir: -1 | 1) => void;
}

const inputCls =
  "h-11 min-w-0 flex-1 basis-32 rounded-field border border-line bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand";

function AddForm({ onCreate }: { onCreate: CategoryActions["create"] }) {
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!en.trim() || busy) return;
    setBusy(true);
    const ok = await onCreate(en.trim(), ar.trim());
    setBusy(false);
    if (ok) {
      setEn("");
      setAr("");
    }
  };

  return (
    <form onSubmit={submit} className="mb-5 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <Field label="Name (English)" maxLength={60} value={en} onChange={(e) => setEn(e.target.value)} />
      <Field label="Name (Arabic)" dir="rtl" maxLength={60} value={ar} onChange={(e) => setAr(e.target.value)} />
      <Button type="submit" disabled={busy || !en.trim()} className="h-12">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          <Plus className="h-4 w-4" aria-hidden />
        )}
        Add
      </Button>
    </form>
  );
}

function CatRow({ cat, count, a }: { cat: AdminCategory; count: number; a: CategoryActions }) {
  const controls = useDragControls();
  const [editing, setEditing] = useState(false);
  const [en, setEn] = useState(cat.name.en);
  const [ar, setAr] = useState(cat.name.ar ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!en.trim() || busy) return;
    setBusy(true);
    const ok = await a.rename(cat, en.trim(), ar.trim());
    setBusy(false);
    if (ok) setEditing(false);
  };
  const cancel = () => {
    setEn(cat.name.en);
    setAr(cat.name.ar ?? "");
    setEditing(false);
  };

  return (
    <Reorder.Item
      as="li"
      value={cat}
      dragListener={false}
      dragControls={controls}
      onDragEnd={a.persist}
      whileDrag={{ scale: 1.02 }}
      className="relative flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-line bg-surface p-3"
    >
      <button
        type="button"
        aria-label={`Reorder ${cat.name.en}. Drag, or press arrow up or down.`}
        onPointerDown={(e) => controls.start(e)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            a.move(cat, e.key === "ArrowUp" ? -1 : 1);
          }
        }}
        className="grid h-11 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-field text-muted hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" aria-hidden />
      </button>

      {editing ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input aria-label="Name (English)" maxLength={60} value={en} onChange={(e) => setEn(e.target.value)} className={inputCls} />
          <input aria-label="Name (Arabic)" dir="rtl" maxLength={60} value={ar} onChange={(e) => setAr(e.target.value)} className={inputCls} />
          <div className="flex gap-1">
            <IconButton aria-label="Save name" variant="soft" disabled={busy || !en.trim()} onClick={() => void save()}>
              <Check className="h-5 w-5" aria-hidden />
            </IconButton>
            <IconButton aria-label="Cancel" onClick={cancel}>
              <X className="h-5 w-5" aria-hidden />
            </IconButton>
          </div>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1 basis-32">
            <p className="truncate font-bold">{cat.name.en}</p>
            {cat.name.ar && (
              <p lang="ar" className="truncate text-sm text-muted">
                {cat.name.ar}
              </p>
            )}
            <p className="text-xs text-muted">
              {count} {count === 1 ? "item" : "items"}
              {!cat.isActive && " · hidden from guests"}
            </p>
          </div>
          <div className="ms-auto flex items-center gap-1">
            <span className="me-2">
              <Switch checked={cat.isActive} onChange={(v) => a.toggle(cat, v)} label={`Show ${cat.name.en} to guests`} />
            </span>
            <IconButton aria-label={`Rename ${cat.name.en}`} onClick={() => setEditing(true)}>
              <Pencil className="h-5 w-5" aria-hidden />
            </IconButton>
            <IconButton aria-label={`Delete ${cat.name.en}`} onClick={() => a.remove(cat)}>
              <Trash2 className="h-5 w-5" aria-hidden />
            </IconButton>
          </div>
        </>
      )}
    </Reorder.Item>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  categories: AdminCategory[];
  counts: Record<string, number>;
  a: CategoryActions;
}

export default function CategoryManager({ open, onClose, categories, counts, a }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Categories" wide>
      <AddForm onCreate={a.create} />
      {categories.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No categories yet. Add your first one above.</p>
      ) : (
        <Reorder.Group axis="y" values={categories} onReorder={a.reorder} as="ul" className="space-y-2">
          {categories.map((c) => (
            <CatRow key={c._id} cat={c} count={counts[c._id] ?? 0} a={a} />
          ))}
        </Reorder.Group>
      )}
    </Modal>
  );
}