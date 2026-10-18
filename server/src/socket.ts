import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { allowedOrigins } from "./config/env.js";
import { Order } from "./models/Order.js";
import { User } from "./models/User.js";
import { setIo } from "./realtime.js";
import { COOKIE_NAME, verifySocketToken, verifyToken } from "./utils/token.js";

const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
const MAX_WATCH = 5;

function readCookie(header: string | undefined, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0 || part.slice(0, i).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function initSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
    // blocks cross-site WebSocket hijacking: browsers always send Origin
    allowRequest: (req, cb) => {
      const origin = req.headers.origin;
      cb(null, !origin || allowedOrigins.includes(origin));
    },
    maxHttpBufferSize: 1_000,
    serveClient: false,
  });

  // staff identity: a short-lived socket token (cross-site deploys) or the session cookie (same-site).
  // Never client-sent ids.
  io.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth as { token?: unknown } | undefined;
      let userId: string | null = null;
      if (typeof auth?.token === "string" && auth.token) {
        userId = verifySocketToken(auth.token);
      } else {
        const raw = readCookie(socket.handshake.headers.cookie, COOKIE_NAME);
        if (raw) userId = verifyToken(raw);
      }
      if (userId) {
        const user = await User.findById(userId).select("restaurant").lean();
        if (user?.restaurant) socket.data.restaurant = String(user.restaurant);
      }
    } catch {
      /* anonymous (customer) */
    }
    next();
  });

  io.on("connection", (socket) => {
    const rid = socket.data.restaurant as string | undefined;
    if (rid) {
      void socket.join(`restaurant:${rid}`);
      socket.emit("joined");
    }

    // customers: only an existing, unguessable order token opens a room
    socket.on("order:watch", async (token: unknown) => {
      if (typeof token !== "string" || !TOKEN_RE.test(token)) return;
      const watching = [...socket.rooms].filter((r) => r.startsWith("order:")).length;
      if (watching >= MAX_WATCH) return;
      try {
        if (await Order.exists({ publicToken: token })) await socket.join(`order:${token}`);
      } catch {
        /* ignore */
      }
    });
  });

  setIo(io);
  return io;
}