import { z } from "zod";

export const email = z.string().trim().toLowerCase().max(254).email();

// bcrypt only hashes the first 72 bytes
export const newPassword = z
  .string()
  .min(10, "At least 10 characters")
  .refine((v) => Buffer.byteLength(v) <= 72, "Too long (max 72 bytes)");

export const loginBody = z.strictObject({
  email,
  password: z.string().min(1).max(200),
});

export const changePasswordBody = z.strictObject({
  current: z.string().min(1).max(200),
  password: newPassword,
});