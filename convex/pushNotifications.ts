import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ============================================================================
// PUBLIC MUTATIONS - For managing push subscriptions from client
// ============================================================================

// Register a new push subscription for a user
export const registerPushSubscription = mutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  },
  returns: v.id("pushSubscriptions"),
  handler: async (ctx, args) => {
    // Check if this endpoint already exists for this user
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (existing) {
      // Update existing subscription
      await ctx.db.patch(existing._id, {
        p256dh: args.p256dh,
        auth: args.auth,
        userAgent: args.userAgent,
        lastUsedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new subscription
    return await ctx.db.insert("pushSubscriptions", {
      userId: args.userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });
  },
});

// Unregister a push subscription
export const unregisterPushSubscription = mutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (subscription) {
      await ctx.db.delete(subscription._id);
    }
    return null;
  },
});

// Get user's push subscriptions count (for settings UI)
export const getPushSubscriptionCount = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    return subscriptions.length;
  },
});

// ============================================================================
// INTERNAL MUTATIONS - For queuing notifications
// ============================================================================

// Internal mutation to queue a notification (called from messages/waves)
export const queuePushNotification = internalMutation({
  args: {
    recipientUserId: v.id("users"),
    title: v.string(),
    body: v.string(),
    icon: v.optional(v.string()),
    tag: v.optional(v.string()),
    data: v.optional(v.object({
      type: v.union(v.literal("message"), v.literal("wave"), v.literal("moderation")),
      conversationId: v.optional(v.id("conversations")),
      senderId: v.optional(v.id("users")),
      url: v.optional(v.string()),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if user has push notifications enabled
    const user = await ctx.db.get(args.recipientUserId);
    if (!user || user.pushNotificationsEnabled === false) {
      return null;
    }

    // Get all subscriptions for this user
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.recipientUserId))
      .collect();

    if (subscriptions.length === 0) {
      return null;
    }

    // Schedule the Node.js action to send push notifications
    await ctx.scheduler.runAfter(0, internal.pushNotificationsNode.sendPushNotifications, {
      subscriptionIds: subscriptions.map((s) => s._id),
      title: args.title,
      body: args.body,
      icon: args.icon,
      tag: args.tag,
      data: args.data,
    });

    return null;
  },
});

// ============================================================================
// INTERNAL QUERIES - For use in actions
// ============================================================================

// Internal query to get subscription by ID (for use in action)
export const getSubscriptionById = internalQuery({
  args: { id: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ============================================================================
// INTERNAL MUTATIONS - For cleanup
// ============================================================================

// Internal mutation to update lastUsedAt
export const updateSubscriptionLastUsed = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (subscription) {
      await ctx.db.patch(args.subscriptionId, { lastUsedAt: Date.now() });
    }
  },
});

// Internal mutation to delete invalid subscription
export const deleteSubscription = internalMutation({
  args: { subscriptionId: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (subscription) {
      await ctx.db.delete(args.subscriptionId);
    }
  },
});
