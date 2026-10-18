import { Loader2, MapPin, Phone, ReceiptText, Type } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import { patchRestaurant, type AdminRestaurant } from "../../lib/adminApi";
import { apiError } from "../../lib/api";
import { useAdminRestaurant } from "../../lib/useAdmin";
import { Button } from "../ui/Button";
import Field from "../ui/Field";
import { TextAreaField } from "../ui/FormControls";

const init = (r: AdminRestaurant) => ({
  address: r.address ?? "",
  phone: r.phone ?? "",
  vatNumber: r.vatNumber ?? "",
  footer: r.invoiceFooter ?? "",
});

function Form({ restaurant }: { restaurant: AdminRestaurant }) {
  const { toast } = useToast();
  const [base, setBase] = useState(() => init(restaurant));
  const [f, setF] = useState(base);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(f) !== JSON.stringify(base);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await patchRestaurant(restaurant._id, {
        address: f.address.trim(),
        phone: f.phone.trim(),
        vatNumber: f.vatNumber.trim(),
        invoiceFooter: f.footer.trim(),
      });
      const next = init(saved);
      setBase(next);
      setF(next);
      toast("Business details saved");
    } catch (e) {
      setError(apiError(e, "Couldn't save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 rounded-card border border-line bg-surface p-5 shadow-soft">
      <h2 className="font-bold">Business details</h2>
      <p className="mt-0.5 text-sm text-muted">Printed at the top and bottom of every invoice. Saved separately from the settings above.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <TextAreaField
          className="sm:col-span-2"
          label="Address"
          maxLength={200}
          value={f.address}
          onChange={(e) => setF({ ...f, address: e.target.value })}
        />
        <Field
          label="Phone"
          icon={Phone}
          type="tel"
          inputMode="tel"
          maxLength={30}
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
        />
        <Field
          label="VAT registration number"
          icon={ReceiptText}
          maxLength={30}
          autoComplete="off"
          value={f.vatNumber}
          onChange={(e) => setF({ ...f, vatNumber: e.target.value })}
        />
        <Field
          className="sm:col-span-2"
          label="Invoice footer"
          icon={Type}
          maxLength={200}
          hint="For example: Thank you, see you again. Leave empty for the default."
          value={f.footer}
          onChange={(e) => setF({ ...f, footer: e.target.value })}
        />
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-field bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <Button disabled={!dirty || busy} onClick={() => void save()}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <MapPin className="h-4 w-4" aria-hidden />
          )}
          Save details
        </Button>
      </div>
    </section>
  );
}

export default function BusinessDetails() {
  const { user } = useAuth();
  const { data } = useAdminRestaurant(user?.role === "admin" ? user.restaurant?._id : undefined);
  if (!data) return null; // staff, loading and errors are handled by the Settings form above
  return <Form restaurant={data} />;
}