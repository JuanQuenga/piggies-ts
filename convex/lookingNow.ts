import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Post duration in hours (posts expire after this time)
const POST_DURATION_HOURS = 4;

// Create a new "Looking Now" post
export const createPost = mutation({
  args: {
    userId: v.id("users"),
    message: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    locationName: v.optional(v.string()),
  },
  returns: v.id("lookingNowPosts"),
  handler: async (ctx, args) => {
    // Check if user already has an active post
    const existingPost = await ctx.db
      .query("lookingNowPosts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    // If they have an active post, deactivate it
    if (existingPost) {
      await ctx.db.patch(existingPost._id, { isActive: false });
    }

    const now = Date.now();
    const expiresAt = now + POST_DURATION_HOURS * 60 * 60 * 1000;

    const postId = await ctx.db.insert("lookingNowPosts", {
      userId: args.userId,
      message: args.message,
      latitude: args.latitude,
      longitude: args.longitude,
      locationName: args.locationName,
      createdAt: now,
      expiresAt,
      isActive: true,
    });

    return postId;
  },
});

// Get all active "Looking Now" posts (for discovery)
export const getActivePosts = query({
  args: {
    currentUserId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("lookingNowPosts"),
      message: v.string(),
      locationName: v.optional(v.string()),
      createdAt: v.number(),
      expiresAt: v.number(),
      user: v.object({
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
      isOwn: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const now = Date.now();

    // Get all active posts that haven't expired
    const posts = await ctx.db
      .query("lookingNowPosts")
      .withIndex("by_isActive_createdAt", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();

    // Filter out expired posts and get user info
    const validPosts = posts.filter((post) => post.expiresAt > now);

    const postsWithUsers = await Promise.all(
      validPosts.slice(0, limit).map(async (post) => {
        const user = await ctx.db.get(post.userId);
        if (!user) return null;

        // Skip banned or suspended users
        if (user.isBanned === true) return null;
        if (user.isSuspended === true && user.suspendedUntil && user.suspendedUntil > now) {
          return null;
        }

        // Get profile for display name and photo
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", post.userId))
          .unique();

        // Get primary profile photo URL
        let profilePhotoUrl: string | undefined;
        if (profile?.profilePhotoIds && profile.profilePhotoIds.length > 0) {
          profilePhotoUrl = await ctx.storage.getUrl(profile.profilePhotoIds[0]) ?? undefined;
        }

        return {
          _id: post._id,
          message: post.message,
          locationName: post.locationName,
          createdAt: post.createdAt,
          expiresAt: post.expiresAt,
          user: {
            _id: user._id,
            name: user.name,
            imageUrl: user.imageUrl,
            isOnline: user.isOnline,
            profile: profile
              ? {
                  displayName: profile.displayName,
                  age: profile.age,
                  profilePhotoUrl,
                }
              : null,
          },
          isOwn: post.userId === args.currentUserId,
        };
      })
    );

    return postsWithUsers.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

// Get current user's active post
export const getMyActivePost = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("lookingNowPosts"),
      message: v.string(),
      locationName: v.optional(v.string()),
      createdAt: v.number(),
      expiresAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const now = Date.now();

    const post = await ctx.db
      .query("lookingNowPosts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!post || post.expiresAt <= now) {
      return null;
    }

    return {
      _id: post._id,
      message: post.message,
      locationName: post.locationName,
      createdAt: post.createdAt,
      expiresAt: post.expiresAt,
    };
  },
});

// Delete/deactivate a post
export const deletePost = mutation({
  args: {
    postId: v.id("lookingNowPosts"),
    userId: v.id("users"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);

    if (!post) {
      throw new Error("Post not found");
    }

    // Only allow the owner to delete
    if (post.userId !== args.userId) {
      throw new Error("Not authorized to delete this post");
    }

    await ctx.db.patch(args.postId, { isActive: false });

    return { success: true };
  },
});

// Update an existing post
export const updatePost = mutation({
  args: {
    postId: v.id("lookingNowPosts"),
    userId: v.id("users"),
    message: v.string(),
    locationName: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);

    if (!post) {
      throw new Error("Post not found");
    }

    if (post.userId !== args.userId) {
      throw new Error("Not authorized to update this post");
    }

    await ctx.db.patch(args.postId, {
      message: args.message,
      locationName: args.locationName,
    });

    return { success: true };
  },
});

// Cleanup expired posts (can be called periodically)
export const cleanupExpiredPosts = mutation({
  args: {},
  returns: v.object({ cleaned: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();

    const expiredPosts = await ctx.db
      .query("lookingNowPosts")
      .withIndex("by_isActive_createdAt", (q) => q.eq("isActive", true))
      .collect();

    let cleaned = 0;
    for (const post of expiredPosts) {
      if (post.expiresAt <= now) {
        await ctx.db.patch(post._id, { isActive: false });
        cleaned++;
      }
    }

    return { cleaned };
  },
});
