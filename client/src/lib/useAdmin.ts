import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  getRestaurant,
  listCategories,
  listItems,
  type AdminCategory,
  type AdminItem,
  type AdminRestaurant,
} from "./adminApi";

export interface MenuData {
  restaurant: AdminRestaurant;
  categories: AdminCategory[];
  items: AdminItem[];
}

interface State<T> {
  data?: T;
  error?: unknown;
}

/** Loads once, keeps showing data while refetching, and allows optimistic local updates. */
export function useAdminMenu(rid?: string) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<State<MenuData>>({});

  useEffect(() => {
    if (!rid) return;
    const ctrl = new AbortController();
    Promise.all([getRestaurant(rid, ctrl.signal), listCategories(rid, ctrl.signal), listItems(rid, ctrl.signal)])
      .then(([restaurant, categories, items]) => setState({ data: { restaurant, categories, items } }))
      .catch((error) => {
        if (!axios.isCancel(error)) setState((s) => ({ data: s.data, error }));
      });
    return () => ctrl.abort();
  }, [rid, tick]);

  const reload = useCallback(() => {
    setState((s) => ({ data: s.data }));
    setTick((t) => t + 1);
  }, []);

  const update = useCallback((fn: (d: MenuData) => MenuData) => {
    setState((s) => (s.data ? { data: fn(s.data) } : s));
  }, []);

  return { data: state.data, error: state.error, reload, update };
}

export function useAdminRestaurant(rid?: string) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<State<AdminRestaurant>>({});

  useEffect(() => {
    if (!rid) return;
    const ctrl = new AbortController();
    getRestaurant(rid, ctrl.signal)
      .then((data) => setState({ data }))
      .catch((error) => {
        if (!axios.isCancel(error)) setState((s) => ({ data: s.data, error }));
      });
    return () => ctrl.abort();
  }, [rid, tick]);

  const reload = useCallback(() => {
    setState((s) => ({ data: s.data }));
    setTick((t) => t + 1);
  }, []);

  return { data: state.data, error: state.error, reload };
}