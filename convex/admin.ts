import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ============================================================================
// ADMIN AUTH HELPERS
// ============================================================================

// Check if user is an admin
export const isAdmin = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.isAdmin === true;
  },
});

// Helper to verify admin access (throws if not admin)
async function requireAdmin(ctx: { db: { get: (id: any) => Promise<any> } }, userId: string) {
  const user = await ctx.db.get(userId as any);
  if (!user?.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

// ============================================================================
// ADMIN DASHBOARD STATS
// ============================================================================

export const getAdminStats = query({
  args: {
    adminUserId: v.id("users"),
  },
  returns: v.object({
    totalUsers: v.number(),
    activeUsers: v.number(),
    bannedUsers: v.number(),
    suspendedUsers: v.number(),
    pendingReports: v.number(),
    totalReports: v.number(),
    reportsToday: v.number(),
    newUsersToday: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const now = Date.now();
    const todayStart = now - (now % (24 * 60 * 60 * 1000));

    // Get all users
    const users = await ctx.db.query("users").collect();

    // Get all reports
    const reports = await ctx.db.query("reportedUsers").collect();

    // Calculate stats
    const activeUsers = users.filter(u =>
      u.lastActive && u.lastActive > now - 7 * 24 * 60 * 60 * 1000
    ).length;

    const bannedUsers = users.filter(u => u.isBanned === true).length;
    const suspendedUsers = users.filter(u =>
      u.isSuspended === true && u.suspendedUntil && u.suspendedUntil > now
    ).length;

    const pendingReports = reports.filter(r => r.status === "pending").length;
    const reportsToday = reports.filter(r => r.reportedAt >= todayStart).length;
    const newUsersToday = users.filter(u => u._creationTime >= todayStart).length;

    return {
      totalUsers: users.length,
      activeUsers,
      bannedUsers,
      suspendedUsers,
      pendingReports,
      totalReports: reports.length,
      reportsToday,
      newUsersToday,
    };
  },
});

// ============================================================================
// REPORTS MANAGEMENT
// ============================================================================

export const getAllReports = query({
  args: {
    adminUserId: v.id("users"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved"),
      v.literal("dismissed")
    )),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    // Get reports, optionally filtered by status
    let reports;
    if (args.status) {
      reports = await ctx.db
        .query("reportedUsers")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      reports = await ctx.db
        .query("reportedUsers")
        .order("desc")
        .collect();
    }

    // Apply pagination
    const paginatedReports = reports.slice(offset, offset + limit);

    // Populate user details
    const reportsWithDetails = await Promise.all(
      paginatedReports.map(async (report) => {
        const [reporter, reported, reviewer] = await Promise.all([
          ctx.db.get(report.reporterId),
          ctx.db.get(report.reportedId),
          report.reviewedBy ? ctx.db.get(report.reviewedBy) : null,
        ]);

        const reportedProfile = reported ? await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", reported._id))
          .unique() : null;

        return {
          _id: report._id,
          reason: report.reason,
          details: report.details,
          reportedAt: report.reportedAt,
          status: report.status,
          adminNotes: report.adminNotes,
          actionTaken: report.actionTaken,
          reviewedAt: report.reviewedAt,
          reporter: reporter ? {
            _id: reporter._id,
            name: reporter.name,
            email: reporter.email,
            imageUrl: reporter.imageUrl,
          } : null,
          reported: reported ? {
            _id: reported._id,
            name: reported.name,
            email: reported.email,
            imageUrl: reported.imageUrl,
            isBanned: reported.isBanned,
            isSuspended: reported.isSuspended,
            warningCount: reported.warningCount ?? 0,
            displayName: reportedProfile?.displayName,
          } : null,
          reviewer: reviewer ? {
            _id: reviewer._id,
            name: reviewer.name,
          } : null,
        };
      })
    );

    return {
      reports: reportsWithDetails,
      total: reports.length,
      hasMore: offset + limit < reports.length,
    };
  },
});

// Update report status and take action
export const updateReportStatus = mutation({
  args: {
    adminUserId: v.id("users"),
    reportId: v.id("reportedUsers"),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved"),
      v.literal("dismissed")
    ),
    adminNotes: v.optional(v.string()),
    actionTaken: v.optional(v.union(
      v.literal("none"),
      v.literal("warning"),
      v.literal("suspension"),
      v.literal("ban")
    )),
    suspensionDays: v.optional(v.number()), // If action is suspension
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    // Update report
    await ctx.db.patch(args.reportId, {
      status: args.status,
      reviewedBy: args.adminUserId,
      reviewedAt: Date.now(),
      adminNotes: args.adminNotes,
      actionTaken: args.actionTaken,
    });

    // Take action on the reported user if specified
    if (args.actionTaken && args.actionTaken !== "none") {
      const reportedUser = await ctx.db.get(report.reportedId);
      if (reportedUser) {
        switch (args.actionTaken) {
          case "warning":
            await ctx.db.patch(report.reportedId, {
              warningCount: (reportedUser.warningCount ?? 0) + 1,
            });
            break;
          case "suspension":
            const suspensionDays = args.suspensionDays ?? 7;
            await ctx.db.patch(report.reportedId, {
              isSuspended: true,
              suspendedUntil: Date.now() + suspensionDays * 24 * 60 * 60 * 1000,
            });
            break;
          case "ban":
            await ctx.db.patch(report.reportedId, {
              isBanned: true,
              bannedAt: Date.now(),
              bannedReason: args.adminNotes ?? report.reason,
            });
            break;
        }
      }
    }

    return { success: true };
  },
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const getAllUsers = query({
  args: {
    adminUserId: v.id("users"),
    search: v.optional(v.string()),
    filter: v.optional(v.union(
      v.literal("all"),
      v.literal("banned"),
      v.literal("suspended"),
      v.literal("warned"),
      v.literal("admin")
    )),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    let users = await ctx.db.query("users").order("desc").collect();

    // Apply filter
    if (args.filter && args.filter !== "all") {
      switch (args.filter) {
        case "banned":
          users = users.filter(u => u.isBanned === true);
          break;
        case "suspended":
          users = users.filter(u => u.isSuspended === true && u.suspendedUntil && u.suspendedUntil > Date.now());
          break;
        case "warned":
          users = users.filter(u => (u.warningCount ?? 0) > 0);
          break;
        case "admin":
          users = users.filter(u => u.isAdmin === true);
          break;
      }
    }

    // Apply search
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      );
    }

    const total = users.length;
    const paginatedUsers = users.slice(offset, offset + limit);

    // Get profiles and report counts for each user
    const usersWithDetails = await Promise.all(
      paginatedUsers.map(async (user) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .unique();

        const reportCount = (await ctx.db
          .query("reportedUsers")
          .withIndex("by_reported", (q) => q.eq("reportedId", user._id))
          .collect()).length;

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          imageUrl: user.imageUrl,
          createdAt: user._creationTime,
          lastActive: user.lastActive,
          isOnline: user.isOnline,
          isAdmin: user.isAdmin ?? false,
          isBanned: user.isBanned ?? false,
          bannedAt: user.bannedAt,
          bannedReason: user.bannedReason,
          isSuspended: user.isSuspended ?? false,
          suspendedUntil: user.suspendedUntil,
          warningCount: user.warningCount ?? 0,
          subscriptionTier: user.subscriptionTier,
          displayName: profile?.displayName,
          onboardingComplete: profile?.onboardingComplete ?? false,
          reportCount,
        };
      })
    );

    return {
      users: usersWithDetails,
      total,
      hasMore: offset + limit < total,
    };
  },
});

// Get single user with full details for admin view
export const getUserDetails = query({
  args: {
    adminUserId: v.id("users"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    // Get reports against this user
    const reportsAgainst = await ctx.db
      .query("reportedUsers")
      .withIndex("by_reported", (q) => q.eq("reportedId", args.userId))
      .collect();

    // Get reports made by this user
    const reportsMade = await ctx.db
      .query("reportedUsers")
      .withIndex("by_reporter", (q) => q.eq("reporterId", args.userId))
      .collect();

    // Get profile photos
    let profilePhotoUrls: string[] = [];
    if (profile?.profilePhotoIds) {
      const urls = await Promise.all(
        profile.profilePhotoIds.map((id) => ctx.storage.getUrl(id))
      );
      profilePhotoUrls = urls.filter((url): url is string => url !== null);
    }

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      createdAt: user._creationTime,
      lastActive: user.lastActive,
      isOnline: user.isOnline,
      isAdmin: user.isAdmin ?? false,
      isBanned: user.isBanned ?? false,
      bannedAt: user.bannedAt,
      bannedReason: user.bannedReason,
      isSuspended: user.isSuspended ?? false,
      suspendedUntil: user.suspendedUntil,
      warningCount: user.warningCount ?? 0,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      referralCredits: user.referralCredits ?? 0,
      profile: profile ? {
        displayName: profile.displayName,
        bio: profile.bio,
        age: profile.age,
        lookingFor: profile.lookingFor,
        interests: profile.interests,
        onboardingComplete: profile.onboardingComplete,
        profilePhotoUrls,
      } : null,
      reportsAgainstCount: reportsAgainst.length,
      reportsMadeCount: reportsMade.length,
      recentReports: reportsAgainst.slice(0, 5).map(r => ({
        _id: r._id,
        reason: r.reason,
        status: r.status,
        reportedAt: r.reportedAt,
      })),
    };
  },
});

// Ban a user
export const banUser = mutation({
  args: {
    adminUserId: v.id("users"),
    userId: v.id("users"),
    reason: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    if (args.adminUserId === args.userId) {
      throw new Error("Cannot ban yourself");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.isAdmin) {
      throw new Error("Cannot ban another admin");
    }

    await ctx.db.patch(args.userId, {
      isBanned: true,
      bannedAt: Date.now(),
      bannedReason: args.reason,
      isSuspended: false, // Clear suspension if banned
      suspendedUntil: undefined,
    });

    // Create moderation notification
    await ctx.scheduler.runAfter(0, internal.moderation.createModerationNotification, {
      userId: args.userId,
      type: "ban",
      reason: args.reason,
    });

    // Send push notification
    await ctx.scheduler.runAfter(0, internal.pushNotifications.queuePushNotification, {
      recipientUserId: args.userId,
      title: "Account Banned",
      body: "Your account has been permanently banned. You may submit an appeal.",
      data: { type: "moderation", url: "/appeal" },
    });

    return { success: true };
  },
});

// Unban a user
export const unbanUser = mutation({
  args: {
    adminUserId: v.id("users"),
    userId: v.id("users"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    await ctx.db.patch(args.userId, {
      isBanned: false,
      bannedAt: undefined,
      bannedReason: undefined,
    });

    return { success: true };
  },
});

// Suspend a user
export const suspendUser = mutation({
  args: {
    adminUserId: v.id("users"),
    userId: v.id("users"),
    days: v.number(),
    reason: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    if (args.adminUserId === args.userId) {
      throw new Error("Cannot suspend yourself");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.isAdmin) {
      throw new Error("Cannot suspend another admin");
    }

    const suspendedUntil = Date.now() + args.days * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.userId, {
      isSuspended: true,
      suspendedUntil,
    });

    // Create moderation notification
    await ctx.scheduler.runAfter(0, internal.moderation.createModerationNotification, {
      userId: args.userId,
      type: "suspension",
      reason: args.reason,
      suspendedUntil,
    });

    // Send push notification
    await ctx.scheduler.runAfter(0, internal.pushNotifications.queuePushNotification, {
      recipientUserId: args.userId,
      title: "Account Suspended",
      body: `Your account has been suspended for ${args.days} days.`,
      data: { type: "moderation", url: "/appeal" },
    });

    return { success: true };
  },
});

// Unsuspend a user
export const unsuspendUser = mutation({
  args: {
    adminUserId: v.id("users"),
    userId: v.id("users"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    await ctx.db.patch(args.userId, {
      isSuspended: false,
      suspendedUntil: undefined,
    });

    return { success: true };
  },
});

// Issue a warning to a user
export const warnUser = mutation({
  args: {
    adminUserId: v.id("users"),
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), newCount: v.number(), autoEscalated: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.isAdmin) {
      throw new Error("Cannot warn an admin");
    }

    if (user.isBanned) {
      throw new Error("User is already banned");
    }

    const newCount = (user.warningCount ?? 0) + 1;
    await ctx.db.patch(args.userId, {
      warningCount: newCount,
    });

    // Create moderation notification
    await ctx.scheduler.runAfter(0, internal.moderation.createModerationNotification, {
      userId: args.userId,
      type: "warning",
      reason: args.reason,
      warningNumber: newCount,
    });

    // Send push notification
    await ctx.scheduler.runAfter(0, internal.pushNotifications.queuePushNotification, {
      recipientUserId: args.userId,
      title: "Account Warning",
      body: `You have received warning ${newCount}. Please review our community guidelines.`,
      data: { type: "moderation" },
    });

    // Check for auto-escalation rules
    const autoEscalated = await checkAutoEscalation(ctx, args.userId, "warning_count", newCount, args.reason);

    return { success: true, newCount, autoEscalated };
  },
});

// Internal function to check and apply auto-escalation rules
async function checkAutoEscalation(
  ctx: any,
  userId: any,
  triggerType: "warning_count" | "report_count",
  currentValue: number,
  reason?: string
): Promise<string | undefined> {
  // Get enabled rules for this trigger type, sorted by threshold descending
  const rules = await ctx.db
    .query("moderationRules")
    .withIndex("by_enabled", (q: any) => q.eq("enabled", true))
    .filter((q: any) => q.eq(q.field("triggerType"), triggerType))
    .collect();

  // Sort by threshold descending to apply the highest applicable rule
  const sortedRules = rules.sort((a: any, b: any) => b.threshold - a.threshold);

  for (const rule of sortedRules) {
    if (currentValue >= rule.threshold) {
      const user = await ctx.db.get(userId);
      if (!user || user.isBanned || user.isAdmin) continue;

      // Skip if action is suspension but user is already suspended
      if (rule.action === "suspension" && user.isSuspended) continue;

      const autoReason = reason
        ? `${reason} (Auto-escalated: ${rule.name})`
        : `Auto-escalated: ${rule.name}`;

      switch (rule.action) {
        case "suspension":
          if (!user.isSuspended) {
            const suspendedUntil = Date.now() + (rule.suspensionDays ?? 7) * 24 * 60 * 60 * 1000;
            await ctx.db.patch(userId, {
              isSuspended: true,
              suspendedUntil,
            });

            // Create notification
            await ctx.scheduler.runAfter(0, internal.moderation.createModerationNotification, {
              userId,
              type: "suspension",
              reason: autoReason,
              suspendedUntil,
            });

            // Send push notification
            await ctx.scheduler.runAfter(0, internal.pushNotifications.queuePushNotification, {
              recipientUserId: userId,
              title: "Account Suspended",
              body: `Your account has been suspended for ${rule.suspensionDays ?? 7} days.`,
              data: { type: "moderation", url: "/appeal" },
            });

            return `suspension (${rule.suspensionDays ?? 7} days)`;
          }
          break;

        case "ban":
          await ctx.db.patch(userId, {
            isBanned: true,
            bannedAt: Date.now(),
            bannedReason: autoReason,
            isSuspended: false,
            suspendedUntil: undefined,
          });

          // Create notification
          await ctx.scheduler.runAfter(0, internal.moderation.createModerationNotification, {
            userId,
            type: "ban",
            reason: autoReason,
          });

          // Send push notification
          await ctx.scheduler.runAfter(0, internal.pushNotifications.queuePushNotification, {
            recipientUserId: userId,
            title: "Account Banned",
            body: "Your account has been permanently banned.",
            data: { type: "moderation", url: "/appeal" },
          });

          return "ban";
      }
    }
  }

  return undefined;
}

// Clear warnings for a user
export const clearWarnings = mutation({
  args: {
    adminUserId: v.id("users"),
    userId: v.id("users"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    await ctx.db.patch(args.userId, {
      warningCount: 0,
    });

    return { success: true };
  },
});

// Toggle admin status
export const toggleAdminStatus = mutation({
  args: {
    adminUserId: v.id("users"),
    userId: v.id("users"),
    makeAdmin: v.boolean(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    if (args.adminUserId === args.userId && !args.makeAdmin) {
      throw new Error("Cannot remove your own admin status");
    }

    await ctx.db.patch(args.userId, {
      isAdmin: args.makeAdmin,
    });

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (for cron jobs)
// ============================================================================

// Auto-clear expired suspensions - called by cron job
export const clearExpiredSuspensions = internalMutation({
  args: {},
  returns: v.object({ clearedCount: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();

    // Get all suspended users whose suspension has expired
    const users = await ctx.db.query("users").collect();
    const expiredSuspensions = users.filter(
      (u) => u.isSuspended === true && u.suspendedUntil && u.suspendedUntil < now
    );

    // Clear their suspension status
    for (const user of expiredSuspensions) {
      await ctx.db.patch(user._id, {
        isSuspended: false,
        suspendedUntil: undefined,
      });
    }

    return { clearedCount: expiredSuspensions.length };
  },
});

// ============================================================================
// MESSAGE REPORTS MANAGEMENT
// ============================================================================

export const getMessageReports = query({
  args: {
    adminUserId: v.id("users"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved"),
      v.literal("dismissed")
    )),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    // Get reports, optionally filtered by status
    let reports;
    if (args.status) {
      reports = await ctx.db
        .query("reportedMessages")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      reports = await ctx.db
        .query("reportedMessages")
        .order("desc")
        .collect();
    }

    // Apply pagination
    const paginatedReports = reports.slice(offset, offset + limit);

    // Populate details
    const reportsWithDetails = await Promise.all(
      paginatedReports.map(async (report) => {
        const [reporter, messageSender, message, reviewer] = await Promise.all([
          ctx.db.get(report.reporterId),
          ctx.db.get(report.messageSenderId),
          ctx.db.get(report.messageId),
          report.reviewedBy ? ctx.db.get(report.reviewedBy) : null,
        ]);

        const senderProfile = messageSender ? await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", messageSender._id))
          .unique() : null;

        return {
          _id: report._id,
          reason: report.reason,
          details: report.details,
          reportedAt: report.reportedAt,
          status: report.status,
          adminNotes: report.adminNotes,
          actionTaken: report.actionTaken,
          reviewedAt: report.reviewedAt,
          message: message ? {
            _id: message._id,
            content: message.content,
            format: message.format,
            sentAt: message.sentAt,
            isHidden: message.isHidden ?? false,
          } : null,
          reporter: reporter ? {
            _id: reporter._id,
            name: reporter.name,
            email: reporter.email,
            imageUrl: reporter.imageUrl,
          } : null,
          messageSender: messageSender ? {
            _id: messageSender._id,
            name: messageSender.name,
            email: messageSender.email,
            imageUrl: messageSender.imageUrl,
            isBanned: messageSender.isBanned,
            isSuspended: messageSender.isSuspended,
            warningCount: messageSender.warningCount ?? 0,
            displayName: senderProfile?.displayName,
          } : null,
          reviewer: reviewer ? {
            _id: reviewer._id,
            name: reviewer.name,
          } : null,
        };
      })
    );

    return {
      reports: reportsWithDetails,
      total: reports.length,
      hasMore: offset + limit < reports.length,
    };
  },
});

// Hide a message
export const hideMessage = mutation({
  args: {
    adminUserId: v.id("users"),
    messageId: v.id("messages"),
    reason: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    await ctx.db.patch(args.messageId, {
      isHidden: true,
      hiddenAt: Date.now(),
      hiddenBy: args.adminUserId,
      hiddenReason: args.reason,
    });

    return { success: true };
  },
});

// Unhide a message
export const unhideMessage = mutation({
  args: {
    adminUserId: v.id("users"),
    messageId: v.id("messages"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    await ctx.db.patch(args.messageId, {
      isHidden: false,
      hiddenAt: undefined,
      hiddenBy: undefined,
      hiddenReason: undefined,
    });

    return { success: true };
  },
});

// Update message report status and take action
export const updateMessageReportStatus = mutation({
  args: {
    adminUserId: v.id("users"),
    reportId: v.id("reportedMessages"),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved"),
      v.literal("dismissed")
    ),
    adminNotes: v.optional(v.string()),
    actionTaken: v.optional(v.union(
      v.literal("none"),
      v.literal("message_hidden"),
      v.literal("user_warning"),
      v.literal("user_suspension"),
      v.literal("user_ban")
    )),
    suspensionDays: v.optional(v.number()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    // Update report
    await ctx.db.patch(args.reportId, {
      status: args.status,
      reviewedBy: args.adminUserId,
      reviewedAt: Date.now(),
      adminNotes: args.adminNotes,
      actionTaken: args.actionTaken,
    });

    // Take action based on actionTaken
    if (args.actionTaken && args.actionTaken !== "none") {
      const message = await ctx.db.get(report.messageId);

      switch (args.actionTaken) {
        case "message_hidden":
          if (message) {
            await ctx.db.patch(report.messageId, {
              isHidden: true,
              hiddenAt: Date.now(),
              hiddenBy: args.adminUserId,
              hiddenReason: args.adminNotes ?? report.reason,
            });
          }
          break;

        case "user_warning":
          const userToWarn = await ctx.db.get(report.messageSenderId);
          if (userToWarn) {
            await ctx.db.patch(report.messageSenderId, {
              warningCount: (userToWarn.warningCount ?? 0) + 1,
            });
          }
          break;

        case "user_suspension":
          const userToSuspend = await ctx.db.get(report.messageSenderId);
          if (userToSuspend && !userToSuspend.isAdmin) {
            const suspensionDays = args.suspensionDays ?? 7;
            await ctx.db.patch(report.messageSenderId, {
              isSuspended: true,
              suspendedUntil: Date.now() + suspensionDays * 24 * 60 * 60 * 1000,
            });
          }
          break;

        case "user_ban":
          const userToBan = await ctx.db.get(report.messageSenderId);
          if (userToBan && !userToBan.isAdmin) {
            await ctx.db.patch(report.messageSenderId, {
              isBanned: true,
              bannedAt: Date.now(),
              bannedReason: args.adminNotes ?? report.reason,
              isSuspended: false,
              suspendedUntil: undefined,
            });
          }
          break;
      }
    }

    return { success: true };
  },
});

// ============================================================================
// MODERATION RULES MANAGEMENT
// ============================================================================

// Get all moderation rules
export const getModerationRules = query({
  args: {
    adminUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const rules = await ctx.db
      .query("moderationRules")
      .order("desc")
      .collect();

    return rules;
  },
});

// Create a new moderation rule
export const createModerationRule = mutation({
  args: {
    adminUserId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    enabled: v.boolean(),
    triggerType: v.union(v.literal("warning_count"), v.literal("report_count")),
    threshold: v.number(),
    action: v.union(v.literal("warning"), v.literal("suspension"), v.literal("ban")),
    suspensionDays: v.optional(v.number()),
  },
  returns: v.id("moderationRules"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const now = Date.now();
    const ruleId = await ctx.db.insert("moderationRules", {
      name: args.name,
      description: args.description,
      enabled: args.enabled,
      triggerType: args.triggerType,
      threshold: args.threshold,
      action: args.action,
      suspensionDays: args.suspensionDays,
      createdAt: now,
      updatedAt: now,
    });

    return ruleId;
  },
});

// Update a moderation rule
export const updateModerationRule = mutation({
  args: {
    adminUserId: v.id("users"),
    ruleId: v.id("moderationRules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    triggerType: v.optional(v.union(v.literal("warning_count"), v.literal("report_count"))),
    threshold: v.optional(v.number()),
    action: v.optional(v.union(v.literal("warning"), v.literal("suspension"), v.literal("ban"))),
    suspensionDays: v.optional(v.number()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.enabled !== undefined) updates.enabled = args.enabled;
    if (args.triggerType !== undefined) updates.triggerType = args.triggerType;
    if (args.threshold !== undefined) updates.threshold = args.threshold;
    if (args.action !== undefined) updates.action = args.action;
    if (args.suspensionDays !== undefined) updates.suspensionDays = args.suspensionDays;

    await ctx.db.patch(args.ruleId, updates);

    return { success: true };
  },
});

// Delete a moderation rule
export const deleteModerationRule = mutation({
  args: {
    adminUserId: v.id("users"),
    ruleId: v.id("moderationRules"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    await ctx.db.delete(args.ruleId);

    return { success: true };
  },
});

// Seed default moderation rules (for initial setup)
export const seedDefaultModerationRules = mutation({
  args: {
    adminUserId: v.id("users"),
  },
  returns: v.object({ success: v.boolean(), rulesCreated: v.number() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    // Check if any rules already exist
    const existingRules = await ctx.db.query("moderationRules").collect();
    if (existingRules.length > 0) {
      return { success: true, rulesCreated: 0 };
    }

    const now = Date.now();
    const defaultRules = [
      {
        name: "3 Warnings = 7-day Suspension",
        description: "Automatically suspend users who reach 3 warnings",
        triggerType: "warning_count" as const,
        threshold: 3,
        action: "suspension" as const,
        suspensionDays: 7,
      },
      {
        name: "5 Warnings = Permanent Ban",
        description: "Automatically ban users who reach 5 warnings",
        triggerType: "warning_count" as const,
        threshold: 5,
        action: "ban" as const,
      },
    ];

    for (const rule of defaultRules) {
      await ctx.db.insert("moderationRules", {
        ...rule,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, rulesCreated: defaultRules.length };
  },
});

// ============================================================================
// APPEALS MANAGEMENT
// ============================================================================

// Get all appeals for admin review
export const getAllAppeals = query({
  args: {
    adminUserId: v.id("users"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("under_review"),
      v.literal("accepted"),
      v.literal("rejected")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const limit = args.limit ?? 50;

    let appeals;
    if (args.status) {
      appeals = await ctx.db
        .query("appeals")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    } else {
      appeals = await ctx.db
        .query("appeals")
        .withIndex("by_submittedAt")
        .order("desc")
        .take(limit);
    }

    // Enrich with user info
    const enrichedAppeals = await Promise.all(
      appeals.map(async (appeal) => {
        const user = await ctx.db.get(appeal.userId);
        const profile = user
          ? await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q) => q.eq("userId", user._id))
              .first()
          : null;

        const reviewedByUser = appeal.reviewedBy
          ? await ctx.db.get(appeal.reviewedBy)
          : null;

        return {
          ...appeal,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                imageUrl: user.imageUrl,
                isBanned: user.isBanned,
                isSuspended: user.isSuspended,
                suspendedUntil: user.suspendedUntil,
                warningCount: user.warningCount,
              }
            : null,
          profile: profile
            ? {
                displayName: profile.displayName,
              }
            : null,
          reviewedByUser: reviewedByUser
            ? {
                name: reviewedByUser.name,
              }
            : null,
        };
      })
    );

    return enrichedAppeals;
  },
});

// Get appeal counts by status
export const getAppealCounts = query({
  args: {
    adminUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const allAppeals = await ctx.db.query("appeals").collect();

    return {
      pending: allAppeals.filter((a) => a.status === "pending").length,
      under_review: allAppeals.filter((a) => a.status === "under_review").length,
      accepted: allAppeals.filter((a) => a.status === "accepted").length,
      rejected: allAppeals.filter((a) => a.status === "rejected").length,
      total: allAppeals.length,
    };
  },
});

// Update appeal status (accept/reject)
export const updateAppealStatus = mutation({
  args: {
    adminUserId: v.id("users"),
    appealId: v.id("appeals"),
    status: v.union(
      v.literal("under_review"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    adminResponse: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const appeal = await ctx.db.get(args.appealId);
    if (!appeal) {
      throw new Error("Appeal not found");
    }

    const user = await ctx.db.get(appeal.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Update appeal status
    await ctx.db.patch(args.appealId, {
      status: args.status,
      reviewedBy: args.adminUserId,
      reviewedAt: Date.now(),
      adminResponse: args.adminResponse,
    });

    // If accepted, lift the ban/suspension based on appeal type
    if (args.status === "accepted") {
      if (appeal.appealType === "ban") {
        await ctx.db.patch(appeal.userId, {
          isBanned: false,
          bannedAt: undefined,
          bannedReason: undefined,
        });
      } else if (appeal.appealType === "suspension") {
        await ctx.db.patch(appeal.userId, {
          isSuspended: false,
          suspendedUntil: undefined,
        });
      } else if (appeal.appealType === "warning") {
        // Reduce warning count by 1 (but not below 0)
        const currentWarnings = user.warningCount ?? 0;
        await ctx.db.patch(appeal.userId, {
          warningCount: Math.max(0, currentWarnings - 1),
        });
      }

      // Create notification for user
      await ctx.scheduler.runAfter(0, internal.moderation.createModerationNotification, {
        userId: appeal.userId,
        type: "appeal_accepted",
        reason: args.adminResponse || "Your appeal has been accepted.",
        appealId: args.appealId,
      });

      // Send push notification
      await ctx.scheduler.runAfter(0, internal.pushNotifications.queuePushNotification, {
        recipientUserId: appeal.userId,
        title: "Appeal Accepted",
        body: "Your appeal has been reviewed and accepted.",
        data: {
          type: "moderation",
        },
      });
    } else if (args.status === "rejected") {
      // Create notification for user
      await ctx.scheduler.runAfter(0, internal.moderation.createModerationNotification, {
        userId: appeal.userId,
        type: "appeal_rejected",
        reason: args.adminResponse || "Your appeal has been reviewed and rejected.",
        appealId: args.appealId,
      });

      // Send push notification
      await ctx.scheduler.runAfter(0, internal.pushNotifications.queuePushNotification, {
        recipientUserId: appeal.userId,
        title: "Appeal Decision",
        body: "Your appeal has been reviewed. Check the app for details.",
        data: {
          type: "moderation",
        },
      });
    }

    return { success: true };
  },
});
