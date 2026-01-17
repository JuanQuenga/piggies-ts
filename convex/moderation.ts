import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// ============================================================================
// MODERATION NOTIFICATIONS
// ============================================================================

// Get unread moderation notifications for a user
export const getUnreadModerationNotifications = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("moderationNotifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("readAt"), undefined))
      .order("desc")
      .collect();

    return notifications;
  },
});

// Get all moderation notifications for a user
export const getModerationNotifications = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const notifications = await ctx.db
      .query("moderationNotifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// Mark a notification as read
export const markModerationNotificationRead = mutation({
  args: {
    notificationId: v.id("moderationNotifications"),
    userId: v.id("users"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== args.userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.notificationId, {
      readAt: Date.now(),
    });

    return { success: true };
  },
});

// Mark all notifications as read for a user
export const markAllModerationNotificationsRead = mutation({
  args: { userId: v.id("users") },
  returns: v.object({ success: v.boolean(), count: v.number() }),
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("moderationNotifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("readAt"), undefined))
      .collect();

    const now = Date.now();
    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { readAt: now });
    }

    return { success: true, count: unreadNotifications.length };
  },
});

// ============================================================================
// APPEALS SYSTEM
// ============================================================================

// Submit an appeal (banned/suspended users can submit)
export const submitAppeal = mutation({
  args: {
    userId: v.id("users"),
    appealType: v.union(v.literal("ban"), v.literal("suspension"), v.literal("warning")),
    reason: v.string(),
    additionalInfo: v.optional(v.string()),
  },
  returns: v.id("appeals"),
  handler: async (ctx, args) => {
    // Verify user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has a pending or under_review appeal already
    const existingAppeal = await ctx.db
      .query("appeals")
      .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "pending"))
      .first();

    if (existingAppeal) {
      throw new Error("You already have a pending appeal. Please wait for it to be reviewed.");
    }

    const underReviewAppeal = await ctx.db
      .query("appeals")
      .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "under_review"))
      .first();

    if (underReviewAppeal) {
      throw new Error("Your appeal is currently under review. Please wait for a decision.");
    }

    // Create the appeal with context from current user state
    const appealId = await ctx.db.insert("appeals", {
      userId: args.userId,
      appealType: args.appealType,
      reason: args.reason.trim(),
      additionalInfo: args.additionalInfo?.trim(),
      submittedAt: Date.now(),
      status: "pending",
      originalBannedReason: user.bannedReason,
      originalSuspendedUntil: user.suspendedUntil,
      originalWarningCount: user.warningCount,
    });

    return appealId;
  },
});

// Get user's appeal history
export const getUserAppeals = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const appeals = await ctx.db
      .query("appeals")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return appeals;
  },
});

// Get a single appeal by ID
export const getAppealById = query({
  args: { appealId: v.id("appeals") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.appealId);
  },
});

// Check if user can submit an appeal (no pending/under_review appeals)
export const canSubmitAppeal = query({
  args: { userId: v.id("users") },
  returns: v.object({
    canSubmit: v.boolean(),
    reason: v.optional(v.string()),
    existingAppealStatus: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Check for pending appeal
    const pendingAppeal = await ctx.db
      .query("appeals")
      .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "pending"))
      .first();

    if (pendingAppeal) {
      return {
        canSubmit: false,
        reason: "You already have a pending appeal",
        existingAppealStatus: "pending",
      };
    }

    // Check for under_review appeal
    const underReviewAppeal = await ctx.db
      .query("appeals")
      .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "under_review"))
      .first();

    if (underReviewAppeal) {
      return {
        canSubmit: false,
        reason: "Your appeal is currently under review",
        existingAppealStatus: "under_review",
      };
    }

    return { canSubmit: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (called by admin.ts)
// ============================================================================

// Create a moderation notification (called internally)
export const createModerationNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("warning"),
      v.literal("suspension"),
      v.literal("ban"),
      v.literal("appeal_accepted"),
      v.literal("appeal_rejected")
    ),
    reason: v.optional(v.string()),
    suspendedUntil: v.optional(v.number()),
    warningNumber: v.optional(v.number()),
    appealId: v.optional(v.id("appeals")),
  },
  returns: v.id("moderationNotifications"),
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("moderationNotifications", {
      userId: args.userId,
      type: args.type,
      reason: args.reason,
      suspendedUntil: args.suspendedUntil,
      warningNumber: args.warningNumber,
      appealId: args.appealId,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});
