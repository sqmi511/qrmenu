import type { Server } from "socket.io";

let io: Server | null = null;
export const setIo = (s: Server) => {
  io = s;
};

// round-trip through JSON so ObjectIds and Dates match what the REST API returns
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** To the restaurant's staff room. Never include publicToken here. */
export function emitOrderCreated(restaurantId: string, order: object) {
  io?.to(`restaurant:${restaurantId}`).emit("order:new", plain(order));
}

export function emitOrderUpdated(
  restaurantId: string,
  token: string,
  order: { status: string; updatedAt?: unknown },
) {
  const o = plain(order);
  io?.to(`restaurant:${restaurantId}`).emit("order:updated", o);
  // customers only learn the status
  io?.to(`order:${token}`).emit("order:status", { status: o.status, updatedAt: o.updatedAt });
}