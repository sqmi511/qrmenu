import { Loader2, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import { api, apiError } from "../../lib/api";
import { Button } from "../ui/Button";
import Field from "../ui/Field";

export default function ChangePassword({ urgent }: { urgent?: boolean }) {
  const { refresh } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (next.length < 10) return setError("The new password needs at least 10 characters");
    if (next !== again) return setError("The two new passwords don't match");
    setBusy(true);
    setError(null);
    try {
      await api.post("/account/password", { current, password: next });
      setCurrent("");
      setNext("");
      setAgain("");
      toast("Password changed");
      await refresh();
    } catch (err) {
      setError(apiError(err, "Couldn't change the password"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="password" className="rounded-card border border-line bg-surface p-5 shadow-soft">
      <h2 className="font-bold">Password</h2>
      <p className="mt-0.5 text-sm text-muted">
        {urgent ? "You are using a temporary password. Choose your own now." : "Change the password you sign in with."}
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Current password" icon={Lock} type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Field label="New password" icon={Lock} type="password" autoComplete="new-password" required minLength={10} hint="At least 10 characters" value={next} onChange={(e) => setNext(e.target.value)} />
        <Field label="Repeat new password" icon={Lock} type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} />
        {error && (
          <p role="alert" className="rounded-field bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 sm:col-span-3 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="sm:col-span-3">
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
            Change password
          </Button>
        </div>
      </form>
    </section>
  );
}