import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ============================================================================
// SUBSCRIPTION-BASED LIMITS FOR ADMIRERS
// ============================================================================
const FREE_PROFILE_VIEWERS_LIMIT = 3;     // Free users can see last 3 profile viewers
const FREE_WAVES_LIMIT = 3;               // Free users can see last 3 waves
const ULTRA_PROFILE_VIEWERS_LIMIT = 50;   // Ultra users can see last 50 profile viewers
const ULTRA_WAVES_LIMIT = 50;             // Ultra users can see last 50 waves

// ============================================================================
// WAVES FUNCTIONS
// ============================================================================

// Send a wave to another user
export const sendWave = mutation({
  args: {
    waverId: v.id("users"),
    wavedAtId: v.id("users"),
  },
  returns: v.object({ success: v.boolean(), alreadyWaved: v.boolean() }),
  handler: async (ctx, args) => {
    if (args.waverId === args.wavedAtId) {
      return { success: false, alreadyWaved: false };
    }

    // Check if already waved (only one active wave at a time per pair)
    const existingWave = await ctx.db
      .query("waves")
      .withIndex("by_waver_wavedAt", (q) =>
        q.eq("waverId", args.waverId).eq("wavedAtId", args.wavedAtId)
      )
      .unique();

    if (existingWave) {
      return { success: true, alreadyWaved: true };
    }

    // Record the wave
    await ctx.db.insert("waves", {
      waverId: args.waverId,
      wavedAtId: args.wavedAtId,
      wavedAt: Date.now(),
    });

    return { success: true, alreadyWaved: false };
  },
});

// Check if user has waved at another user
export const hasWavedAt = query({
  args: {
    waverId: v.id("users"),
    wavedAtId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const wave = await ctx.db
      .query("waves")
      .withIndex("by_waver_wavedAt", (q) =>
        q.eq("waverId", args.waverId).eq("wavedAtId", args.wavedAtId)
      )
      .unique();
    return wave !== null;
  },
});

// Get users who waved at me (with subscription limits)
export const getMyWaves = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    waves: v.array(
      v.object({
        _id: v.id("waves"),
        waver: v.object({
          _id: v.id("users"),
          name: v.string(),
          imageUrl: v.optional(v.string()),
          isOnline: v.optional(v.boolean()),
          profile: v.union(
            v.object({
              displayName: v.optional(v.string()),
              age: v.optional(v.number()),
              profilePhotoUrl: v.optional(v.string()),
            }),
            v.null()
          ),
        }),
        wavedAt: v.number(),
      })
    ),
    totalCount: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Get user to check subscription status
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { waves: [], totalCount: 0, hasMore: false };
    }

    // Determine if user has Ultra subscription
    const isUltra =
      (user.subscriptionTier === "ultra" && user.subscriptionStatus === "active") ||
      (user.referralUltraExpiresAt !== undefined && user.referralUltraExpiresAt > Date.now());

    const maxLimit = isUltra ? ULTRA_WAVES_LIMIT : FREE_WAVES_LIMIT;
    const requestedLimit = args.limit ?? maxLimit;
    const limit = Math.min(requestedLimit, maxLimit);

    // Get all waves for counting
    const allWaves = await ctx.db
      .query("waves")
      .withIndex("by_wavedAt", (q) => q.eq("wavedAtId", args.userId))
      .collect();

    const totalCount = allWaves.length;

    // Sort by most recent and apply limit
    const sortedWaves = allWaves
      .sort((a, b) => b.wavedAt - a.wavedAt)
      .slice(0, limit);

    // Get waver details with profiles
    const wavesWithDetails = await Promise.all(
      sortedWaves.map(async (wave) => {
        const waver = await ctx.db.get(wave.waverId);
        if (!waver) return null;

        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", waver._id))
          .unique();

        // Get profile photo URL
        let profilePhotoUrl: string | undefined;
        if (profile?.profilePhotoIds && profile.profilePhotoIds.length > 0) {
          profilePhotoUrl = await ctx.storage.getUrl(profile.profilePhotoIds[0]) ?? undefined;
        }

        return {
          _id: wave._id,
          waver: {
            _id: waver._id,
            name: waver.name,
            imageUrl: waver.imageUrl,
            isOnline: waver.isOnline,
            profile: profile
              ? {
                  displayName: profile.displayName,
                  age: profile.age,
                  profilePhotoUrl,
                }
              : null,
          },
          wavedAt: wave.wavedAt,
        };
      })
    );

    return {
      waves: wavesWithDetails.filter((w): w is NonNullable<typeof w> => w !== null),
      totalCount,
      hasMore: totalCount > limit,
    };
  },
});

// ============================================================================
// PROFILE VIEWERS FUNCTIONS
// ============================================================================

// Get users who viewed my profile (with subscription limits)
export const getMyProfileViewers = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    viewers: v.array(
      v.object({
        viewerId: v.id("users"),
        viewer: v.object({
          _id: v.id("users"),
          name: v.string(),
          imageUrl: v.optional(v.string()),
          isOnline: v.optional(v.boolean()),
          profile: v.union(
            v.object({
              displayName: v.optional(v.string()),
              age: v.optional(v.number()),
              profilePhotoUrl: v.optional(v.string()),
            }),
            v.null()
          ),
        }),
        lastViewedAt: v.number(),
      })
    ),
    totalCount: v.number(),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Get user to check subscription status
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { viewers: [], totalCount: 0, hasMore: false };
    }

    // Determine if user has Ultra subscription
    const isUltra =
      (user.subscriptionTier === "ultra" && user.subscriptionStatus === "active") ||
      (user.referralUltraExpiresAt !== undefined && user.referralUltraExpiresAt > Date.now());

    const maxLimit = isUltra ? ULTRA_PROFILE_VIEWERS_LIMIT : FREE_PROFILE_VIEWERS_LIMIT;
    const requestedLimit = args.limit ?? maxLimit;
    const limit = Math.min(requestedLimit, maxLimit);

    // Get all profile views for this user
    const allViews = await ctx.db
      .query("profileViews")
      .withIndex("by_viewed", (q) => q.eq("viewedId", args.userId))
      .collect();

    // Group by viewer and get the most recent view for each
    const viewerMap = new Map<string, { viewerId: typeof allViews[0]["viewerId"]; lastViewedAt: number }>();
    for (const view of allViews) {
      const viewerIdStr = view.viewerId as string;
      const existing = viewerMap.get(viewerIdStr);
      if (!existing || view.viewedAt > existing.lastViewedAt) {
        viewerMap.set(viewerIdStr, { viewerId: view.viewerId, lastViewedAt: view.viewedAt });
      }
    }

    // Convert to array and sort by most recent
    const uniqueViewers = Array.from(viewerMap.values())
      .sort((a, b) => b.lastViewedAt - a.lastViewedAt);

    const totalCount = uniqueViewers.length;

    // Apply limit
    const limitedViewers = uniqueViewers.slice(0, limit);

    // Get viewer details with profiles
    const viewersWithDetails = await Promise.all(
      limitedViewers.map(async (view) => {
        const viewer = await ctx.db.get(view.viewerId);
        if (!viewer) return null;

        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", view.viewerId))
          .unique();

        // Get profile photo URL
        let profilePhotoUrl: string | undefined;
        if (profile?.profilePhotoIds && profile.profilePhotoIds.length > 0) {
          profilePhotoUrl = await ctx.storage.getUrl(profile.profilePhotoIds[0]) ?? undefined;
        }

        return {
          viewerId: view.viewerId,
          viewer: {
            _id: view.viewerId,
            name: viewer.name,
            imageUrl: viewer.imageUrl,
            isOnline: viewer.isOnline,
            profile: profile
              ? {
                  displayName: profile.displayName,
                  age: profile.age,
                  profilePhotoUrl,
                }
              : null,
          },
          lastViewedAt: view.lastViewedAt,
        };
      })
    );

    return {
      viewers: viewersWithDetails.filter((v): v is NonNullable<typeof v> => v !== null),
      totalCount,
      hasMore: totalCount > limit,
    };
  },
});

// ============================================================================
// COMBINED ADMIRERS STATS
// ============================================================================

// Get total counts of waves and profile views for stats display
export const getAdmirersStats = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.object({
    totalWaves: v.number(),
    totalViewers: v.number(),
    isUltra: v.boolean(),
    wavesLimit: v.number(),
    viewersLimit: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get user to check subscription status
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return {
        totalWaves: 0,
        totalViewers: 0,
        isUltra: false,
        wavesLimit: FREE_WAVES_LIMIT,
        viewersLimit: FREE_PROFILE_VIEWERS_LIMIT,
      };
    }

    // Determine if user has Ultra subscription
    const isUltra =
      (user.subscriptionTier === "ultra" && user.subscriptionStatus === "active") ||
      (user.referralUltraExpiresAt !== undefined && user.referralUltraExpiresAt > Date.now());

    // Count total waves
    const allWaves = await ctx.db
      .query("waves")
      .withIndex("by_wavedAt", (q) => q.eq("wavedAtId", args.userId))
      .collect();

    // Count unique profile viewers
    const allViews = await ctx.db
      .query("profileViews")
      .withIndex("by_viewed", (q) => q.eq("viewedId", args.userId))
      .collect();

    const uniqueViewers = new Set(allViews.map((v) => v.viewerId));

    return {
      totalWaves: allWaves.length,
      totalViewers: uniqueViewers.size,
      isUltra,
      wavesLimit: isUltra ? ULTRA_WAVES_LIMIT : FREE_WAVES_LIMIT,
      viewersLimit: isUltra ? ULTRA_PROFILE_VIEWERS_LIMIT : FREE_PROFILE_VIEWERS_LIMIT,
    };
  },
});
