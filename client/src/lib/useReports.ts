import axios from "axios";
import { useEffect, useState } from "react";
import type { AdminOrder } from "./ordersApi";
import { fetchHistory, fetchStats, type HistoryFilters, type Range, type Stats } from "./statsApi";

/** Keeps the previous numbers on screen while a new range loads. */
export function useStats(rid: string | undefined, range: Range) {
  const [tick, setTick] = useState(0);
  const [res, setRes] = useState<{ key: string; data?: Stats; error?: unknown }>();
  const key = `${rid}:${range}:${tick}`;

  useEffect(() => {
    if (!rid) return;
    const ctrl = new AbortController();
    fetchStats(rid, range, ctrl.signal)
      .then((data) => setRes({ key, data }))
      .catch((error) => {
        if (!axios.isCancel(error)) setRes((r) => ({ key, data: r?.data, error }));
      });
    return () => ctrl.abort();
  }, [rid, range, key]);

  const settled = res?.key === key;
  return {
    data: res?.data,
    error: settled ? res.error : undefined,
    loading: !settled,
    reload: () => setTick((t) => t + 1),
  };
}

export function useHistory(rid: string | undefined, { status, type, from, to }: HistoryFilters) {
  const [tick, setTick] = useState(0);
  const [more, setMore] = useState(false);
  const [res, setRes] = useState<{ key: string; rows: AdminOrder[]; next: string | null; error?: unknown }>();
  const key = `${rid}|${status}|${type}|${from}|${to}|${tick}`;

  useEffect(() => {
    if (!rid) return;
    const ctrl = new AbortController();
    fetchHistory(rid, { status, type, from, to }, undefined, ctrl.signal)
      .then((p) => setRes({ key, rows: p.data, next: p.nextCursor }))
      .catch((error) => {
        if (!axios.isCancel(error)) setRes({ key, rows: [], next: null, error });
      });
    return () => ctrl.abort();
  }, [rid, status, type, from, to, key]);

  const settled = res?.key === key;

  const loadMore = async () => {
    if (!rid || !res?.next || more || !settled) return;
    setMore(true);
    try {
      const p = await fetchHistory(rid, { status, type, from, to }, res.next);
      setRes((r) => (r && r.key === key ? { ...r, rows: [...r.rows, ...p.data], next: p.nextCursor } : r));
    } finally {
      setMore(false);
    }
  };

  const replace = (o: AdminOrder) =>
    setRes((r) => (r ? { ...r, rows: r.rows.map((x) => (x._id === o._id ? o : x)) } : r));

  return {
    rows: res?.rows ?? [],
    hasMore: settled && !!res.next,
    error: settled ? res.error : undefined,
    loading: !settled,
    more,
    loadMore,
    replace,
    reload: () => setTick((t) => t + 1),
  };
}