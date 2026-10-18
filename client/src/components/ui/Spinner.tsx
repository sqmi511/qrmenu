import { Loader2 } from "lucide-react";

export default function PageSpinner() {
  return (
    <div role="status" aria-label="Loading" className="grid min-h-dvh place-items-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
    </div>
  );
}