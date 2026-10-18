import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import PageSpinner from "./ui/Spinner";

/** area="super": only the super-admin. area="tenant": restaurant owners and staff. */
export default function RequireAuth({ area, children }: { area: "super" | "tenant"; children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageSpinner />;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (area === "super" && user.role !== "super") return <Navigate to="/admin" replace />;
  if (area === "tenant" && user.role === "super") return <Navigate to="/super" replace />;
  return <>{children}</>;
}