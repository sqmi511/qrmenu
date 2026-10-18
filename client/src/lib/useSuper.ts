import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { fetchPayments, fetchRestaurants, type PaymentRow, type Summary, type SuperRow } from "./superApi";

interface Data {
  restaurants: SuperRow[];
  summary: Summary;
  payments: PaymentRow[];
}

export function useSuperData() {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ data?: Data; error?: unknown }>({});

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([fetchRestaurants(ctrl.signal), fetchPayments(ctrl.signal)])
      .then(([r, payments]) => setState({ data: { ...r, payments } }))
      .catch((error) => {
        if (!axios.isCancel(error)) setState((s) => ({ data: s.data, error }));
      });
    return () => ctrl.abort();
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: state.data, error: state.error, reload };
}