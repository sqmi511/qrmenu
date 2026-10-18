import { PLANS } from "../config/plans.js";

export const PLAN_NAMES = ["none", "trial", "monthly", "annual", "lifetime"] as const;
export type Plan = (typeof PLAN_NAMES)[number];
export type AccessStatus = "pending" | "trial" | "active" | "grace" | "expired" | "suspended";

export const DAY = 86_400_000;

export interface AccessInput {
  plan?: string | null;
  accessUntil?: Date | null;
  suspended?: boolean | null;
  createdAt?: Date;
}

export interface Access {
  plan: Plan;
  status: AccessStatus;
  accessUntil: Date | null;
  blocked: boolean;
  daysLeft: number | null;
  graceDaysLeft: number | null;
}

/**
 * Derives the subscription state.
 * plan "none" = created, waiting for the first payment (closed).
 * A missing plan = restaurant created before billing existed: trial counted from createdAt.
 */
export function accessState(r: AccessInput, now = new Date()): Access {
  const plan = (PLAN_NAMES as readonly string[]).includes(r.plan ?? "") ? (r.plan as Plan) : "trial";

  if (r.suspended) {
    return { plan, status: "suspended", accessUntil: r.accessUntil ?? null, blocked: true, daysLeft: null, graceDaysLeft: null };
  }
  if (plan === "none") {
    return { plan, status: "pending", accessUntil: null, blocked: true, daysLeft: null, graceDaysLeft: null };
  }

  const until =
    plan === "lifetime"
      ? null
      : (r.accessUntil ?? (r.createdAt ? new Date(r.createdAt.getTime() + PLANS.trialDays * DAY) : now));

  if (!until) {
    return { plan, status: "active", accessUntil: null, blocked: false, daysLeft: null, graceDaysLeft: null };
  }
  const ms = until.getTime() - now.getTime();
  if (ms >= 0) {
    return {
      plan,
      status: plan === "trial" ? "trial" : "active",
      accessUntil: until,
      blocked: false,
      daysLeft: Math.ceil(ms / DAY),
      graceDaysLeft: null,
    };
  }
  const graceMs = PLANS.graceDays * DAY + ms;
  if (graceMs >= 0) {
    return { plan, status: "grace", accessUntil: until, blocked: false, daysLeft: 0, graceDaysLeft: Math.ceil(graceMs / DAY) };
  }
  return { plan, status: "expired", accessUntil: until, blocked: true, daysLeft: 0, graceDaysLeft: 0 };
}