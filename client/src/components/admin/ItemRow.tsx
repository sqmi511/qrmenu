import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { AdminItem } from "../../lib/adminApi";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";
import Badge from "../ui/Badge";
import { IconButton } from "../ui/Button";
import LazyImage from "../ui/LazyImage";
import Switch from "../ui/Switch";

interface Props {
  item: AdminItem;
  currency: string;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
  onMove: (dir: -1 | 1) => void;
  onDragEnd: () => void;
}

export default function ItemRow(p: Props) {
  const controls = useDragControls();
  const { item } = p;

  return (
    <Reorder.Item
      as="li"
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragEnd={p.onDragEnd}
      whileDrag={{ scale: 1.02 }}
      className="relative flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-line bg-surface p-3 shadow-soft"
    >
      <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
        {p.canEdit && (
          <button
            type="button"
            aria-label={`Reorder ${item.name.en}. Drag, or press arrow up or down.`}
            onPointerDown={(e) => controls.start(e)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                p.onMove(e.key === "ArrowUp" ? -1 : 1);
              }
            }}
            className="grid h-11 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-field text-muted hover:text-ink active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5" aria-hidden />
          </button>
        )}
        <LazyImage
          key={item.imageUrl}
          src={item.imageUrl}
          className={cn("h-14 w-14 shrink-0 rounded-xl bg-brand-soft", !item.isAvailable && "grayscale")}
        />
        <div className="min-w-0">
          <p className="truncate font-bold">{item.name.en}</p>
          {item.name.ar && (
            <p lang="ar" className="truncate text-sm text-muted">
              {item.name.ar}
            </p>
          )}
          <p className="text-sm font-extrabold text-brand-ink">{formatMoney(item.priceMinor, p.currency, "en")}</p>
        </div>
      </div>

      <div className="ms-auto flex items-center gap-1">
        {p.canEdit ? (
          <>
            <span className="me-2 flex items-center gap-2 text-xs font-semibold text-muted">
              {item.isAvailable ? "Available" : "Sold out"}
              <Switch checked={item.isAvailable} onChange={p.onToggle} label={`Available: ${item.name.en}`} />
            </span>
            <IconButton aria-label={`Edit ${item.name.en}`} onClick={p.onEdit}>
              <Pencil className="h-5 w-5" aria-hidden />
            </IconButton>
            <IconButton aria-label={`Delete ${item.name.en}`} onClick={p.onDelete}>
              <Trash2 className="h-5 w-5" aria-hidden />
            </IconButton>
          </>
        ) : (
          !item.isAvailable && <Badge>Sold out</Badge>
        )}
      </div>
    </Reorder.Item>
  );
}