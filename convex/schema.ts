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
    hideFromDiscovery: v.optional(v.boolean()),

    // Referral system fields
    referralCode: v.optional(v.string()),           // Unique 8-char referral code
    referredBy: v.optional(v.id("users")),          // Who referred this user
    referralCredits: v.optional(v.number()),        // Total successful referrals
    referralUltraExpiresAt: v.optional(v.number()), // When referral-based Ultra expires

    // Admin & moderation fields
    isAdmin: v.optional(v.boolean()),               // Admin access
    isBanned: v.optional(v.boolean()),              // Account banned
    bannedAt: v.optional(v.number()),               // When banned
    bannedReason: v.optional(v.string()),           // Ban reason
    isSuspended: v.optional(v.boolean()),           // Temporarily suspended
    suspendedUntil: v.optional(v.number()),         // Suspension end time
    warningCount: v.optional(v.number()),           // Number of warnings issued
  })
    .index("by_email", ["email"])
    .index("by_workosId", ["workosId"])
    .index("by_polarCustomerId", ["polarCustomerId"])
    .index("by_referralCode", ["referralCode"])
    .index("by_isAdmin", ["isAdmin"]),

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
    locationName: v.optional(v.string()),
    
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
      v.literal("location"),
      v.literal("album_share")
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
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("resolved"), v.literal("dismissed")),
    // Admin review fields
    reviewedBy: v.optional(v.id("users")),   // Admin who reviewed
    reviewedAt: v.optional(v.number()),      // When reviewed
    adminNotes: v.optional(v.string()),      // Admin notes/action taken
    actionTaken: v.optional(v.union(
      v.literal("none"),
      v.literal("warning"),
      v.literal("suspension"),
      v.literal("ban")
    )),
  })
    .index("by_reporter", ["reporterId"])
    .index("by_reported", ["reportedId"])
    .index("by_status", ["status"])
    .index("by_reportedAt", ["reportedAt"]),

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
  // PRIVATE ALBUMS TABLE (Ultra feature - multiple named albums)
  // ============================================================================
  privateAlbums: defineTable({
    userId: v.id("users"), // Owner of the album
    name: v.string(), // Album name (e.g., "Vacation", "Beach Trip")
    description: v.optional(v.string()), // Optional description
    coverPhotoId: v.optional(v.id("privateAlbumPhotos")), // Cover photo reference
    isDefault: v.boolean(), // Is this the user's default album? (for backwards compat)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_isDefault", ["userId", "isDefault"]),

  // ============================================================================
  // PRIVATE ALBUM PHOTOS TABLE
  // ============================================================================
  privateAlbumPhotos: defineTable({
    userId: v.id("users"), // Owner of the photo
    albumId: v.optional(v.id("privateAlbums")), // Album this photo belongs to (optional for migration)
    storageId: v.id("_storage"), // Convex storage reference
    caption: v.optional(v.string()), // Optional caption
    uploadedAt: v.number(), // Upload timestamp
    order: v.number(), // For ordering photos in album
  })
    .index("by_userId", ["userId"])
    .index("by_userId_order", ["userId", "order"])
    .index("by_albumId", ["albumId"])
    .index("by_albumId_order", ["albumId", "order"]),

  // ============================================================================
  // ALBUM ACCESS GRANTS TABLE
  // ============================================================================
  albumAccessGrants: defineTable({
    albumId: v.optional(v.id("privateAlbums")), // Specific album being shared (optional for migration)
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
    .index("by_conversation", ["conversationId"])
    .index("by_album_granted", ["albumId", "grantedUserId"])
    .index("by_album", ["albumId"]),

  // ============================================================================
  // REFERRALS TABLE
  // ============================================================================
  referrals: defineTable({
    referrerId: v.id("users"),           // User who shared the referral code
    referredUserId: v.id("users"),       // User who signed up with the code
    referralCode: v.string(),            // The code used
    createdAt: v.number(),               // When referral was created (signup time)
    activatedAt: v.optional(v.number()), // When the 7-day threshold was met
    status: v.union(
      v.literal("pending"),              // Waiting for 7-day activity
      v.literal("activated"),            // Successfully completed 7 days active
      v.literal("expired")               // User never became active
    ),
  })
    .index("by_referrer", ["referrerId"])
    .index("by_referrer_status", ["referrerId", "status"])
    .index("by_referredUser", ["referredUserId"])
    .index("by_status", ["status"]),

  // ============================================================================
  // REFERRAL REWARDS TABLE (Audit Trail)
  // ============================================================================
  referralRewards: defineTable({
    userId: v.id("users"),               // User who earned the reward
    referralId: v.id("referrals"),       // Which referral triggered this reward
    monthsGranted: v.number(),           // Always 1 month per 3 referrals
    grantedAt: v.number(),               // Timestamp when reward was granted
    expiresAt: v.number(),               // When this reward period expires
  })
    .index("by_userId", ["userId"]),

  // ============================================================================
  // PROFILE VIEWS TABLE (for tracking daily views)
  // ============================================================================
  profileViews: defineTable({
    viewerId: v.id("users"),         // User who viewed the profile
    viewedId: v.id("users"),         // User whose profile was viewed
    viewedAt: v.number(),            // Timestamp of the view
    date: v.string(),                // Date string (YYYY-MM-DD) for daily tracking
  })
    .index("by_viewer", ["viewerId"])
    .index("by_viewed", ["viewedId"])
    .index("by_viewer_date", ["viewerId", "date"])
    .index("by_viewer_viewed", ["viewerId", "viewedId"]),

  // ============================================================================
  // WAVES TABLE
  // ============================================================================
  waves: defineTable({
    waverId: v.id("users"),           // User who sent the wave
    wavedAtId: v.id("users"),         // User who received the wave
    wavedAt: v.number(),              // Timestamp of the wave
  })
    .index("by_waver", ["waverId"])
    .index("by_wavedAt", ["wavedAtId"])
    .index("by_waver_wavedAt", ["waverId", "wavedAtId"]),

  // ============================================================================
  // LOOKING NOW POSTS TABLE
  // ============================================================================
  lookingNowPosts: defineTable({
    userId: v.id("users"),               // User who created the post
    message: v.string(),                 // What they're looking for right now
    latitude: v.optional(v.number()),    // Location coordinates
    longitude: v.optional(v.number()),   // Location coordinates
    locationName: v.optional(v.string()),// Display name for location (e.g., "Downtown")
    canHost: v.optional(v.boolean()),    // Whether the user can host (true = can host, false = can't host, undefined = not specified)
    createdAt: v.number(),               // When the post was created
    expiresAt: v.number(),               // When the post expires (auto-delete after X hours)
    isActive: v.boolean(),               // Whether the post is still active
  })
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_isActive_createdAt", ["isActive", "createdAt"]),
});


