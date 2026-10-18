import axios from "axios";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { AuthContext, type AuthUser } from "./auth-context";

type Res = { data: AuthUser };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    api
      .get<Res>("/auth/me", { signal: ctrl.signal })
      .then((r) => {
        setUser(r.data.data);
        setReady(true);
      })
      .catch((e) => {
        if (axios.isCancel(e)) return;
        setUser(null);
        setReady(true);
      });
    return () => ctrl.abort();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<Res>("/auth/login", { email, password });
    setUser(data.data);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await api.get<Res>("/auth/me");
    setUser(data.data);
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout, refresh }), [user, ready, login, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}