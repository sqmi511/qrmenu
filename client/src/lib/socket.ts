import { io, type Socket } from "socket.io-client";
import { api } from "./api";

const base = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
// Vercel can't proxy WebSockets, so production sets VITE_SOCKET_URL to the API's own address
const origin: string = import.meta.env.VITE_SOCKET_URL ?? new URL(base, window.location.origin).origin;

/**
 * staff = true: fetches a 2-minute token through the (same-origin) API on every connect attempt,
 * so it also works on browsers that block cross-site cookies. Customers connect anonymously.
 */
export function createSocket(staff = false): Socket {
  return io(origin, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: staff
      ? (cb) => {
          api
            .get<{ data: { token: string } }>("/auth/socket-token")
            .then((r) => cb({ token: r.data.data.token }))
            .catch(() => cb({}));
        }
      : undefined,
  });
}