import { Loader2, Store } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import { patchRestaurant, type AdminRestaurant } from "../../lib/adminApi";
import { apiError } from "../../lib/api";
import { useAdminRestaurant } from "../../lib/useAdmin";
import { Button } from "../ui/Button";
import { ToggleRow } from "../ui/FormControls";

function Form({ restaurant }: { restaurant: AdminRestaurant }) {
  const { toast } = useToast();
  const [base, setBase] = useState(restaurant.takeawayEnabled ?? false);
  const [on, setOn] = useState(base);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await patchRestaurant(restaurant._id, { takeawayEnabled: on });
      const next = saved.takeawayEnabled ?? on;
      setBase(next);
      setOn(next);
      toast(next ? "Takeaway turned on" : "Takeaway turned off");
    } catch (e) {
      setError(apiError(e, "Couldn't save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 rounded-card border border-line bg-surface p-5 shadow-soft">
      <h2 className="font-bold">Takeaway</h2>
      <p className="mt-0.5 text-sm text-muted">
        Guests order for pickup with their name and phone, no table or address. Paid at pickup. Saved separately from
        the settings above.
      </p>
      <div className="mt-4">
        <ToggleRow
          label="Takeaway orders"
          hint="Adds a Takeaway option next to dine-in and delivery"
          checked={on}
          onChange={setOn}
        />
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-field bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <Button disabled={on === base || busy} onClick={() => void save()}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <Store className="h-4 w-4" aria-hidden />
          )}
          Save takeaway
        </Button>
      </div>
    </section>
  );
}

export default function TakeawaySettings() {
  const { user } = useAuth();
  const { data } = useAdminRestaurant(user?.role === "admin" ? user.restaurant?._id : undefined);
  if (!data) return null; // staff, loading and errors are handled by the Settings form above
  return <Form restaurant={data} />;
}