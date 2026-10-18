import { motion } from "framer-motion";
import {
  ArrowRight,
  ClipboardList,
  CreditCard,
  ExternalLink,
  History as HistoryIcon,
  LayoutDashboard,
  LogOut,
  QrCode,
  Settings as SettingsIcon,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { Button, IconButton } from "../components/ui/Button";
import { ThemeToggle } from "../components/ui/Toggles";
import { type AuthUser, useAuth } from "../context/auth-context";
import { cn } from "../lib/cn";
import { pick } from "../lib/i18n";
import { spring } from "../lib/motion";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  adminOnly?: boolean;
  /** sidebar only; reached from the dashboard or the header on phones */
  hideOnMobile?: boolean;
}

const links: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/history", label: "History", icon: HistoryIcon, hideOnMobile: true },
  { to: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/admin/qr", label: "QR", icon: QrCode },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon, adminOnly: true },
  { to: "/admin/billing", label: "Billing", icon: CreditCard, adminOnly: true, hideOnMobile: true },
];

function Brand({ name }: { name: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-field bg-brand text-white shadow-soft">
        <QrCode className="h-5 w-5" aria-hidden />
      </span>
      <span className="truncate font-extrabold">{name}</span>
    </div>
  );
}

function AccessBanner({ user }: { user: AuthUser }) {
  const a = user.access;
  if (user.role !== "admin") return null;
  let msg: string | null = null;
  if (user.mustChangePassword) msg = "You are using a temporary password. Set your own to secure your account.";
  else if (a?.status === "trial") msg = `Free trial: ${a.daysLeft} ${a.daysLeft === 1 ? "day" : "days"} left.`;
  else if (a?.status === "grace") msg = `Your subscription ended. The menu stays online for ${a.graceDaysLeft} more ${a.graceDaysLeft === 1 ? "day" : "days"}.`;
  else if (a?.status === "active" && a.daysLeft !== null && a.daysLeft <= 7) msg = `Your plan ends in ${a.daysLeft} ${a.daysLeft === 1 ? "day" : "days"}.`;
  if (!msg) return null;
  return (
    <Link to="/admin/billing" className="flex items-center justify-between gap-3 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-900 dark:text-amber-200">
      <span>{msg}</span>
      <span className="inline-flex shrink-0 items-center gap-1 underline">
        Billing <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </span>
    </Link>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  if (!user) return null;

  const blocked = user.access?.blocked ?? false;
  // an ended or suspended subscription can only see the Billing page
  if (blocked && pathname !== "/admin/billing") return <Navigate to="/admin/billing" replace />;

  const rest = user.restaurant;
  const name = rest ? pick(rest.name, "en") : "QR Menu";
  const admin = user.role === "admin";
  const visible = blocked
    ? links.filter((l) => l.to === "/admin/billing" && admin)
    : links.filter((l) => !l.adminOnly || admin);
  const tabs = visible.filter((l) => !l.hideOnMobile);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-e border-line bg-surface p-4 md:flex">
        <Brand name={name} />

        <nav aria-label="Admin" className="flex flex-col gap-1">
          {visible.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "relative flex h-11 items-center gap-3 rounded-field px-3 text-sm font-semibold transition-colors",
                  isActive ? "text-brand-ink" : "text-muted hover:text-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="nav-pill" transition={spring} className="absolute inset-0 rounded-field bg-brand-soft" />
                  )}
                  <l.icon className="relative h-5 w-5" aria-hidden />
                  <span className="relative">{l.label === "QR" ? "QR codes" : l.label}</span>
                </>
              )}
            </NavLink>
          ))}
          {rest && !blocked && (
            <a
              href={`/r/${rest.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center gap-3 rounded-field px-3 text-sm font-semibold text-muted transition-colors hover:text-ink"
            >
              <ExternalLink className="h-5 w-5" aria-hidden />
              View menu
            </a>
          )}
        </nav>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-muted">{user.email}</p>
            <ThemeToggle />
          </div>
          <Button variant="soft" className="w-full" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <AccessBanner user={user} />
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur-xl md:hidden">
          <Brand name={name} />
          <div className="flex shrink-0">
            {admin && (
              <Link to="/admin/billing" aria-label="Billing" className="grid h-11 w-11 place-items-center rounded-full hover:bg-line/60">
                <CreditCard className="h-5 w-5" aria-hidden />
              </Link>
            )}
            <ThemeToggle />
            <IconButton aria-label="Sign out" onClick={() => void logout()}>
              <LogOut className="h-5 w-5" aria-hidden />
            </IconButton>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 pb-28 md:p-8">
          <Outlet />
        </main>
      </div>

      {tabs.length > 0 && (
        <nav
          aria-label="Admin"
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        >
          {tabs.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "relative flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                  isActive ? "text-brand-ink" : "text-muted",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="tab-pill" transition={spring} className="absolute inset-x-1.5 bottom-1.5 top-1.5 rounded-field bg-brand-soft" />
                  )}
                  <l.icon className="relative h-5 w-5" aria-hidden />
                  <span className="relative">{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}