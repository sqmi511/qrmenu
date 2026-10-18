import axios from "axios";
import { useEffect, useState } from "react";
import { fetchOrder } from "./api";
import { createSocket } from "./socket";
import type { OrderStatus, PublicOrder } from "./types";

const POLL_MS = 10_000; // fallback only, used while the socket is down
const FINAL: OrderStatus[] = ["served", "cancelled"];

interface Result {
  key: string;
  data?: PublicOrder;
  error?: unknown;
}

export function useOrder(token?: string) {
  const [tick, setTick] = useState(0);
  const [res, setRes] = useState<Result>();
  const key = `${token}:${tick}`;

  useEffect(() => {
    if (!token) return;
    const ctrl = new AbortController();
    let timer: number | undefined;
    let hasData = false;
    let live = false;
    let final = false;

    const schedule = () => {
      window.clearTimeout(timer);
      if (!live && !final) timer = window.setTimeout(() => void load(), POLL_MS);
    };

    const load = (): Promise<void> =>
      fetchOrder(token, ctrl.signal)
        .then((data) => {
          hasData = true;
          final = FINAL.includes(data.status);
          setRes({ key, data });
          schedule();
        })
        .catch((error) => {
          if (axios.isCancel(error)) return;
          if (hasData) {
            // transient failure: keep showing the last known status
            schedule();
            return;
          }
          setRes({ key, error });
        });

    void load();

    // pushes carry only the new status; the page refetches the full order
    const socket = createSocket();
    socket.on("connect", () => {
      live = true;
      socket.emit("order:watch", token);
      void load(); // covers changes made between the first fetch and joining the room
    });
    socket.on("order:status", () => void load());
    socket.on("disconnect", () => {
      live = false;
      schedule();
    });
    socket.on("connect_error", () => {
      live = false;
      schedule();
    });

    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
      socket.disconnect();
    };
  }, [token, key]);

  const settled = res?.key === key;
  return {
    data: settled ? res.data : undefined,
    error: settled ? res.error : undefined,
    loading: !settled,
    retry: () => setTick((t) => t + 1),
  };
}