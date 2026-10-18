import { LogOut, ShieldCheck } from "lucide-react";
import { Outlet } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ThemeToggle } from "../components/ui/Toggles";
import { useAuth } from "../context/auth-context";

export default function SuperLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-field bg-brand text-white shadow-soft">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <span className="truncate font-extrabold">Super admin</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="hidden max-w-48 truncate text-xs text-muted sm:block">{user?.email}</span>
            <ThemeToggle />
            <Button variant="soft" className="h-10 px-4" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 pb-16 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}