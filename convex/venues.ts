import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ============================================================================
// CONSTANTS
// ============================================================================

const FREE_WEEKLY_VENUE_SUBMISSION_LIMIT = 1;
const FREE_MAX_VENUE_FAVORITES = 10;
const REPORTS_TO_AUTO_FLAG = 3;

// Venue category validator
const venueCategoryValidator = v.union(
  v.literal("bars_nightlife"),
  v.literal("adult_venues"),
  v.literal("fitness_wellness"),
  v.literal("events_social"),
  v.literal("health_clinics")
);

// Venue status validator
const venueStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("flagged")
);

// Report reason validator
const reportReasonValidator = v.union(
  v.literal("closed_permanently"),
  v.literal("incorrect_info"),
  v.literal("inappropriate"),
  v.literal("duplicate"),
  v.literal("other")
);

// Helper function to calculate distance between two points using Haversine formula
const calculateDistanceMiles = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper to check if user has Ultra subscription
const checkIsUltra = (user: {
  subscriptionTier?: "free" | "pro" | "ultra";
  subscriptionStatus?: "active" | "canceled" | "revoked";
  referralUltraExpiresAt?: number;
}): boolean => {
  if (user.subscriptionTier === "ultra" && user.subscriptionStatus === "active") {
    return true;
  }
  if (user.referralUltraExpiresAt && user.referralUltraExpiresAt > Date.now()) {
    return true;
  }
  return false;
};

// ============================================================================
// QUERIES
// ============================================================================

// Get nearby approved venues with distance calculation
export const getNearbyVenues = query({
  args: {
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    maxDistanceMiles: v.optional(v.number()),
    category: v.optional(venueCategoryValidator),
    features: v.optional(v.array(v.string())),
    searchQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("communityVenues"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      category: venueCategoryValidator,
      latitude: v.number(),
      longitude: v.number(),
      address: v.string(),
      city: v.string(),
      state: v.optional(v.string()),
      country: v.string(),
      phone: v.optional(v.string()),
      website: v.optional(v.string()),
      instagram: v.optional(v.string()),
      features: v.optional(v.array(v.string())),
      hoursNote: v.optional(v.string()),
      favoriteCount: v.optional(v.number()),
      distanceMiles: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const maxDistance = args.maxDistanceMiles ?? 50;

    // Get approved venues
    let venues;
    if (args.category) {
      venues = await ctx.db
        .query("communityVenues")
        .withIndex("by_category_status", (q) =>
          q.eq("category", args.category!).eq("status", "approved")
        )
        .collect();
    } else {
      venues = await ctx.db
        .query("communityVenues")
        .withIndex("by_status", (q) => q.eq("status", "approved"))
        .collect();
    }

    // Map venues with distance calculation
    let result = venues.map((venue) => {
      let distanceMiles: number | undefined;
      if (args.latitude !== undefined && args.longitude !== undefined) {
        distanceMiles = calculateDistanceMiles(
          args.latitude,
          args.longitude,
          venue.latitude,
          venue.longitude
        );
      }

      return {
        _id: venue._id,
        _creationTime: venue._creationTime,
        name: venue.name,
        description: venue.description,
        category: venue.category,
        latitude: venue.latitude,
        longitude: venue.longitude,
        address: venue.address,
        city: venue.city,
        state: venue.state,
        country: venue.country,
        phone: venue.phone,
        website: venue.website,
        instagram: venue.instagram,
        features: venue.features,
        hoursNote: venue.hoursNote,
        favoriteCount: venue.favoriteCount,
        distanceMiles,
      };
    });

    // Filter by distance if coordinates provided
    if (args.latitude !== undefined && args.longitude !== undefined) {
      result = result.filter(
        (v) => v.distanceMiles !== undefined && v.distanceMiles <= maxDistance
      );
    }

    // Filter by features
    if (args.features && args.features.length > 0) {
      result = result.filter((v) => {
        if (!v.features || v.features.length === 0) return false;
        return args.features!.some((feature) => v.features!.includes(feature));
      });
    }

    // Filter by search query (name match)
    if (args.searchQuery && args.searchQuery.trim() !== "") {
      const searchTerm = args.searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(searchTerm) ||
          v.city.toLowerCase().includes(searchTerm) ||
          v.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by distance (closest first)
    if (args.latitude !== undefined && args.longitude !== undefined) {
      result.sort((a, b) => {
        const distA = a.distanceMiles ?? Infinity;
        const distB = b.distanceMiles ?? Infinity;
        return distA - distB;
      });
    }

    return result.slice(0, limit);
  },
});

// Get single venue by ID
export const getVenueById = query({
  args: {
    venueId: v.id("communityVenues"),
    userId: v.optional(v.id("users")),
  },
  returns: v.union(
    v.object({
      _id: v.id("communityVenues"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      category: venueCategoryValidator,
      latitude: v.number(),
      longitude: v.number(),
      address: v.string(),
      city: v.string(),
      state: v.optional(v.string()),
      country: v.string(),
      phone: v.optional(v.string()),
      website: v.optional(v.string()),
      instagram: v.optional(v.string()),
      features: v.optional(v.array(v.string())),
      hoursNote: v.optional(v.string()),
      status: venueStatusValidator,
      favoriteCount: v.optional(v.number()),
      viewCount: v.optional(v.number()),
      submittedAt: v.number(),
      isFavorited: v.boolean(),
      submitterName: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const venue = await ctx.db.get(args.venueId);
    if (!venue) return null;

    // Check if favorited by current user
    let isFavorited = false;
    if (args.userId) {
      const favorite = await ctx.db
        .query("venueFavorites")
        .withIndex("by_user_venue", (q) =>
          q.eq("userId", args.userId!).eq("venueId", args.venueId)
        )
        .unique();
      isFavorited = favorite !== null;
    }

    // Get submitter name
    let submitterName: string | undefined;
    const submitter = await ctx.db.get(venue.submittedBy);
    if (submitter) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", submitter._id))
        .unique();
      submitterName = profile?.displayName || submitter.name;
    }

    return {
      _id: venue._id,
      _creationTime: venue._creationTime,
      name: venue.name,
      description: venue.description,
      category: venue.category,
      latitude: venue.latitude,
      longitude: venue.longitude,
      address: venue.address,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      phone: venue.phone,
      website: venue.website,
      instagram: venue.instagram,
      features: venue.features,
      hoursNote: venue.hoursNote,
      status: venue.status,
      favoriteCount: venue.favoriteCount,
      viewCount: venue.viewCount,
      submittedAt: venue.submittedAt,
      isFavorited,
      submitterName,
    };
  },
});

// Get venues submitted by a user
export const getMySubmittedVenues = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("communityVenues"),
      _creationTime: v.number(),
      name: v.string(),
      category: venueCategoryValidator,
      city: v.string(),
      status: venueStatusValidator,
      submittedAt: v.number(),
      rejectionReason: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const venues = await ctx.db
      .query("communityVenues")
      .withIndex("by_submittedBy", (q) => q.eq("submittedBy", args.userId))
      .collect();

    return venues.map((v) => ({
      _id: v._id,
      _creationTime: v._creationTime,
      name: v.name,
      category: v.category,
      city: v.city,
      status: v.status,
      submittedAt: v.submittedAt,
      rejectionReason: v.rejectionReason,
    }));
  },
});

// Get user's favorite venues
export const getFavoriteVenues = query({
  args: {
    userId: v.id("users"),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("communityVenues"),
      name: v.string(),
      category: venueCategoryValidator,
      city: v.string(),
      address: v.string(),
      distanceMiles: v.optional(v.number()),
      favoritedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("venueFavorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const venuesWithDetails = await Promise.all(
      favorites.map(async (fav) => {
        const venue = await ctx.db.get(fav.venueId);
        if (!venue || venue.status !== "approved") return null;

        let distanceMiles: number | undefined;
        if (args.latitude !== undefined && args.longitude !== undefined) {
          distanceMiles = calculateDistanceMiles(
            args.latitude,
            args.longitude,
            venue.latitude,
            venue.longitude
          );
        }

        return {
          _id: venue._id,
          name: venue.name,
          category: venue.category,
          city: venue.city,
          address: venue.address,
          distanceMiles,
          favoritedAt: fav.favoritedAt,
        };
      })
    );

    return venuesWithDetails.filter(
      (v): v is NonNullable<typeof v> => v !== null
    );
  },
});

// Check if user can submit a venue (for free user limit)
export const canSubmitVenue = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.object({
    canSubmit: v.boolean(),
    submissionsThisWeek: v.number(),
    limit: v.number(),
    isUltra: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { canSubmit: false, submissionsThisWeek: 0, limit: 0, isUltra: false };
    }

    const isUltra = checkIsUltra(user);
    if (isUltra) {
      return { canSubmit: true, submissionsThisWeek: 0, limit: Infinity, isUltra: true };
    }

    // Check submissions in the last 7 days
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentSubmissions = await ctx.db
      .query("communityVenues")
      .withIndex("by_submittedBy", (q) => q.eq("submittedBy", args.userId))
      .filter((q) => q.gte(q.field("submittedAt"), oneWeekAgo))
      .collect();

    return {
      canSubmit: recentSubmissions.length < FREE_WEEKLY_VENUE_SUBMISSION_LIMIT,
      submissionsThisWeek: recentSubmissions.length,
      limit: FREE_WEEKLY_VENUE_SUBMISSION_LIMIT,
      isUltra: false,
    };
  },
});

// Get user's venue favorite count (for free user limit)
export const getVenueFavoriteCount = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.object({
    count: v.number(),
    limit: v.number(),
    isUltra: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { count: 0, limit: FREE_MAX_VENUE_FAVORITES, isUltra: false };
    }

    const isUltra = checkIsUltra(user);
    const favorites = await ctx.db
      .query("venueFavorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      count: favorites.length,
      limit: isUltra ? Infinity : FREE_MAX_VENUE_FAVORITES,
      isUltra,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

// Submit a new venue
export const submitVenue = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    category: venueCategoryValidator,
    latitude: v.number(),
    longitude: v.number(),
    address: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    instagram: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    hoursNote: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    venueId: v.optional(v.id("communityVenues")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const isUltra = checkIsUltra(user);

    // Check submission limits for free users
    if (!isUltra) {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentSubmissions = await ctx.db
        .query("communityVenues")
        .withIndex("by_submittedBy", (q) => q.eq("submittedBy", args.userId))
        .filter((q) => q.gte(q.field("submittedAt"), oneWeekAgo))
        .collect();

      if (recentSubmissions.length >= FREE_WEEKLY_VENUE_SUBMISSION_LIMIT) {
        return {
          success: false,
          error: "Free users can submit 1 venue per week. Upgrade to Ultra for unlimited submissions!",
        };
      }
    }

    const venueId = await ctx.db.insert("communityVenues", {
      name: args.name,
      description: args.description,
      category: args.category,
      latitude: args.latitude,
      longitude: args.longitude,
      address: args.address,
      city: args.city,
      state: args.state,
      country: args.country,
      phone: args.phone,
      website: args.website,
      instagram: args.instagram,
      features: args.features,
      hoursNote: args.hoursNote,
      submittedBy: args.userId,
      submittedAt: Date.now(),
      status: "pending",
      viewCount: 0,
      favoriteCount: 0,
    });

    return { success: true, venueId };
  },
});

// Toggle venue favorite
export const toggleVenueFavorite = mutation({
  args: {
    userId: v.id("users"),
    venueId: v.id("communityVenues"),
  },
  returns: v.object({
    success: v.boolean(),
    isFavorited: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, isFavorited: false, error: "User not found" };
    }

    const venue = await ctx.db.get(args.venueId);
    if (!venue) {
      return { success: false, isFavorited: false, error: "Venue not found" };
    }

    // Check if already favorited
    const existing = await ctx.db
      .query("venueFavorites")
      .withIndex("by_user_venue", (q) =>
        q.eq("userId", args.userId).eq("venueId", args.venueId)
      )
      .unique();

    if (existing) {
      // Remove favorite
      await ctx.db.delete(existing._id);

      // Decrement favorite count
      await ctx.db.patch(args.venueId, {
        favoriteCount: Math.max(0, (venue.favoriteCount ?? 0) - 1),
      });

      return { success: true, isFavorited: false };
    } else {
      // Check limit for free users
      const isUltra = checkIsUltra(user);
      if (!isUltra) {
        const favorites = await ctx.db
          .query("venueFavorites")
          .withIndex("by_user", (q) => q.eq("userId", args.userId))
          .collect();

        if (favorites.length >= FREE_MAX_VENUE_FAVORITES) {
          return {
            success: false,
            isFavorited: false,
            error: `Free users can only favorite ${FREE_MAX_VENUE_FAVORITES} venues. Upgrade to Ultra for unlimited!`,
          };
        }
      }

      // Add favorite
      await ctx.db.insert("venueFavorites", {
        userId: args.userId,
        venueId: args.venueId,
        favoritedAt: Date.now(),
      });

      // Increment favorite count
      await ctx.db.patch(args.venueId, {
        favoriteCount: (venue.favoriteCount ?? 0) + 1,
      });

      return { success: true, isFavorited: true };
    }
  },
});

// Report a venue
export const reportVenue = mutation({
  args: {
    venueId: v.id("communityVenues"),
    reporterId: v.id("users"),
    reason: reportReasonValidator,
    details: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const venue = await ctx.db.get(args.venueId);
    if (!venue) {
      return { success: false, error: "Venue not found" };
    }

    // Check if user already reported this venue
    const existingReport = await ctx.db
      .query("venueReports")
      .withIndex("by_venue", (q) => q.eq("venueId", args.venueId))
      .filter((q) => q.eq(q.field("reporterId"), args.reporterId))
      .unique();

    if (existingReport) {
      return { success: false, error: "You have already reported this venue" };
    }

    await ctx.db.insert("venueReports", {
      venueId: args.venueId,
      reporterId: args.reporterId,
      reason: args.reason,
      details: args.details,
      reportedAt: Date.now(),
      status: "pending",
    });

    // Check if venue should be auto-flagged
    const reports = await ctx.db
      .query("venueReports")
      .withIndex("by_venue", (q) => q.eq("venueId", args.venueId))
      .collect();

    if (reports.length >= REPORTS_TO_AUTO_FLAG && venue.status === "approved") {
      await ctx.db.patch(args.venueId, { status: "flagged" });
    }

    return { success: true };
  },
});

// Record venue view
export const recordVenueView = mutation({
  args: {
    venueId: v.id("communityVenues"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const venue = await ctx.db.get(args.venueId);
    if (venue) {
      await ctx.db.patch(args.venueId, {
        viewCount: (venue.viewCount ?? 0) + 1,
      });
    }
    return null;
  },
});

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

// Get pending venues for admin review
export const getPendingVenues = query({
  args: {
    adminUserId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("communityVenues"),
      name: v.string(),
      category: venueCategoryValidator,
      city: v.string(),
      address: v.string(),
      submittedAt: v.number(),
      submitterName: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Verify admin
    const admin = await ctx.db.get(args.adminUserId);
    if (!admin?.isAdmin) {
      return [];
    }

    const venues = await ctx.db
      .query("communityVenues")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const venuesWithSubmitters = await Promise.all(
      venues.map(async (v) => {
        const submitter = await ctx.db.get(v.submittedBy);
        const profile = submitter
          ? await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q) => q.eq("userId", submitter._id))
              .unique()
          : null;

        return {
          _id: v._id,
          name: v.name,
          category: v.category,
          city: v.city,
          address: v.address,
          submittedAt: v.submittedAt,
          submitterName: profile?.displayName || submitter?.name,
        };
      })
    );

    return venuesWithSubmitters;
  },
});

// Get flagged venues for admin review
export const getFlaggedVenues = query({
  args: {
    adminUserId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("communityVenues"),
      name: v.string(),
      category: venueCategoryValidator,
      city: v.string(),
      reportCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Verify admin
    const admin = await ctx.db.get(args.adminUserId);
    if (!admin?.isAdmin) {
      return [];
    }

    const venues = await ctx.db
      .query("communityVenues")
      .withIndex("by_status", (q) => q.eq("status", "flagged"))
      .collect();

    const venuesWithReportCount = await Promise.all(
      venues.map(async (v) => {
        const reports = await ctx.db
          .query("venueReports")
          .withIndex("by_venue", (q) => q.eq("venueId", v._id))
          .collect();

        return {
          _id: v._id,
          name: v.name,
          category: v.category,
          city: v.city,
          reportCount: reports.length,
        };
      })
    );

    return venuesWithReportCount;
  },
});

// Approve a venue
export const approveVenue = mutation({
  args: {
    adminUserId: v.id("users"),
    venueId: v.id("communityVenues"),
  },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminUserId);
    if (!admin?.isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const venue = await ctx.db.get(args.venueId);
    if (!venue) {
      return { success: false, error: "Venue not found" };
    }

    await ctx.db.patch(args.venueId, {
      status: "approved",
      reviewedBy: args.adminUserId,
      reviewedAt: Date.now(),
    });

    return { success: true };
  },
});

// Reject a venue
export const rejectVenue = mutation({
  args: {
    adminUserId: v.id("users"),
    venueId: v.id("communityVenues"),
    reason: v.string(),
  },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminUserId);
    if (!admin?.isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const venue = await ctx.db.get(args.venueId);
    if (!venue) {
      return { success: false, error: "Venue not found" };
    }

    await ctx.db.patch(args.venueId, {
      status: "rejected",
      rejectionReason: args.reason,
      reviewedBy: args.adminUserId,
      reviewedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get venue reports for admin review
export const getVenueReports = query({
  args: {
    adminUserId: v.id("users"),
    venueId: v.optional(v.id("communityVenues")),
  },
  returns: v.array(
    v.object({
      _id: v.id("venueReports"),
      venueId: v.id("communityVenues"),
      venueName: v.string(),
      reason: reportReasonValidator,
      details: v.optional(v.string()),
      reportedAt: v.number(),
      status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("resolved")),
      reporterName: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminUserId);
    if (!admin?.isAdmin) {
      return [];
    }

    let reports;
    if (args.venueId) {
      reports = await ctx.db
        .query("venueReports")
        .withIndex("by_venue", (q) => q.eq("venueId", args.venueId!))
        .collect();
    } else {
      reports = await ctx.db
        .query("venueReports")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect();
    }

    const reportsWithDetails = await Promise.all(
      reports.map(async (r) => {
        const venue = await ctx.db.get(r.venueId);
        const reporter = await ctx.db.get(r.reporterId);
        const profile = reporter
          ? await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q) => q.eq("userId", reporter._id))
              .unique()
          : null;

        return {
          _id: r._id,
          venueId: r.venueId,
          venueName: venue?.name ?? "Unknown",
          reason: r.reason,
          details: r.details,
          reportedAt: r.reportedAt,
          status: r.status,
          reporterName: profile?.displayName || reporter?.name,
        };
      })
    );

    return reportsWithDetails;
  },
});

// Resolve a venue report
export const resolveVenueReport = mutation({
  args: {
    adminUserId: v.id("users"),
    reportId: v.id("venueReports"),
    action: v.union(v.literal("dismiss"), v.literal("remove_venue")),
  },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminUserId);
    if (!admin?.isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      return { success: false, error: "Report not found" };
    }

    await ctx.db.patch(args.reportId, {
      status: "resolved",
      reviewedBy: args.adminUserId,
      reviewedAt: Date.now(),
    });

    if (args.action === "remove_venue") {
      await ctx.db.patch(report.venueId, { status: "rejected" });
    } else if (args.action === "dismiss") {
      // If venue was flagged and all reports are dismissed, restore to approved
      const venue = await ctx.db.get(report.venueId);
      if (venue?.status === "flagged") {
        const pendingReports = await ctx.db
          .query("venueReports")
          .withIndex("by_venue", (q) => q.eq("venueId", report.venueId))
          .filter((q) => q.eq(q.field("status"), "pending"))
          .collect();

        if (pendingReports.length === 0) {
          await ctx.db.patch(report.venueId, { status: "approved" });
        }
      }
    }

    return { success: true };
  },
});

// Get all venues for admin management
export const getAllVenues = query({
  args: {
    adminUserId: v.id("users"),
    status: v.optional(venueStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("communityVenues"),
      name: v.string(),
      description: v.optional(v.string()),
      category: venueCategoryValidator,
      latitude: v.number(),
      longitude: v.number(),
      address: v.string(),
      city: v.string(),
      state: v.optional(v.string()),
      country: v.string(),
      phone: v.optional(v.string()),
      website: v.optional(v.string()),
      instagram: v.optional(v.string()),
      features: v.optional(v.array(v.string())),
      hoursNote: v.optional(v.string()),
      status: venueStatusValidator,
      submittedAt: v.number(),
      favoriteCount: v.optional(v.number()),
      viewCount: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminUserId);
    if (!admin?.isAdmin) {
      return [];
    }

    const limit = args.limit ?? 100;

    let venues;
    if (args.status) {
      venues = await ctx.db
        .query("communityVenues")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .take(limit);
    } else {
      venues = await ctx.db.query("communityVenues").take(limit);
    }

    return venues.map((v) => ({
      _id: v._id,
      name: v.name,
      description: v.description,
      category: v.category,
      latitude: v.latitude,
      longitude: v.longitude,
      address: v.address,
      city: v.city,
      state: v.state,
      country: v.country,
      phone: v.phone,
      website: v.website,
      instagram: v.instagram,
      features: v.features,
      hoursNote: v.hoursNote,
      status: v.status,
      submittedAt: v.submittedAt,
      favoriteCount: v.favoriteCount,
      viewCount: v.viewCount,
    }));
  },
});

// Admin create venue (auto-approved)
export const adminCreateVenue = mutation({
  args: {
    adminUserId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    category: venueCategoryValidator,
    latitude: v.number(),
    longitude: v.number(),
    address: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    instagram: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    hoursNote: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    venueId: v.optional(v.id("communityVenues")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminUserId);
    if (!admin?.isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const venueId = await ctx.db.insert("communityVenues", {
      name: args.name,
      description: args.description,
      category: args.category,
      latitude: args.latitude,
      longitude: args.longitude,
      address: args.address,
      city: args.city,
      state: args.state,
      country: args.country,
      phone: args.phone,
      website: args.website,
      instagram: args.instagram,
      features: args.features,
      hoursNote: args.hoursNote,
      submittedBy: args.adminUserId,
      submittedAt: Date.now(),
      status: "approved", // Auto-approved for admin
      reviewedBy: args.adminUserId,
      reviewedAt: Date.now(),
      viewCount: 0,
      favoriteCount: 0,
    });

    return { success: true, venueId };
  },
});

// Admin update venue
export const adminUpdateVenue = mutation({
  args: {
    adminUserId: v.id("users"),
    venueId: v.id("communityVenues"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(venueCategoryValidator),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    instagram: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    hoursNote: v.optional(v.string()),
    status: v.optional(venueStatusValidator),
  },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminUserId);
    if (!admin?.isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const venue = await ctx.db.get(args.venueId);
    if (!venue) {
      return { success: false, error: "Venue not found" };
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.latitude !== undefined) updates.latitude = args.latitude;
    if (args.longitude !== undefined) updates.longitude = args.longitude;
    if (args.address !== undefined) updates.address = args.address;
    if (args.city !== undefined) updates.city = args.city;
    if (args.state !== undefined) updates.state = args.state;
    if (args.country !== undefined) updates.country = args.country;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.website !== undefined) updates.website = args.website;
    if (args.instagram !== undefined) updates.instagram = args.instagram;
    if (args.features !== undefined) updates.features = args.features;
    if (args.hoursNote !== undefined) updates.hoursNote = args.hoursNote;
    if (args.status !== undefined) updates.status = args.status;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.venueId, updates);
    }

    return { success: true };
  },
});

// Admin delete venue
export const adminDeleteVenue = mutation({
  args: {
    adminUserId: v.id("users"),
    venueId: v.id("communityVenues"),
  },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminUserId);
    if (!admin?.isAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    const venue = await ctx.db.get(args.venueId);
    if (!venue) {
      return { success: false, error: "Venue not found" };
    }

    // Delete all favorites for this venue
    const favorites = await ctx.db
      .query("venueFavorites")
      .withIndex("by_venue", (q) => q.eq("venueId", args.venueId))
      .collect();

    for (const fav of favorites) {
      await ctx.db.delete(fav._id);
    }

    // Delete all reports for this venue
    const reports = await ctx.db
      .query("venueReports")
      .withIndex("by_venue", (q) => q.eq("venueId", args.venueId))
      .collect();

    for (const report of reports) {
      await ctx.db.delete(report._id);
    }

    // Delete the venue
    await ctx.db.delete(args.venueId);

    return { success: true };
  },
});
