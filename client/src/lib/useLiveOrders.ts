import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { listOrders, type AdminOrder } from "./ordersApi";
import { createSocket } from "./socket";

const FALLBACK_POLL_MS = 15_000;

/** Orders list kept in sync over Socket.io, with REST refetch on reconnect and a polling fallback. */
export function useLiveOrders(rid: string | undefined, onNew: (o: AdminOrder) => void) {
  const [orders, setOrders] = useState<AdminOrder[]>();
  const [error, setError] = useState<unknown>();
  const [live, setLive] = useState(false);
  const [tick, setTick] = useState(0);
  const newRef = useRef(onNew);
  useEffect(() => {
    newRef.current = onNew;
  });

  useEffect(() => {
    if (!rid) return;
    const ctrl = new AbortController();
    let connected = false;

    const load = () =>
      listOrders(rid, ctrl.signal)
        .then((data) => {
          setOrders(data);
          setError(undefined);
        })
        .catch((e) => {
          if (!axios.isCancel(e)) setError(e);
        });

    void load();
    const poll = window.setInterval(() => {
      if (!connected) void load();
    }, FALLBACK_POLL_MS);

    const socket = createSocket(true);
    socket.on("joined", () => {
      connected = true;
      setLive(true);
      void load(); // catch up on anything missed while offline
    });
    socket.on("disconnect", () => {
      connected = false;
      setLive(false);
    });
    socket.on("connect_error", () => {
      connected = false;
      setLive(false);
    });
    socket.on("order:new", (o: AdminOrder) => {
      setOrders((cur) => (cur && !cur.some((x) => x._id === o._id) ? [o, ...cur] : cur));
      newRef.current(o);
    });
    socket.on("order:updated", (o: AdminOrder) => {
      setOrders((cur) => cur?.map((x) => (x._id === o._id ? o : x)));
    });

    return () => {
      ctrl.abort();
      window.clearInterval(poll);
      socket.disconnect();
    };
  }, [rid, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { orders, setOrders, error, live, reload };
}