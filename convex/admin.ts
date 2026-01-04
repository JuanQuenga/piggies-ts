import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

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

    await ctx.db.patch(args.userId, {
      isSuspended: true,
      suspendedUntil: Date.now() + args.days * 24 * 60 * 60 * 1000,
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
  },
  returns: v.object({ success: v.boolean(), newCount: v.number() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminUserId as string);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const newCount = (user.warningCount ?? 0) + 1;
    await ctx.db.patch(args.userId, {
      warningCount: newCount,
    });

    return { success: true, newCount };
  },
});

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
