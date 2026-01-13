import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// ============================================================================
// CONSTANTS
// ============================================================================
const ALBUM_LIMITS = {
  free: {
    maxAlbums: 1,
    maxPhotosPerAlbum: 10,
  },
  ultra: {
    maxAlbums: 20,
    maxPhotosPerAlbum: Infinity,
  },
} as const;

const DEFAULT_ALBUM_NAME = "Private Album";

// ============================================================================
// ALBUM MANAGEMENT MUTATIONS
// ============================================================================

// Get or create default album for a user (used for backwards compatibility)
export const getOrCreateDefaultAlbum = mutation({
  args: { userId: v.id("users") },
  returns: v.id("privateAlbums"),
  handler: async (ctx, args) => {
    // Check for existing default album
    const existing = await ctx.db
      .query("privateAlbums")
      .withIndex("by_userId_isDefault", (q) =>
        q.eq("userId", args.userId).eq("isDefault", true)
      )
      .first();

    if (existing) return existing._id;

    // Create default album
    const now = Date.now();
    return await ctx.db.insert("privateAlbums", {
      userId: args.userId,
      name: DEFAULT_ALBUM_NAME,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create a new album (Ultra only)
export const createAlbum = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("privateAlbums"),
  handler: async (ctx, args) => {
    // Verify Ultra subscription
    const user = await ctx.db.get(args.userId);
    if (!user || user.subscriptionTier !== "ultra") {
      throw new Error("Multiple albums require Ultra subscription");
    }

    // Check album limit
    const existingAlbums = await ctx.db
      .query("privateAlbums")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    if (existingAlbums.length >= ALBUM_LIMITS.ultra.maxAlbums) {
      throw new Error(`Maximum album limit reached (${ALBUM_LIMITS.ultra.maxAlbums} albums)`);
    }

    // Validate name
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Album name cannot be empty");
    }
    if (trimmedName.length > 50) {
      throw new Error("Album name cannot exceed 50 characters");
    }

    const now = Date.now();
    return await ctx.db.insert("privateAlbums", {
      userId: args.userId,
      name: trimmedName,
      description: args.description,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update album details
export const updateAlbum = mutation({
  args: {
    userId: v.id("users"),
    albumId: v.id("privateAlbums"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    coverPhotoId: v.optional(v.id("privateAlbumPhotos")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const album = await ctx.db.get(args.albumId);
    if (!album || album.userId !== args.userId) {
      throw new Error("Album not found or unauthorized");
    }

    const updates: {
      name?: string;
      description?: string;
      coverPhotoId?: typeof args.coverPhotoId;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.name !== undefined) {
      const trimmedName = args.name.trim();
      if (!trimmedName) {
        throw new Error("Album name cannot be empty");
      }
      if (trimmedName.length > 50) {
        throw new Error("Album name cannot exceed 50 characters");
      }
      updates.name = trimmedName;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.coverPhotoId !== undefined) {
      // Verify photo belongs to this album
      const photo = await ctx.db.get(args.coverPhotoId);
      if (!photo || photo.albumId !== args.albumId) {
        throw new Error("Cover photo must belong to this album");
      }
      updates.coverPhotoId = args.coverPhotoId;
    }

    await ctx.db.patch(args.albumId, updates);
    return null;
  },
});

// Delete album (cannot delete default album)
export const deleteAlbum = mutation({
  args: {
    userId: v.id("users"),
    albumId: v.id("privateAlbums"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const album = await ctx.db.get(args.albumId);
    if (!album || album.userId !== args.userId) {
      throw new Error("Album not found or unauthorized");
    }

    // Cannot delete default album
    if (album.isDefault) {
      throw new Error("Cannot delete your default album");
    }

    // Delete all photos in album
    const photos = await ctx.db
      .query("privateAlbumPhotos")
      .withIndex("by_albumId", (q) => q.eq("albumId", args.albumId))
      .collect();

    for (const photo of photos) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(photo._id);
    }

    // Delete all access grants for this album
    const grants = await ctx.db
      .query("albumAccessGrants")
      .withIndex("by_album", (q) => q.eq("albumId", args.albumId))
      .collect();

    for (const grant of grants) {
      await ctx.db.delete(grant._id);
    }

    // Delete the album
    await ctx.db.delete(args.albumId);

    return null;
  },
});

// ============================================================================
// ALBUM QUERIES
// ============================================================================

// List all albums for a user
export const listMyAlbums = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const albums = await ctx.db
      .query("privateAlbums")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Sort: default first, then by createdAt descending
    albums.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return b.createdAt - a.createdAt;
    });

    // Get photo count and cover for each album
    const albumsWithDetails = await Promise.all(
      albums.map(async (album) => {
        const photos = await ctx.db
          .query("privateAlbumPhotos")
          .withIndex("by_albumId", (q) => q.eq("albumId", album._id))
          .collect();

        // Use specified cover photo or first photo
        let coverUrl: string | null = null;
        if (album.coverPhotoId) {
          const coverPhoto = await ctx.db.get(album.coverPhotoId);
          if (coverPhoto) {
            coverUrl = await ctx.storage.getUrl(coverPhoto.storageId);
          }
        }
        if (!coverUrl && photos.length > 0) {
          coverUrl = await ctx.storage.getUrl(photos[0].storageId);
        }

        return {
          ...album,
          photoCount: photos.length,
          coverUrl,
        };
      })
    );

    return albumsWithDetails;
  },
});

// Get user's default album (creating if needed)
export const getDefaultAlbum = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const album = await ctx.db
      .query("privateAlbums")
      .withIndex("by_userId_isDefault", (q) =>
        q.eq("userId", args.userId).eq("isDefault", true)
      )
      .first();

    if (!album) return null;

    const photos = await ctx.db
      .query("privateAlbumPhotos")
      .withIndex("by_albumId", (q) => q.eq("albumId", album._id))
      .collect();

    let coverUrl: string | null = null;
    if (photos.length > 0) {
      coverUrl = await ctx.storage.getUrl(photos[0].storageId);
    }

    return {
      ...album,
      photoCount: photos.length,
      coverUrl,
    };
  },
});

// Get a specific album by ID
export const getAlbum = query({
  args: {
    albumId: v.id("privateAlbums"),
    viewerUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const album = await ctx.db.get(args.albumId);
    if (!album) return null;

    const isOwner = album.userId === args.viewerUserId;

    // If not owner, check access
    if (!isOwner) {
      const grant = await ctx.db
        .query("albumAccessGrants")
        .withIndex("by_album_granted", (q) =>
          q.eq("albumId", args.albumId).eq("grantedUserId", args.viewerUserId)
        )
        .first();

      if (!grant || grant.isRevoked) return null;
      if (grant.expiresAt && grant.expiresAt < Date.now()) return null;
    }

    const photos = await ctx.db
      .query("privateAlbumPhotos")
      .withIndex("by_albumId", (q) => q.eq("albumId", args.albumId))
      .collect();

    let coverUrl: string | null = null;
    if (album.coverPhotoId) {
      const coverPhoto = await ctx.db.get(album.coverPhotoId);
      if (coverPhoto) {
        coverUrl = await ctx.storage.getUrl(coverPhoto.storageId);
      }
    }
    if (!coverUrl && photos.length > 0) {
      coverUrl = await ctx.storage.getUrl(photos[0].storageId);
    }

    // Get owner info for non-owners
    let ownerInfo = null;
    if (!isOwner) {
      const owner = await ctx.db.get(album.userId);
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", album.userId))
        .unique();
      ownerInfo = {
        _id: album.userId,
        name: profile?.displayName ?? owner?.name ?? "Unknown",
        imageUrl: owner?.imageUrl,
      };
    }

    return {
      ...album,
      photoCount: photos.length,
      coverUrl,
      owner: ownerInfo,
    };
  },
});

// ============================================================================
// PRIVATE ALBUM PHOTO MUTATIONS
// ============================================================================

// Upload photo to private album
export const addPhotoToAlbum = mutation({
  args: {
    userId: v.id("users"),
    albumId: v.optional(v.id("privateAlbums")), // Optional for backwards compat
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
    const isUltra = tier === "ultra";

    // Get or create default album if no albumId provided
    let albumId = args.albumId;
    if (!albumId) {
      // Get existing default album
      const defaultAlbum = await ctx.db
        .query("privateAlbums")
        .withIndex("by_userId_isDefault", (q) =>
          q.eq("userId", args.userId).eq("isDefault", true)
        )
        .first();

      if (defaultAlbum) {
        albumId = defaultAlbum._id;
      } else {
        // Create default album
        const now = Date.now();
        albumId = await ctx.db.insert("privateAlbums", {
          userId: args.userId,
          name: DEFAULT_ALBUM_NAME,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Verify album ownership
    const album = await ctx.db.get(albumId);
    if (!album || album.userId !== args.userId) {
      throw new Error("Album not found or unauthorized");
    }

    // For free users, only allow default album
    if (!isUltra && !album.isDefault) {
      throw new Error("Multiple albums require Ultra subscription");
    }

    // Check photo limit
    const limit = isUltra ? ALBUM_LIMITS.ultra.maxPhotosPerAlbum : ALBUM_LIMITS.free.maxPhotosPerAlbum;
    const existingPhotos = await ctx.db
      .query("privateAlbumPhotos")
      .withIndex("by_albumId", (q) => q.eq("albumId", albumId))
      .collect();

    if (existingPhotos.length >= limit) {
      throw new Error(
        `Album limit reached. ${tier === "free" ? "Free" : "Your"} tier allows up to ${limit} photos per album. Upgrade to Ultra for unlimited photos.`
      );
    }

    // Get next order number
    const maxOrder = Math.max(0, ...existingPhotos.map((p) => p.order));

    return await ctx.db.insert("privateAlbumPhotos", {
      userId: args.userId,
      albumId: albumId,
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

    // If this photo is an album cover, clear the cover
    if (photo.albumId) {
      const album = await ctx.db.get(photo.albumId);
      if (album && album.coverPhotoId === args.photoId) {
        await ctx.db.patch(photo.albumId, { coverPhotoId: undefined, updatedAt: Date.now() });
      }
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
    albumId: v.optional(v.id("privateAlbums")), // Optional for backwards compat
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
// PRIVATE ALBUM PHOTO QUERIES
// ============================================================================

// Get photos for a specific album
export const getAlbumPhotos = query({
  args: {
    albumId: v.id("privateAlbums"),
    viewerUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const album = await ctx.db.get(args.albumId);
    if (!album) return null;

    const isOwner = album.userId === args.viewerUserId;

    // Check access if not owner
    if (!isOwner) {
      const grant = await ctx.db
        .query("albumAccessGrants")
        .withIndex("by_album_granted", (q) =>
          q.eq("albumId", args.albumId).eq("grantedUserId", args.viewerUserId)
        )
        .first();

      if (!grant || grant.isRevoked) return null;
      if (grant.expiresAt && grant.expiresAt < Date.now()) return null;
    }

    const photos = await ctx.db
      .query("privateAlbumPhotos")
      .withIndex("by_albumId_order", (q) => q.eq("albumId", args.albumId))
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

// Get my album photos (backwards compatible - returns all photos across albums)
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

// Get album count and limit for user (updated for new structure)
export const getAlbumStatus = query({
  args: {
    userId: v.id("users"),
    albumId: v.optional(v.id("privateAlbums")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const tier = user?.subscriptionTier ?? "free";
    const isUltra = tier === "ultra";
    const photoLimit = isUltra ? null : ALBUM_LIMITS.free.maxPhotosPerAlbum;

    // If albumId provided, get count for that album
    let photoCount = 0;
    if (args.albumId) {
      const photos = await ctx.db
        .query("privateAlbumPhotos")
        .withIndex("by_albumId", (q) => q.eq("albumId", args.albumId))
        .collect();
      photoCount = photos.length;
    } else {
      // Get total photos across all albums
      const photos = await ctx.db
        .query("privateAlbumPhotos")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
      photoCount = photos.length;
    }

    // Get album count
    const albums = await ctx.db
      .query("privateAlbums")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      photoCount,
      photoLimit,
      tier,
      isAtPhotoLimit: photoLimit !== null && photoCount >= photoLimit,
      albumCount: albums.length,
      albumLimit: isUltra ? ALBUM_LIMITS.ultra.maxAlbums : ALBUM_LIMITS.free.maxAlbums,
      canCreateAlbums: isUltra,
    };
  },
});

// ============================================================================
// ALBUM SHARING MUTATIONS
// ============================================================================

// Share album with user in conversation
export const shareAlbum = mutation({
  args: {
    albumId: v.optional(v.id("privateAlbums")), // Optional for backwards compat
    ownerUserId: v.id("users"),
    grantedUserId: v.id("users"),
    conversationId: v.id("conversations"),
    expiresIn: v.optional(v.union(v.literal("24h"), v.literal("7d"))),
  },
  returns: v.id("albumAccessGrants"),
  handler: async (ctx, args) => {
    // Get the album to share
    let albumId = args.albumId;
    if (!albumId) {
      // Default to the user's default album for backwards compat
      const defaultAlbum = await ctx.db
        .query("privateAlbums")
        .withIndex("by_userId_isDefault", (q) =>
          q.eq("userId", args.ownerUserId).eq("isDefault", true)
        )
        .first();

      if (!defaultAlbum) {
        throw new Error("No album to share. Create an album first.");
      }
      albumId = defaultAlbum._id;
    }

    // Verify album ownership
    const album = await ctx.db.get(albumId);
    if (!album || album.userId !== args.ownerUserId) {
      throw new Error("Album not found or unauthorized");
    }

    // Verify owner is Ultra if using time-limited access
    if (args.expiresIn) {
      const owner = await ctx.db.get(args.ownerUserId);
      if (owner?.subscriptionTier !== "ultra") {
        throw new Error("Time-limited sharing is only available for Ultra subscribers");
      }
    }

    // Check if already shared (per album now)
    const existing = await ctx.db
      .query("albumAccessGrants")
      .withIndex("by_album_granted", (q) =>
        q.eq("albumId", albumId).eq("grantedUserId", args.grantedUserId)
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
      albumId: albumId,
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
    albumId: v.optional(v.id("privateAlbums")), // Optional - if not provided, revoke all
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.albumId) {
      // Revoke access to specific album
      const grant = await ctx.db
        .query("albumAccessGrants")
        .withIndex("by_album_granted", (q) =>
          q.eq("albumId", args.albumId).eq("grantedUserId", args.grantedUserId)
        )
        .first();

      if (grant && grant.ownerUserId === args.ownerUserId) {
        await ctx.db.patch(grant._id, { isRevoked: true });
      }
    } else {
      // Revoke access to all albums (backwards compat)
      const grants = await ctx.db
        .query("albumAccessGrants")
        .withIndex("by_owner_granted", (q) =>
          q.eq("ownerUserId", args.ownerUserId).eq("grantedUserId", args.grantedUserId)
        )
        .collect();

      for (const grant of grants) {
        await ctx.db.patch(grant._id, { isRevoked: true });
      }
    }
    return null;
  },
});

// ============================================================================
// ALBUM ACCESS QUERIES
// ============================================================================

// Check if user has access to a specific album
export const hasAlbumAccess = query({
  args: {
    albumId: v.optional(v.id("privateAlbums")),
    ownerUserId: v.id("users"),
    viewerUserId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Owner always has access to their own album
    if (args.ownerUserId === args.viewerUserId) return true;

    if (args.albumId) {
      // Check access to specific album
      const grant = await ctx.db
        .query("albumAccessGrants")
        .withIndex("by_album_granted", (q) =>
          q.eq("albumId", args.albumId).eq("grantedUserId", args.viewerUserId)
        )
        .first();

      if (!grant || grant.isRevoked) return false;
      if (grant.expiresAt && grant.expiresAt < Date.now()) return false;
      return true;
    } else {
      // Check if has access to any album from owner (backwards compat)
      const grant = await ctx.db
        .query("albumAccessGrants")
        .withIndex("by_owner_granted", (q) =>
          q.eq("ownerUserId", args.ownerUserId).eq("grantedUserId", args.viewerUserId)
        )
        .first();

      if (!grant || grant.isRevoked) return false;
      if (grant.expiresAt && grant.expiresAt < Date.now()) return false;
      return true;
    }
  },
});

// Get album sharing status for a conversation (updated for multiple albums)
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

    // Get all my shares with them
    const myShares = await ctx.db
      .query("albumAccessGrants")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", args.userId))
      .collect();

    const mySharesWithThem = myShares.filter((s) => s.grantedUserId === otherUserId);

    // Get all their shares with me
    const theirShares = await ctx.db
      .query("albumAccessGrants")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", otherUserId))
      .collect();

    const theirSharesWithMe = theirShares.filter((s) => s.grantedUserId === args.userId);

    const now = Date.now();

    // Filter active shares
    const activeMyShares = mySharesWithThem.filter(
      (s) => !s.isRevoked && (!s.expiresAt || s.expiresAt > now)
    );
    const activeTheirShares = theirSharesWithMe.filter(
      (s) => !s.isRevoked && (!s.expiresAt || s.expiresAt > now)
    );

    // Enrich with album details
    const mySharedAlbums = await Promise.all(
      activeMyShares.map(async (share) => {
        const album = share.albumId ? await ctx.db.get(share.albumId) : null;
        return {
          grantId: share._id,
          albumId: share.albumId,
          albumName: album?.name ?? DEFAULT_ALBUM_NAME,
          expiresAt: share.expiresAt,
          grantedAt: share.grantedAt,
        };
      })
    );

    const theirSharedAlbums = await Promise.all(
      activeTheirShares.map(async (share) => {
        const album = share.albumId ? await ctx.db.get(share.albumId) : null;
        return {
          grantId: share._id,
          albumId: share.albumId,
          albumName: album?.name ?? DEFAULT_ALBUM_NAME,
          expiresAt: share.expiresAt,
          grantedAt: share.grantedAt,
        };
      })
    );

    // Backwards compatibility - single share status
    const latestMyShare = mySharedAlbums.length > 0 ? mySharedAlbums[0] : null;
    const latestTheirShare = theirSharedAlbums.length > 0 ? theirSharedAlbums[0] : null;

    return {
      // Backwards compatible fields
      iShared: mySharedAlbums.length > 0,
      myShareExpiresAt: latestMyShare?.expiresAt,
      theyShared: theirSharedAlbums.length > 0,
      theirShareExpiresAt: latestTheirShare?.expiresAt,
      otherUserId,
      // New multi-album fields
      mySharedAlbums,
      theirSharedAlbums,
    };
  },
});

// View another user's album (with access check) - updated to accept albumId
export const viewUserAlbum = query({
  args: {
    viewerUserId: v.id("users"),
    ownerUserId: v.id("users"),
    albumId: v.optional(v.id("privateAlbums")),
  },
  handler: async (ctx, args) => {
    // If albumId provided, use that directly
    if (args.albumId) {
      const album = await ctx.db.get(args.albumId);
      if (!album || album.userId !== args.ownerUserId) return null;

      // Check access (unless viewing own album)
      if (args.viewerUserId !== args.ownerUserId) {
        const grant = await ctx.db
          .query("albumAccessGrants")
          .withIndex("by_album_granted", (q) =>
            q.eq("albumId", args.albumId).eq("grantedUserId", args.viewerUserId)
          )
          .first();

        if (!grant || grant.isRevoked) return null;
        if (grant.expiresAt && grant.expiresAt < Date.now()) return null;
      }

      const photos = await ctx.db
        .query("privateAlbumPhotos")
        .withIndex("by_albumId_order", (q) => q.eq("albumId", args.albumId))
        .collect();

      const photosWithUrls = await Promise.all(
        photos.map(async (photo) => ({
          _id: photo._id,
          url: await ctx.storage.getUrl(photo.storageId),
          caption: photo.caption,
          order: photo.order,
        }))
      );

      return {
        albumId: album._id,
        albumName: album.name,
        photos: photosWithUrls.filter((p) => p.url !== null),
      };
    }

    // Backwards compat: no albumId, check access via owner and return default album
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

    return {
      albumId: null,
      albumName: DEFAULT_ALBUM_NAME,
      photos: photosWithUrls.filter((p) => p.url !== null),
    };
  },
});

// List who I've shared my albums with
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

    const grantsWithDetails = await Promise.all(
      activeGrants.map(async (grant) => {
        const user = await ctx.db.get(grant.grantedUserId);
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", grant.grantedUserId))
          .unique();

        const album = grant.albumId ? await ctx.db.get(grant.albumId) : null;

        return {
          ...grant,
          albumName: album?.name ?? DEFAULT_ALBUM_NAME,
          grantedUser: {
            _id: grant.grantedUserId,
            name: profile?.displayName ?? user?.name ?? "Unknown",
            imageUrl: user?.imageUrl,
          },
        };
      })
    );

    return grantsWithDetails;
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

    const grantsWithDetails = await Promise.all(
      activeGrants.map(async (grant) => {
        const user = await ctx.db.get(grant.ownerUserId);
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", grant.ownerUserId))
          .unique();

        const album = grant.albumId ? await ctx.db.get(grant.albumId) : null;

        // Get photo count for this album
        let photos;
        if (grant.albumId) {
          photos = await ctx.db
            .query("privateAlbumPhotos")
            .withIndex("by_albumId", (q) => q.eq("albumId", grant.albumId))
            .collect();
        } else {
          photos = await ctx.db
            .query("privateAlbumPhotos")
            .withIndex("by_userId", (q) => q.eq("userId", grant.ownerUserId))
            .collect();
        }

        // Get first photo for preview
        const firstPhoto = photos.length > 0 ? photos[0] : null;
        const previewUrl = firstPhoto
          ? await ctx.storage.getUrl(firstPhoto.storageId)
          : null;

        return {
          ...grant,
          albumId: grant.albumId,
          albumName: album?.name ?? DEFAULT_ALBUM_NAME,
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

    return grantsWithDetails;
  },
});

// ============================================================================
// MIGRATION HELPER (Internal)
// ============================================================================

// Migration: Link existing photos and grants to default albums
export const migrateToMultiAlbums = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all photos without albumId
    const photos = await ctx.db
      .query("privateAlbumPhotos")
      .collect();

    const photosToMigrate = photos.filter((p) => !p.albumId);
    const userIds = [...new Set(photosToMigrate.map((p) => p.userId))];

    for (const userId of userIds) {
      // Get or create default album
      let defaultAlbum = await ctx.db
        .query("privateAlbums")
        .withIndex("by_userId_isDefault", (q) =>
          q.eq("userId", userId).eq("isDefault", true)
        )
        .first();

      if (!defaultAlbum) {
        const now = Date.now();
        const albumId = await ctx.db.insert("privateAlbums", {
          userId,
          name: DEFAULT_ALBUM_NAME,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        });
        defaultAlbum = await ctx.db.get(albumId);
      }

      if (!defaultAlbum) continue;

      // Update photos
      const userPhotos = photosToMigrate.filter((p) => p.userId === userId);
      for (const photo of userPhotos) {
        await ctx.db.patch(photo._id, { albumId: defaultAlbum._id });
      }

      // Update grants
      const grants = await ctx.db
        .query("albumAccessGrants")
        .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
        .collect();

      const grantsToMigrate = grants.filter((g) => !g.albumId);
      for (const grant of grantsToMigrate) {
        await ctx.db.patch(grant._id, { albumId: defaultAlbum._id });
      }
    }
  },
});
