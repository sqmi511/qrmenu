import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";

// the only way to create (or reset) the super-admin; there is no API for it
async function main() {
  const email = z.string().trim().toLowerCase().email().parse(process.env.SUPER_EMAIL);
  const password = z
    .string()
    .min(12, "Use at least 12 characters")
    .refine((v) => Buffer.byteLength(v) <= 72, "Too long (max 72 bytes)")
    .parse(process.env.SUPER_PASSWORD);

  await connectDB();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email });
  if (existing && existing.role !== "super") {
    throw new Error("That email belongs to a restaurant account. Use a different email.");
  }
  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log("Super-admin password updated");
  } else {
    await User.create({ email, passwordHash, role: "super", restaurant: null });
    console.log("Super-admin created");
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());