import { Schema, model } from "mongoose";

export const ROLES = ["admin", "staff", "super"] as const;

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "admin" },
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", default: null, index: true },
    // true for owners created by the super-admin with a temporary password
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

export const User = model("User", userSchema);