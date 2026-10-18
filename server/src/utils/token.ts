import type { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const COOKIE_NAME = "token";
const MAX_AGE_S = 7 * 24 * 60 * 60;
const prod = env.NODE_ENV === "production";

const base: CookieOptions = { httpOnly: true, secure: prod, sameSite: prod ? "none" : "lax", path: "/" };

export const sessionCookie: CookieOptions = { ...base, maxAge: MAX_AGE_S * 1000 };
export const clearCookieOptions: CookieOptions = base;

export const signToken = (userId: string) =>
  jwt.sign({}, env.JWT_SECRET, { algorithm: "HS256", subject: userId, expiresIn: MAX_AGE_S });

export function verifyToken(token: string): string {
  const p = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  // a short-lived socket token (it has an audience) must never work as a session
  if (typeof p === "string" || typeof p.sub !== "string" || p.aud) throw new Error("Bad token");
  return p.sub;
}

/** 2-minute token the browser uses to authenticate the Socket.io connection without a cookie. */
export const signSocketToken = (userId: string) =>
  jwt.sign({}, env.JWT_SECRET, { algorithm: "HS256", subject: userId, audience: "socket", expiresIn: 120 });

export function verifySocketToken(token: string): string {
  const p = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"], audience: "socket" });
  if (typeof p === "string" || typeof p.sub !== "string") throw new Error("Bad token");
  return p.sub;
}