import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Sync user from WorkOS AuthKit - called on login
export const syncUser = mutation({
  args: {
    workosId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    referralCode: v.optional(v.string()), // Optional referral code for new signups
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", args.workosId))
      .unique();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        lastActive: Date.now(),
        isOnline: true,
      });
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      workosId: args.workosId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      lastActive: Date.now(),
      isOnline: true,
    });

    // Create empty profile
    await ctx.db.insert("profiles", {
      userId,
    });

    // Apply referral code if provided
    if (args.referralCode) {
      const referrer = await ctx.db
        .query("users")
        .withIndex("by_referralCode", (q) => q.eq("referralCode", args.referralCode!.toUpperCase()))
        .unique();

      if (referrer && referrer._id !== userId) {
        // Create the referral record
        await ctx.db.insert("referrals", {
          referrerId: referrer._id,
          referredUserId: userId,
          referralCode: args.referralCode.toUpperCase(),
          createdAt: Date.now(),
          status: "pending",
        });

        // Update user's referredBy field
        await ctx.db.patch(userId, { referredBy: referrer._id });
      }
    }

    return userId;
  },
});

// Get current user by WorkOS ID
export const getCurrentUser = query({
  args: {
    workosId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      workosId: v.string(),
      email: v.string(),
      name: v.string(),
      imageUrl: v.optional(v.string()),
      lastActive: v.optional(v.number()),
      isOnline: v.optional(v.boolean()),
      polarCustomerId: v.optional(v.string()),
      polarSubscriptionId: v.optional(v.string()),
      subscriptionTier: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("ultra"))),
      subscriptionStatus: v.optional(v.union(v.literal("active"), v.literal("canceled"), v.literal("revoked"))),
      pushNotificationsEnabled: v.optional(v.boolean()),
      emailNotificationsEnabled: v.optional(v.boolean()),
      showOnlineStatus: v.optional(v.boolean()),
      locationSharingEnabled: v.optional(v.boolean()),
      hideFromDiscovery: v.optional(v.boolean()),
      // Referral fields
      referralCode: v.optional(v.string()),
      referredBy: v.optional(v.id("users")),
      referralCredits: v.optional(v.number()),
      referralUltraExpiresAt: v.optional(v.number()),
      // Admin & moderation fields
      isAdmin: v.optional(v.boolean()),
      isBanned: v.optional(v.boolean()),
      bannedAt: v.optional(v.number()),
      bannedReason: v.optional(v.string()),
      isSuspended: v.optional(v.boolean()),
      suspendedUntil: v.optional(v.number()),
      warningCount: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", args.workosId))
      .unique();

    return user;
  },
});

// Get user by ID
export const getUser = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      workosId: v.string(),
      email: v.string(),
      name: v.string(),
      imageUrl: v.optional(v.string()),
      lastActive: v.optional(v.number()),
      isOnline: v.optional(v.boolean()),
      polarCustomerId: v.optional(v.string()),
      polarSubscriptionId: v.optional(v.string()),
      subscriptionTier: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("ultra"))),
      subscriptionStatus: v.optional(v.union(v.literal("active"), v.literal("canceled"), v.literal("revoked"))),
      pushNotificationsEnabled: v.optional(v.boolean()),
      emailNotificationsEnabled: v.optional(v.boolean()),
      showOnlineStatus: v.optional(v.boolean()),
      locationSharingEnabled: v.optional(v.boolean()),
      hideFromDiscovery: v.optional(v.boolean()),
      // Referral fields
      referralCode: v.optional(v.string()),
      referredBy: v.optional(v.id("users")),
      referralCredits: v.optional(v.number()),
      referralUltraExpiresAt: v.optional(v.number()),
      // Admin & moderation fields
      isAdmin: v.optional(v.boolean()),
      isBanned: v.optional(v.boolean()),
      bannedAt: v.optional(v.number()),
      bannedReason: v.optional(v.string()),
      isSuspended: v.optional(v.boolean()),
      suspendedUntil: v.optional(v.number()),
      warningCount: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Update user online status
export const updateOnlineStatus = mutation({
  args: {
    userId: v.id("users"),
    isOnline: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      isOnline: args.isOnline,
      lastActive: Date.now(),
    });
    return null;
  },
});

// Update user notification and privacy preferences
export const updateUserPreferences = mutation({
  args: {
    userId: v.id("users"),
    pushNotificationsEnabled: v.optional(v.boolean()),
    emailNotificationsEnabled: v.optional(v.boolean()),
    showOnlineStatus: v.optional(v.boolean()),
    locationSharingEnabled: v.optional(v.boolean()),
    hideFromDiscovery: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(userId, filteredUpdates);
    }

    return null;
  },
});

// Get user profile
export const getProfile = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("profiles"),
      _creationTime: v.number(),
      userId: v.id("users"),
      displayName: v.optional(v.string()),
      bio: v.optional(v.string()),
      age: v.optional(v.number()),
      profilePhotoIds: v.optional(v.array(v.id("_storage"))),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
      onboardingComplete: v.optional(v.boolean()),
      lookingFor: v.optional(v.string()),
      interests: v.optional(v.array(v.string())),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

// Update profile (for onboarding and profile edits)
export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    age: v.optional(v.number()),
    lookingFor: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    onboardingComplete: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const { userId, ...updates } = args;
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(profile._id, filteredUpdates);
    return null;
  },
});

// Search users by name
export const searchUsers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      imageUrl: v.optional(v.string()),
      isOnline: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const searchTerm = args.query.toLowerCase();

    // Simple search - filter by name containing the search term
    const users = await ctx.db.query("users").collect();

    return users
      .filter((u) => u.name.toLowerCase().includes(searchTerm))
      .slice(0, limit)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        imageUrl: u.imageUrl,
        isOnline: u.isOnline,
      }));
  },
});

// ============================================================================
// POLAR SUBSCRIPTION MUTATIONS
// ============================================================================

// Update subscription status from Polar webhook
export const updateSubscription = mutation({
  args: {
    polarCustomerId: v.string(),
    customerEmail: v.optional(v.string()),
    subscriptionTier: v.union(v.literal("free"), v.literal("pro"), v.literal("ultra")),
    subscriptionStatus: v.union(v.literal("active"), v.literal("canceled"), v.literal("revoked")),
    polarSubscriptionId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // First try to find user by polarCustomerId
    let user = await ctx.db
      .query("users")
      .withIndex("by_polarCustomerId", (q) => q.eq("polarCustomerId", args.polarCustomerId))
      .unique();

    // Fallback to email lookup if polarCustomerId not linked yet
    const customerEmail = args.customerEmail;
    if (!user && customerEmail) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", customerEmail))
        .unique();
    }

    if (!user) {
      console.warn(`No user found with polarCustomerId: ${args.polarCustomerId} or email: ${args.customerEmail}`);
      return null;
    }

    // Update subscription and ensure polarCustomerId is linked
    await ctx.db.patch(user._id, {
      polarCustomerId: args.polarCustomerId,
      subscriptionTier: args.subscriptionTier,
      subscriptionStatus: args.subscriptionStatus,
      polarSubscriptionId: args.polarSubscriptionId,
    });

    return null;
  },
});

// Link Polar customer ID to existing user by email
export const linkPolarCustomer = mutation({
  args: {
    email: v.string(),
    polarCustomerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      console.warn(`No user found with email: ${args.email}`);
      return null;
    }

    await ctx.db.patch(user._id, {
      polarCustomerId: args.polarCustomerId,
    });

    return null;
  },
});

// Check if user has Ultra subscription (paid or referral-based)
export const hasUltraSubscription = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return false;

    // Paid subscription takes priority
    if (user.subscriptionTier === "ultra" && user.subscriptionStatus === "active") {
      return true;
    }

    // Fallback to referral-based Ultra
    if (user.referralUltraExpiresAt && user.referralUltraExpiresAt > Date.now()) {
      return true;
    }

    return false;
  },
});

// Get nearby users for discovery feed
export const getNearbyUsers = query({
  args: {
    currentUserId: v.id("users"),
    limit: v.optional(v.number()),
    onlineOnly: v.optional(v.boolean()),
    withPhotos: v.optional(v.boolean()),
    minAge: v.optional(v.number()),
    maxAge: v.optional(v.number()),
    interests: v.optional(v.array(v.string())),
    includeSelf: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      imageUrl: v.optional(v.string()),
      isOnline: v.optional(v.boolean()),
      lastActive: v.optional(v.number()),
      isSelf: v.optional(v.boolean()),
      profile: v.union(
        v.object({
          displayName: v.optional(v.string()),
          bio: v.optional(v.string()),
          age: v.optional(v.number()),
          profilePhotoIds: v.optional(v.array(v.id("_storage"))),
          profilePhotoUrls: v.optional(v.array(v.string())),
          lookingFor: v.optional(v.string()),
          interests: v.optional(v.array(v.string())),
          onboardingComplete: v.optional(v.boolean()),
        }),
        v.null()
      ),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Get all users
    const users = await ctx.db.query("users").collect();

    // Filter users: exclude current user unless includeSelf is true
    // Also filter out users who have hideFromDiscovery enabled (except self)
    // Also filter out banned and suspended users
    let filteredUsers = users.filter((u) => {
      // Always include self if includeSelf is true
      if (u._id === args.currentUserId) {
        return args.includeSelf === true;
      }
      // Exclude banned users
      if (u.isBanned === true) {
        return false;
      }
      // Exclude suspended users (if suspension hasn't expired)
      if (u.isSuspended === true && u.suspendedUntil && u.suspendedUntil > Date.now()) {
        return false;
      }
      // Exclude users who have hidden themselves from discovery
      if (u.hideFromDiscovery === true) {
        return false;
      }
      return true;
    });

    // Filter to online users only if requested
    if (args.onlineOnly) {
      filteredUsers = filteredUsers.filter((u) => u.isOnline === true);
    }

    // Get profiles for each user
    const usersWithProfiles = await Promise.all(
      filteredUsers.slice(0, limit * 2).map(async (user) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .unique();

        // Get photo URLs if profile has photos
        let profilePhotoUrls: string[] | undefined;
        if (profile?.profilePhotoIds && profile.profilePhotoIds.length > 0) {
          const urls = await Promise.all(
            profile.profilePhotoIds.map((id) => ctx.storage.getUrl(id))
          );
          profilePhotoUrls = urls.filter((url): url is string => url !== null);
        }

        return {
          _id: user._id,
          name: user.name,
          imageUrl: user.imageUrl,
          isOnline: user.isOnline,
          lastActive: user.lastActive,
          isSelf: user._id === args.currentUserId,
          profile: profile
            ? {
                displayName: profile.displayName,
                bio: profile.bio,
                age: profile.age,
                profilePhotoIds: profile.profilePhotoIds,
                profilePhotoUrls,
                lookingFor: profile.lookingFor,
                interests: profile.interests,
                onboardingComplete: profile.onboardingComplete,
              }
            : null,
        };
      })
    );

    // Apply filters
    let result = usersWithProfiles.filter(
      (u) => u.profile?.onboardingComplete === true
    );

    // Filter by photos
    if (args.withPhotos) {
      result = result.filter(
        (u) => u.profile?.profilePhotoIds && u.profile.profilePhotoIds.length > 0
      );
    }

    // Filter by age range
    if (args.minAge !== undefined || args.maxAge !== undefined) {
      result = result.filter((u) => {
        const age = u.profile?.age;
        if (age === undefined) return false;
        if (args.minAge !== undefined && age < args.minAge) return false;
        if (args.maxAge !== undefined && age > args.maxAge) return false;
        return true;
      });
    }

    // Filter by interests (users must have at least one matching interest)
    if (args.interests && args.interests.length > 0) {
      result = result.filter((u) => {
        const userInterests = u.profile?.interests;
        if (!userInterests || userInterests.length === 0) return false;
        return args.interests!.some((interest) => userInterests.includes(interest));
      });
    }

    return result.slice(0, limit);
  },
});

// ============================================================================
// BLOCK/UNBLOCK USERS
// ============================================================================

// Block a user
export const blockUser = mutation({
  args: {
    blockerId: v.id("users"),
    blockedId: v.id("users"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    if (args.blockerId === args.blockedId) {
      throw new Error("Cannot block yourself");
    }

    // Check if already blocked
    const existing = await ctx.db
      .query("blockedUsers")
      .withIndex("by_blocker_blocked", (q) =>
        q.eq("blockerId", args.blockerId).eq("blockedId", args.blockedId)
      )
      .unique();

    if (existing) {
      return { success: true }; // Already blocked
    }

    await ctx.db.insert("blockedUsers", {
      blockerId: args.blockerId,
      blockedId: args.blockedId,
      blockedAt: Date.now(),
    });

    return { success: true };
  },
});

// Unblock a user
export const unblockUser = mutation({
  args: {
    blockerId: v.id("users"),
    blockedId: v.id("users"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const blocked = await ctx.db
      .query("blockedUsers")
      .withIndex("by_blocker_blocked", (q) =>
        q.eq("blockerId", args.blockerId).eq("blockedId", args.blockedId)
      )
      .unique();

    if (blocked) {
      await ctx.db.delete(blocked._id);
    }

    return { success: true };
  },
});

// Check if user is blocked
export const isUserBlocked = query({
  args: {
    blockerId: v.id("users"),
    blockedId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const blocked = await ctx.db
      .query("blockedUsers")
      .withIndex("by_blocker_blocked", (q) =>
        q.eq("blockerId", args.blockerId).eq("blockedId", args.blockedId)
      )
      .unique();

    return blocked !== null;
  },
});

// Get list of blocked users
export const getBlockedUsers = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("blockedUsers"),
      blockedUser: v.object({
        _id: v.id("users"),
        name: v.string(),
        imageUrl: v.optional(v.string()),
      }),
      blockedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const blockedRecords = await ctx.db
      .query("blockedUsers")
      .withIndex("by_blocker", (q) => q.eq("blockerId", args.userId))
      .collect();

    const blockedWithDetails = await Promise.all(
      blockedRecords.map(async (record) => {
        const user = await ctx.db.get(record.blockedId);
        return {
          _id: record._id,
          blockedUser: {
            _id: record.blockedId,
            name: user?.name ?? "Unknown",
            imageUrl: user?.imageUrl,
          },
          blockedAt: record.blockedAt,
        };
      })
    );

    return blockedWithDetails;
  },
});

// ============================================================================
// REPORT USERS
// ============================================================================

// Report a user
export const reportUser = mutation({
  args: {
    reporterId: v.id("users"),
    reportedId: v.id("users"),
    reason: v.string(),
    details: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), reportId: v.id("reportedUsers") }),
  handler: async (ctx, args) => {
    if (args.reporterId === args.reportedId) {
      throw new Error("Cannot report yourself");
    }

    const reportId = await ctx.db.insert("reportedUsers", {
      reporterId: args.reporterId,
      reportedId: args.reportedId,
      reason: args.reason,
      details: args.details,
      reportedAt: Date.now(),
      status: "pending",
    });

    return { success: true, reportId };
  },
});

// ============================================================================
// FAVORITE USERS
// ============================================================================

// Add user to favorites
export const addFavorite = mutation({
  args: {
    userId: v.id("users"),
    favoriteId: v.id("users"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    if (args.userId === args.favoriteId) {
      throw new Error("Cannot favorite yourself");
    }

    // Check if already favorited
    const existing = await ctx.db
      .query("favoriteUsers")
      .withIndex("by_user_favorite", (q) =>
        q.eq("userId", args.userId).eq("favoriteId", args.favoriteId)
      )
      .unique();

    if (existing) {
      return { success: true }; // Already favorited
    }

    await ctx.db.insert("favoriteUsers", {
      userId: args.userId,
      favoriteId: args.favoriteId,
      favoritedAt: Date.now(),
    });

    return { success: true };
  },
});

// Remove user from favorites
export const removeFavorite = mutation({
  args: {
    userId: v.id("users"),
    favoriteId: v.id("users"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("favoriteUsers")
      .withIndex("by_user_favorite", (q) =>
        q.eq("userId", args.userId).eq("favoriteId", args.favoriteId)
      )
      .unique();

    if (favorite) {
      await ctx.db.delete(favorite._id);
    }

    return { success: true };
  },
});

// Check if user is favorited
export const isUserFavorited = query({
  args: {
    userId: v.id("users"),
    favoriteId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("favoriteUsers")
      .withIndex("by_user_favorite", (q) =>
        q.eq("userId", args.userId).eq("favoriteId", args.favoriteId)
      )
      .unique();

    return favorite !== null;
  },
});

// Get list of favorite users
export const getFavoriteUsers = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("favoriteUsers"),
      favoriteUser: v.object({
        _id: v.id("users"),
        name: v.string(),
        imageUrl: v.optional(v.string()),
        isOnline: v.optional(v.boolean()),
      }),
      favoritedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const favoriteRecords = await ctx.db
      .query("favoriteUsers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const favoritesWithDetails = await Promise.all(
      favoriteRecords.map(async (record) => {
        const user = await ctx.db.get(record.favoriteId);
        return {
          _id: record._id,
          favoriteUser: {
            _id: record.favoriteId,
            name: user?.name ?? "Unknown",
            imageUrl: user?.imageUrl,
            isOnline: user?.isOnline,
          },
          favoritedAt: record.favoritedAt,
        };
      })
    );

    return favoritesWithDetails;
  },
});

// ============================================================================
// PROFILE PHOTOS
// ============================================================================

const PROFILE_PHOTO_LIMIT = 6;

// Add profile photo (up to 6)
export const addProfilePhoto = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentPhotos = profile.profilePhotoIds ?? [];
    if (currentPhotos.length >= PROFILE_PHOTO_LIMIT) {
      throw new Error(`Maximum ${PROFILE_PHOTO_LIMIT} profile photos allowed`);
    }

    await ctx.db.patch(profile._id, {
      profilePhotoIds: [...currentPhotos, args.storageId],
    });
    return null;
  },
});

// Remove profile photo
export const removeProfilePhoto = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentPhotos = profile.profilePhotoIds ?? [];
    const updatedPhotos = currentPhotos.filter((id) => id !== args.storageId);

    // Delete from storage
    await ctx.storage.delete(args.storageId);

    await ctx.db.patch(profile._id, {
      profilePhotoIds: updatedPhotos,
    });
    return null;
  },
});

// Reorder profile photos (first photo is primary)
export const reorderProfilePhotos = mutation({
  args: {
    userId: v.id("users"),
    photoIds: v.array(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Verify all provided IDs are valid profile photos for this user
    const currentPhotos = profile.profilePhotoIds ?? [];
    const isValid = args.photoIds.every((id) => currentPhotos.includes(id));
    if (!isValid || args.photoIds.length !== currentPhotos.length) {
      throw new Error("Invalid photo IDs provided");
    }

    await ctx.db.patch(profile._id, {
      profilePhotoIds: args.photoIds,
    });
    return null;
  },
});

// Get profile photos with URLs
export const getProfilePhotos = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile || !profile.profilePhotoIds) return [];

    const photosWithUrls = await Promise.all(
      profile.profilePhotoIds.map(async (storageId, index) => ({
        storageId,
        url: await ctx.storage.getUrl(storageId),
        isPrimary: index === 0,
      }))
    );

    return photosWithUrls.filter((p) => p.url !== null);
  },
});

// Get primary profile photo URL (first photo)
export const getPrimaryProfilePhotoUrl = query({
  args: { userId: v.id("users") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile || !profile.profilePhotoIds || profile.profilePhotoIds.length === 0) {
      return null;
    }

    return await ctx.storage.getUrl(profile.profilePhotoIds[0]);
  },
});
