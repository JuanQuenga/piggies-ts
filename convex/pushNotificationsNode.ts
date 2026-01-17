"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import webpush from "web-push";

// ============================================================================
// NODE.JS ACTION - For sending push notifications (requires Node.js runtime)
// ============================================================================

export const sendPushNotifications = internalAction({
  args: {
    subscriptionIds: v.array(v.id("pushSubscriptions")),
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
  handler: async (ctx, args) => {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT;

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      console.error("VAPID keys not configured");
      return;
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Get subscription details from database
    const subscriptions = await Promise.all(
      args.subscriptionIds.map((id) =>
        ctx.runQuery(internal.pushNotifications.getSubscriptionById, { id })
      )
    );

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      icon: args.icon || "/logo192.png",
      tag: args.tag,
      data: args.data,
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions
        .filter((sub): sub is NonNullable<typeof sub> => sub !== null)
        .map(async (subscription) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth,
                },
              },
              payload
            );
            // Update lastUsedAt
            await ctx.runMutation(internal.pushNotifications.updateSubscriptionLastUsed, {
              subscriptionId: subscription._id,
            });
          } catch (error: unknown) {
            const pushError = error as { statusCode?: number };
            // Handle expired/invalid subscriptions
            if (pushError.statusCode === 404 || pushError.statusCode === 410) {
              // Subscription no longer valid, delete it
              await ctx.runMutation(internal.pushNotifications.deleteSubscription, {
                subscriptionId: subscription._id,
              });
            }
            throw error;
          }
        })
    );

    // Log results for debugging
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    console.log(`Push notifications sent: ${succeeded} succeeded, ${failed} failed`);
  },
});
