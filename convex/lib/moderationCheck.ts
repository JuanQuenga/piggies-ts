import { Id } from "../_generated/dataModel";

/**
 * Moderation status check result
 */
export type ModerationStatus = {
  allowed: boolean;
  reason?: "banned" | "suspended";
  details?: {
    bannedReason?: string;
    suspendedUntil?: number;
  };
};

/**
 * Check if a user is allowed to perform actions (not banned or suspended)
 * Call this at the start of mutations that modify data
 */
export async function checkUserModerationStatus(
  ctx: { db: { get: (id: Id<"users">) => Promise<any> } },
  userId: Id<"users">
): Promise<ModerationStatus> {
  const user = await ctx.db.get(userId);

  if (!user) {
    return {
      allowed: false,
      reason: "banned",
      details: { bannedReason: "User not found" },
    };
  }

  // Check if user is banned
  if (user.isBanned) {
    return {
      allowed: false,
      reason: "banned",
      details: { bannedReason: user.bannedReason },
    };
  }

  // Check if user is suspended (and suspension hasn't expired)
  if (user.isSuspended && user.suspendedUntil && user.suspendedUntil > Date.now()) {
    return {
      allowed: false,
      reason: "suspended",
      details: { suspendedUntil: user.suspendedUntil },
    };
  }

  return { allowed: true };
}

/**
 * Throw an error if user is not allowed to perform actions
 * Convenience wrapper around checkUserModerationStatus
 */
export async function requireNotModerated(
  ctx: { db: { get: (id: Id<"users">) => Promise<any> } },
  userId: Id<"users">
): Promise<void> {
  const status = await checkUserModerationStatus(ctx, userId);

  if (!status.allowed) {
    if (status.reason === "banned") {
      throw new Error("Your account has been banned. You cannot perform this action.");
    } else if (status.reason === "suspended") {
      const suspendedUntil = status.details?.suspendedUntil;
      const expiry = suspendedUntil
        ? new Date(suspendedUntil).toLocaleDateString()
        : "soon";
      throw new Error(`Your account is suspended until ${expiry}. You cannot perform this action.`);
    }
    throw new Error("Your account is restricted. You cannot perform this action.");
  }
}
