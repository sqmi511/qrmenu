import { useEffect } from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import { CartProvider } from "../context/CartProvider";

export default function CustomerLayout() {
  const { slug = "" } = useParams();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <CartProvider key={slug} slug={slug}>
      <Outlet />
    </CartProvider>
  );
}