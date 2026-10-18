import { z } from "zod";
import { email, newPassword } from "./auth.js";

export const createStaffBody = z.strictObject({ email, password: newPassword });