import { createContext, useContext } from "react";
import type { Localized } from "../lib/types";

export type Role = "admin" | "staff" | "super";

export interface Access {
  plan: "none" | "trial" | "monthly" | "annual" | "lifetime";
  status: "pending" | "trial" | "active" | "grace" | "expired" | "suspended";
  accessUntil: string | null;
  blocked: boolean;
  daysLeft: number | null;
  graceDaysLeft: number | null;
}

export interface AuthUser {
  _id: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  restaurant: { _id: string; slug: string; name: Localized } | null;
  access: Access | null;
}

export interface Auth {
  user: AuthUser | null;
  /** false until the first /auth/me check finishes */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** reloads the profile (after a password change, for example) */
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<Auth | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}