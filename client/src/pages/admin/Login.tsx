import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, Mail, QrCode } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import PageTransition from "../../components/PageTransition";
import { Button, IconButton } from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import PageSpinner from "../../components/ui/Spinner";
import { ThemeToggle } from "../../components/ui/Toggles";
import { useAuth } from "../../context/auth-context";
import { apiError } from "../../lib/api";
import { spring } from "../../lib/motion";

export default function Login() {
  const { user, ready, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stateFrom = (location.state as { from?: string } | null)?.from;
  const from = stateFrom?.startsWith("/admin") ? stateFrom : "/admin";

  if (!ready) return <PageSpinner />;
  if (user) return <Navigate to={user.role === "super" ? "/super" : from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(apiError(err));
      setBusy(false);
    }
  };

  return (
    <PageTransition>
      <div className="grid min-h-dvh lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-linear-to-br from-brand to-ember-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden className="absolute -end-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden className="absolute -bottom-32 -start-16 h-96 w-96 rounded-full bg-black/20 blur-3xl" />
          <span className="relative grid h-14 w-14 place-items-center rounded-card bg-white/15 backdrop-blur">
            <QrCode className="h-7 w-7" aria-hidden />
          </span>
          <div className="relative">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Your menu, one scan away.</h2>
            <p className="mt-3 max-w-sm text-white/80">Menus, QR codes and live orders for your restaurant.</p>
          </div>
          <p className="relative text-sm text-white/60">QR Menu</p>
        </div>

        <div className="relative grid place-items-center px-6 py-16">
          <div className="absolute end-4 top-4">
            <ThemeToggle />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="w-full max-w-sm"
          >
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted">Sign in to manage your menu and orders.</p>

            <form onSubmit={submit} className="mt-8">
              <div className="space-y-4">
                <Field
                  label="Email"
                  icon={Mail}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.com"
                />
                <Field
                  label="Password"
                  icon={Lock}
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  trailing={
                    <IconButton aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((v) => !v)}>
                      {showPw ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                    </IconButton>
                  }
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 rounded-field bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <Button type="submit" disabled={busy} className="mt-6 h-12 w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              Restaurant accounts are created by invitation. Contact us to get yours.
            </p>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}