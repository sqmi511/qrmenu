import { useSyncExternalStore } from "react";

const STEP = 30_000;
const subscribe = (cb: () => void) => {
  const id = window.setInterval(cb, STEP);
  return () => window.clearInterval(id);
};
const snapshot = () => Math.floor(Date.now() / STEP) * STEP;

/** Current time, refreshed every 30 s (for "5 min ago" labels). */
export const useNow = () => useSyncExternalStore(subscribe, snapshot);