import bcrypt from "bcryptjs";
import { tenantId } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { idParam } from "../schemas/common.js";
import { createStaffBody } from "../schemas/staff.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, notFound } from "../utils/httpError.js";

export const listStaff = asyncHandler(async (_req, res) => {
  const data = await User.find({ restaurant: tenantId(res), role: "staff" })
    .select("email role createdAt")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ data });
});

export const createStaff = asyncHandler(async (req, res) => {
  const { email, password } = createStaffBody.parse(req.body);
  if (await User.exists({ email })) throw new HttpError(409, "Email already registered");
  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "staff",
    restaurant: tenantId(res),
  });
  res.status(201).json({ data: { _id: user._id, email: user.email, role: user.role } });
});

export const deleteStaff = asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  const doc = await User.findOneAndDelete({ _id: id, restaurant: tenantId(res), role: "staff" });
  if (!doc) throw notFound("Staff member");
  res.status(204).end();
});