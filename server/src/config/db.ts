import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  } catch (e) {
    const err = e as { name?: string; message?: string; code?: string };
    // never print the URI: it contains the password
    console.error(`MongoDB connection failed: ${err.name} ${err.code ?? ""} ${err.message}`);
    throw e;
  }
  console.log("MongoDB connected");
}