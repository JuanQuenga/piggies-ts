import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ============================================================================
// CONSTANTS
// ============================================================================
const ALBUM_LIMITS = {
  free: 10,
  ultra: Infinity,
} as const;

// ============================================================================
// PRIVATE ALBUM MUTATIONS
// ============================================================================

// Upload photo to private album
export const addPhotoToAlbum = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
  },
  returns: v.id("privateAlbumPhotos"),
  handler: async (ctx, args) => {
    // Get user subscription tier
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    const tier = user.subscriptionTier ?? "free";
    const limit = tier === "ultra" ? Infinity : ALBUM_LIMITS.free;

    // Count existing photos
    const existingPhotos = await ctx.db
      .query("privateAlbumPhotos")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    if (existingPhotos.length >= limit) {
      throw new Error(
        `Album limit reached. ${tier === "free" ? "Free" : "Your"} tier allows up to ${limit} photos. Upgrade to Ultra for unlimited photos.`
      );
    }

    // Get next order number
    const maxOrder = Math.max(0, ...existingPhotos.map((p) => p.order));

    return await ctx.db.insert("privateAlbumPhotos", {
      userId: args.userId,
      storageId: args.storageId,
      caption: args.caption,
      uploadedAt: Date.now(),
      order: maxOrder + 1,
    });
  },
});

// Delete photo from album
export const removePhotoFromAlbum = mutation({
  args: {
    userId: v.id("users"),
    photoId: v.id("privateAlbumPhotos"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.userId !== args.userId) {
      throw new Error("Photo not found or unauthorized");
    }

    // Delete from storage
    await ctx.storage.delete(photo.storageId);
    // Delete record
    await ctx.db.delete(args.photoId);
    return null;
  },
});

// Reorder photos in album
export const reorderAlbumPhotos = mutation({
  args: {
    userId: v.id("users"),
    photoIds: v.array(v.id("privateAlbumPhotos")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (let i = 0; i < args.photoIds.length; i++) {
      const photo = await ctx.db.get(args.photoIds[i]);
      if (photo && photo.userId === args.userId) {
        await ctx.db.patch(args.photoIds[i], { order: i + 1 });
      }
    }
    return null;
  },
});

// Update photo caption
export const updatePhotoCaption = mutation({
  args: {
    userId: v.id("users"),
    photoId: v.id("privateAlbumPhotos"),
    caption: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.userId !== args.userId) {
      throw new Error("Photo not found or unauthorized");
    }

    await ctx.db.patch(args.photoId, { caption: args.caption });
    return null;
  },
});

// ============================================================================
// PRIVATE ALBUM QUERIES
// ============================================================================

// Get my album photos
export const getMyAlbumPhotos = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("privateAlbumPhotos")
      .withIndex("by_userId_order", (q) => q.eq("userId", args.userId))
      .collect();

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      }))
    );

    return photosWithUrls.filter((p) => p.url !== null);
  },
});

// Get album count and limit for user
export const getAlbumStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const tier = user?.subscriptionTier ?? "free";
    const limit = tier === "ultra" ? null : ALBUM_LIMITS.free;

    const photos = await ctx.db
      .query("privateAlbumPhotos")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      count: photos.length,
      limit,
      tier,
      isAtLimit: limit !== null && photos.length >= limit,
    };
  },
});

// ============================================================================
// ALBUM SHARING MUTATIONS
// ============================================================================

// Share album with user in conversation
export const shareAlbum = mutation({
  args: {
    ownerUserId: v.id("users"),
    grantedUserId: v.id("users"),
    conversationId: v.id("conversations"),
    expiresIn: v.optional(v.union(v.literal("24h"), v.literal("7d"))),
  },
  returns: v.id("albumAccessGrants"),
  handler: async (ctx, args) => {
    // Verify owner is Ultra if using time-limited access
    if (args.expiresIn) {
      const owner = await ctx.db.get(args.ownerUserId);
      if (owner?.subscriptionTier !== "ultra") {
        throw new Error("Time-limited sharing is only available for Ultra subscribers");
      }
    }

    // Check if already shared
    const existing = await ctx.db
      .query("albumAccessGrants")
      .withIndex("by_owner_granted", (q) =>
        q.eq("ownerUserId", args.ownerUserId).eq("grantedUserId", args.grantedUserId)
      )
      .first();

    const now = Date.now();
    let expiresAt: number | undefined;

    if (args.expiresIn === "24h") {
      expiresAt = now + 24 * 60 * 60 * 1000;
    } else if (args.expiresIn === "7d") {
      expiresAt = now + 7 * 24 * 60 * 60 * 1000;
    }

    if (existing) {
      // Update existing grant
      await ctx.db.patch(existing._id, {
        expiresAt,
        grantedAt: now,
        isRevoked: false,
        conversationId: args.conversationId,
      });
      return existing._id;
    }

    return await ctx.db.insert("albumAccessGrants", {
      ownerUserId: args.ownerUserId,
      grantedUserId: args.grantedUserId,
      conversationId: args.conversationId,
      grantedAt: now,
      expiresAt,
    });
  },
});

// Revoke album access
export const revokeAlbumAccess = mutation({
  args: {
    ownerUserId: v.id("users"),
    grantedUserId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const grant = await ctx.db
      .query("albumAccessGrants")
      .withIndex("by_owner_granted", (q) =>
        q.eq("ownerUserId", args.ownerUserId).eq("grantedUserId", args.grantedUserId)
      )
      .first();

    if (grant) {
      await ctx.db.patch(grant._id, { isRevoked: true });
    }
    return null;
  },
});

// ============================================================================
// ALBUM ACCESS QUERIES
// ============================================================================

// Check if user has access to another user's album
export const hasAlbumAccess = query({
  args: {
    ownerUserId: v.id("users"),
    viewerUserId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Owner always has access to their own album
    if (args.ownerUserId === args.viewerUserId) return true;

    const grant = await ctx.db
      .query("albumAccessGrants")
      .withIndex("by_owner_granted", (q) =>
        q.eq("ownerUserId", args.ownerUserId).eq("grantedUserId", args.viewerUserId)
      )
      .first();

    if (!grant || grant.isRevoked) return false;
    if (grant.expiresAt && grant.expiresAt < Date.now()) return false;

    return true;
  },
});

// Get album sharing status for a conversation
export const getAlbumSharingStatus = query({
  args: {
    userId: v.id("users"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    const otherUserId = conversation.participantIds.find((id) => id !== args.userId);
    if (!otherUserId) return null;

    // Check if I shared with them
    const myShare = await ctx.db
      .query("albumAccessGrants")
      .withIndex("by_owner_granted", (q) =>
        q.eq("ownerUserId", args.userId).eq("grantedUserId", otherUserId)
      )
      .first();

    // Check if they shared with me
    const theirShare = await ctx.db
      .query("albumAccessGrants")
      .withIndex("by_owner_granted", (q) =>
        q.eq("ownerUserId", otherUserId).eq("grantedUserId", args.userId)
      )
      .first();

    const now = Date.now();

    const iShared = myShare && !myShare.isRevoked && (!myShare.expiresAt || myShare.expiresAt > now);
    const theyShared = theirShare && !theirShare.isRevoked && (!theirShare.expiresAt || theirShare.expiresAt > now);

    return {
      iShared: !!iShared,
      myShareExpiresAt: iShared ? myShare.expiresAt : undefined,
      theyShared: !!theyShared,
      theirShareExpiresAt: theyShared ? theirShare.expiresAt : undefined,
      otherUserId,
    };
  },
});

// View another user's album (with access check)
export const viewUserAlbum = query({
  args: {
    viewerUserId: v.id("users"),
    ownerUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check access (unless viewing own album)
    if (args.viewerUserId !== args.ownerUserId) {
      const grant = await ctx.db
        .query("albumAccessGrants")
        .withIndex("by_owner_granted", (q) =>
          q.eq("ownerUserId", args.ownerUserId).eq("grantedUserId", args.viewerUserId)
        )
        .first();

      if (!grant || grant.isRevoked) return null;
      if (grant.expiresAt && grant.expiresAt < Date.now()) return null;
    }

    const photos = await ctx.db
      .query("privateAlbumPhotos")
      .withIndex("by_userId_order", (q) => q.eq("userId", args.ownerUserId))
      .collect();

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => ({
        _id: photo._id,
        url: await ctx.storage.getUrl(photo.storageId),
        caption: photo.caption,
        order: photo.order,
      }))
    );

    return photosWithUrls.filter((p) => p.url !== null);
  },
});

// List who I've shared my album with
export const getMyAlbumShares = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const grants = await ctx.db
      .query("albumAccessGrants")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", args.userId))
      .collect();

    const now = Date.now();
    const activeGrants = grants.filter(
      (g) => !g.isRevoked && (!g.expiresAt || g.expiresAt > now)
    );

    const grantsWithUsers = await Promise.all(
      activeGrants.map(async (grant) => {
        const user = await ctx.db.get(grant.grantedUserId);
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", grant.grantedUserId))
          .unique();

        return {
          ...grant,
          grantedUser: {
            _id: grant.grantedUserId,
            name: profile?.displayName ?? user?.name ?? "Unknown",
            imageUrl: user?.imageUrl,
          },
        };
      })
    );

    return grantsWithUsers;
  },
});

// List albums shared with me
export const getAlbumsSharedWithMe = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const grants = await ctx.db
      .query("albumAccessGrants")
      .withIndex("by_granted", (q) => q.eq("grantedUserId", args.userId))
      .collect();

    const now = Date.now();
    const activeGrants = grants.filter(
      (g) => !g.isRevoked && (!g.expiresAt || g.expiresAt > now)
    );

    const grantsWithOwners = await Promise.all(
      activeGrants.map(async (grant) => {
        const user = await ctx.db.get(grant.ownerUserId);
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", grant.ownerUserId))
          .unique();

        // Get photo count for this album
        const photos = await ctx.db
          .query("privateAlbumPhotos")
          .withIndex("by_userId", (q) => q.eq("userId", grant.ownerUserId))
          .collect();

        // Get first photo for preview
        const firstPhoto = photos.length > 0 ? photos[0] : null;
        const previewUrl = firstPhoto
          ? await ctx.storage.getUrl(firstPhoto.storageId)
          : null;

        return {
          ...grant,
          owner: {
            _id: grant.ownerUserId,
            name: profile?.displayName ?? user?.name ?? "Unknown",
            imageUrl: user?.imageUrl,
          },
          photoCount: photos.length,
          previewUrl,
        };
      })
    );

    return grantsWithOwners;
  },
});
