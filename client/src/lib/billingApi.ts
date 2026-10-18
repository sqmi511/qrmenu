import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import type { Access } from "../context/auth-context";
import { api } from "./api";

export interface Billing {
  access: Access;
  reference: string;
  prices: { monthlyCents: number; annualCents: number; lifetimeCents: number };
  lifetime: { limit: number; left: number };
  pay: { whish: string; whatsapp: string };
  payments: {
    _id: string;
    plan: "monthly" | "annual" | "lifetime";
    amountCents: number;
    method: string;
    reference: string;
    coversUntil: string | null;
    createdAt: string;
  }[];
}

export function useBilling(enabled: boolean) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ data?: Billing; error?: unknown }>({});

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    api
      .get<{ data: Billing }>("/billing", { signal: ctrl.signal })
      .then((r) => setState({ data: r.data.data }))
      .catch((error) => {
        if (!axios.isCancel(error)) setState((s) => ({ data: s.data, error }));
      });
    return () => ctrl.abort();
  }, [enabled, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: state.data, error: state.error, reload };
}