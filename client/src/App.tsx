import { AnimatePresence } from "framer-motion";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import { AuthProvider } from "./context/AuthProvider";
import AdminLayout from "./layouts/AdminLayout";
import CustomerLayout from "./layouts/CustomerLayout";
import SuperLayout from "./layouts/SuperLayout";
import AdminMenu from "./pages/admin/AdminMenu";
import Billing from "./pages/admin/Billing";
import Dashboard from "./pages/admin/Dashboard";
import History from "./pages/admin/History";
import Login from "./pages/admin/Login";
import Orders from "./pages/admin/Orders";
import QrCodes from "./pages/admin/QrCodes";
import SettingsPage from "./pages/admin/SettingsPage";
import Home from "./pages/Home";
import MenuPage from "./pages/MenuPage";
import NotFound from "./pages/NotFound";
import OrderPage from "./pages/OrderPage";
import Super from "./pages/super/Super";

export default function App() {
  const location = useLocation();
  // shared key per area so layouts (admin shell, customer cart) persist between their pages
  const customer = location.pathname.match(/^\/r\/([^/]+)/);
  const key =
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/super")
      ? "admin"
      : customer
        ? `r:${customer[1]}`
        : location.pathname;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={key}>
        <Route path="/" element={<Home />} />

        <Route path="/r/:slug" element={<CustomerLayout />}>
          <Route index element={<MenuPage />} />
          <Route path="order/:token" element={<OrderPage />} />
        </Route>

        {/* /auth/me is only requested on admin pages, never for customers */}
        <Route
          element={
            <AuthProvider>
              <Outlet />
            </AuthProvider>
          }
        >
          <Route path="/admin/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <RequireAuth area="tenant">
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="history" element={<History />} />
            <Route path="menu" element={<AdminMenu />} />
            <Route path="qr" element={<QrCodes />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="billing" element={<Billing />} />
          </Route>

          <Route
            path="/super"
            element={
              <RequireAuth area="super">
                <SuperLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Super />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}