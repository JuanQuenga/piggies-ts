import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================================================
  // USERS TABLE
  // ============================================================================
  users: defineTable({
    // WorkOS AuthKit fields
    workosId: v.string(), // WorkOS user ID
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),

    // App-specific fields
    lastActive: v.optional(v.number()),
    isOnline: v.optional(v.boolean()),

    // Polar.sh subscription fields
    polarCustomerId: v.optional(v.string()),
    polarSubscriptionId: v.optional(v.string()),
    subscriptionTier: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("ultra"))),
    subscriptionStatus: v.optional(v.union(v.literal("active"), v.literal("canceled"), v.literal("revoked"))),

    // Notification preferences
    pushNotificationsEnabled: v.optional(v.boolean()),
    emailNotificationsEnabled: v.optional(v.boolean()),

    // Privacy preferences
    showOnlineStatus: v.optional(v.boolean()),
    locationSharingEnabled: v.optional(v.boolean()),
  })
    .index("by_email", ["email"])
    .index("by_workosId", ["workosId"])
    .index("by_polarCustomerId", ["polarCustomerId"]),

  // ============================================================================
  // PROFILES TABLE
  // ============================================================================
  profiles: defineTable({
    userId: v.id("users"),
    
    // Basic Information
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    age: v.optional(v.number()),
    profilePhotoIds: v.optional(v.array(v.id("_storage"))),
    
    // Location
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    
    // Onboarding
    onboardingComplete: v.optional(v.boolean()),
    lookingFor: v.optional(v.string()), // What they're looking for
    interests: v.optional(v.array(v.string())),
  }).index("by_userId", ["userId"]),

  // ============================================================================
  // CONVERSATIONS TABLE
  // ============================================================================
  conversations: defineTable({
    participantIds: v.array(v.id("users")),
    lastMessageTime: v.optional(v.number()),
    lastMessageId: v.optional(v.id("messages")),
    participantSet: v.optional(v.array(v.id("users"))), // Sorted for efficient querying
  })
    .index("by_participant_time", ["participantSet", "lastMessageTime"])
    .index("by_lastMessageTime", ["lastMessageTime"]),

  // ============================================================================
  // MESSAGES TABLE
  // ============================================================================
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    format: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("video"),
      v.literal("gif"),
      v.literal("location")
    ),
    storageId: v.optional(v.id("_storage")),
    sentAt: v.number(),
    // Read receipts - maps user ID to timestamp when they read the message
    readAt: v.optional(v.record(v.id("users"), v.number())),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_sentAt", ["conversationId", "sentAt"])
    .searchIndex("search_content", {
      searchField: "content",
    }),

  // ============================================================================
  // BLOCKED USERS TABLE
  // ============================================================================
  blockedUsers: defineTable({
    blockerId: v.id("users"), // User who blocked
    blockedId: v.id("users"), // User who was blocked
    blockedAt: v.number(),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"])
    .index("by_blocker_blocked", ["blockerId", "blockedId"]),

  // ============================================================================
  // REPORTED USERS TABLE
  // ============================================================================
  reportedUsers: defineTable({
    reporterId: v.id("users"), // User who reported
    reportedId: v.id("users"), // User who was reported
    reason: v.string(),
    details: v.optional(v.string()),
    reportedAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("resolved")),
  })
    .index("by_reporter", ["reporterId"])
    .index("by_reported", ["reportedId"])
    .index("by_status", ["status"]),

  // ============================================================================
  // FAVORITE USERS TABLE
  // ============================================================================
  favoriteUsers: defineTable({
    userId: v.id("users"), // User who favorited
    favoriteId: v.id("users"), // User who was favorited
    favoritedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_favorite", ["favoriteId"])
    .index("by_user_favorite", ["userId", "favoriteId"]),

  // ============================================================================
  // PRIVATE ALBUM PHOTOS TABLE
  // ============================================================================
  privateAlbumPhotos: defineTable({
    userId: v.id("users"), // Owner of the photo
    storageId: v.id("_storage"), // Convex storage reference
    caption: v.optional(v.string()), // Optional caption
    uploadedAt: v.number(), // Upload timestamp
    order: v.number(), // For ordering photos in album
  })
    .index("by_userId", ["userId"])
    .index("by_userId_order", ["userId", "order"]),

  // ============================================================================
  // ALBUM ACCESS GRANTS TABLE
  // ============================================================================
  albumAccessGrants: defineTable({
    ownerUserId: v.id("users"), // User who owns the album
    grantedUserId: v.id("users"), // User who has access
    conversationId: v.id("conversations"), // Conversation where access was granted
    grantedAt: v.number(), // When access was granted
    expiresAt: v.optional(v.number()), // Optional expiration (Ultra feature)
    isRevoked: v.optional(v.boolean()), // Soft revoke flag
  })
    .index("by_owner", ["ownerUserId"])
    .index("by_granted", ["grantedUserId"])
    .index("by_owner_granted", ["ownerUserId", "grantedUserId"])
    .index("by_conversation", ["conversationId"]),
});


