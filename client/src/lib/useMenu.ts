import axios from "axios";
import { useEffect, useState } from "react";
import { fetchMenu } from "./api";
import type { PublicMenu } from "./types";

interface Result {
  key: string;
  data?: PublicMenu;
  error?: unknown;
}

export function useMenu(slug?: string) {
  const [tick, setTick] = useState(0);
  const [res, setRes] = useState<Result>();
  const key = `${slug}:${tick}`;

  useEffect(() => {
    if (!slug) return;
    const ctrl = new AbortController();
    fetchMenu(slug, ctrl.signal)
      .then((data) => setRes({ key, data }))
      .catch((error) => {
        if (!axios.isCancel(error)) setRes({ key, error });
      });
    return () => ctrl.abort();
  }, [slug, key]);

  const settled = res?.key === key;
  return {
    data: settled ? res.data : undefined,
    error: settled ? res.error : undefined,
    loading: !settled,
    retry: () => setTick((t) => t + 1),
  };
}