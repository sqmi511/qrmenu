import { Loader2 } from "lucide-react";
import { Button } from "./Button";
import Modal from "./Modal";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = "Delete", busy, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" disabled={busy} onClick={onConfirm}>
          {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}