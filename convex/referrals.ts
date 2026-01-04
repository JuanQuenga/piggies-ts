import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Constants
const REFERRALS_FOR_REWARD = 3;
const REWARD_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACTIVATION_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Generate a random 8-character alphanumeric code
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars like O, 0, I, 1
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================================================
// MUTATIONS
// ============================================================================

// Generate or get referral code for a user
export const generateReferralCode = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Return existing code if user already has one
    if (user.referralCode) {
      return user.referralCode;
    }

    // Generate a unique code
    let code = generateCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_referralCode", (q) => q.eq("referralCode", code))
        .unique();

      if (!existing) {
        break;
      }
      code = generateCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique referral code");
    }

    // Save the code to the user
    await ctx.db.patch(args.userId, { referralCode: code });

    return code;
  },
});

// Apply a referral code during signup
export const applyReferralCode = mutation({
  args: {
    userId: v.id("users"),
    referralCode: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    referrerName: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Check if user was already referred
    if (user.referredBy) {
      return { success: false, message: "You have already used a referral code" };
    }

    // Find referrer by code
    const referrer = await ctx.db
      .query("users")
      .withIndex("by_referralCode", (q) => q.eq("referralCode", args.referralCode.toUpperCase()))
      .unique();

    if (!referrer) {
      return { success: false, message: "Invalid referral code" };
    }

    // Prevent self-referral
    if (referrer._id === args.userId) {
      return { success: false, message: "You cannot use your own referral code" };
    }

    // Check if this referral already exists
    const existingReferral = await ctx.db
      .query("referrals")
      .withIndex("by_referredUser", (q) => q.eq("referredUserId", args.userId))
      .unique();

    if (existingReferral) {
      return { success: false, message: "Referral already recorded" };
    }

    // Create the referral record
    await ctx.db.insert("referrals", {
      referrerId: referrer._id,
      referredUserId: args.userId,
      referralCode: args.referralCode.toUpperCase(),
      createdAt: Date.now(),
      status: "pending",
    });

    // Update user's referredBy field
    await ctx.db.patch(args.userId, { referredBy: referrer._id });

    return {
      success: true,
      message: "Referral code applied successfully!",
      referrerName: referrer.name,
    };
  },
});

// Internal mutation to process referral activation (called by cron)
export const processReferralActivation = internalMutation({
  args: {
    referralId: v.id("referrals"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral || referral.status !== "pending") {
      return null;
    }

    const now = Date.now();

    // Mark referral as activated
    await ctx.db.patch(args.referralId, {
      status: "activated",
      activatedAt: now,
    });

    // Increment referrer's credit count
    const referrer = await ctx.db.get(referral.referrerId);
    if (!referrer) {
      return null;
    }

    const newCredits = (referrer.referralCredits ?? 0) + 1;
    await ctx.db.patch(referrer._id, { referralCredits: newCredits });

    // Check if it's time to grant a reward (every 3 credits)
    if (newCredits % REFERRALS_FOR_REWARD === 0) {
      await ctx.scheduler.runAfter(0, internal.referrals.grantReferralUltra, {
        userId: referrer._id,
        referralId: args.referralId,
        creditsStart: newCredits - REFERRALS_FOR_REWARD + 1,
        creditsEnd: newCredits,
      });
    }

    return null;
  },
});

// Internal mutation to grant referral Ultra
export const grantReferralUltra = internalMutation({
  args: {
    userId: v.id("users"),
    referralId: v.id("referrals"),
    creditsStart: v.number(),
    creditsEnd: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const now = Date.now();

    // Calculate new expiration (extend from current expiration or from now)
    const currentExpiration = user.referralUltraExpiresAt ?? now;
    const baseTime = Math.max(currentExpiration, now);
    const newExpiration = baseTime + REWARD_DURATION_MS;

    // Update user's referral Ultra expiration
    await ctx.db.patch(args.userId, {
      referralUltraExpiresAt: newExpiration,
    });

    // Create audit record
    await ctx.db.insert("referralRewards", {
      userId: args.userId,
      referralId: args.referralId,
      monthsGranted: 1,
      grantedAt: now,
      expiresAt: newExpiration,
    });

    return null;
  },
});

// Check pending referrals for activation (called by cron job)
export const checkPendingReferrals = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Get all pending referrals
    const pendingReferrals = await ctx.db
      .query("referrals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    for (const referral of pendingReferrals) {
      // Check if 7 days have passed since signup
      const signupTime = referral.createdAt;
      const sevenDaysLater = signupTime + ACTIVATION_THRESHOLD_MS;

      if (now < sevenDaysLater) {
        // Not yet 7 days since signup
        continue;
      }

      // Get the referred user
      const referredUser = await ctx.db.get(referral.referredUserId);
      if (!referredUser) {
        // User deleted, mark as expired
        await ctx.db.patch(referral._id, { status: "expired" });
        continue;
      }

      // Check if user has been active (lastActive after signup + 1 day)
      const hasBeenActive =
        referredUser.lastActive &&
        referredUser.lastActive > signupTime + 24 * 60 * 60 * 1000; // At least 1 day after signup

      if (hasBeenActive) {
        // User is active, process activation
        await ctx.scheduler.runAfter(0, internal.referrals.processReferralActivation, {
          referralId: referral._id,
        });
      }
      // If not active, keep pending (could add expiration logic later)
    }

    return null;
  },
});

// Check for expired referral Ultra subscriptions (called by cron job)
export const checkExpiredReferralUltra = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Find users with expired referral Ultra
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      // Skip if no referral Ultra or not expired
      if (!user.referralUltraExpiresAt || user.referralUltraExpiresAt > now) {
        continue;
      }

      // Skip if user has an active paid subscription
      if (user.subscriptionTier === "ultra" && user.subscriptionStatus === "active" && user.polarSubscriptionId) {
        continue;
      }

      // Clear the expired referral Ultra timestamp
      await ctx.db.patch(user._id, {
        referralUltraExpiresAt: undefined,
      });
    }

    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

// Get referral statistics for a user
export const getReferralStats = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.object({
    referralCode: v.union(v.string(), v.null()),
    totalReferrals: v.number(),
    pendingReferrals: v.number(),
    activatedReferrals: v.number(),
    creditsToNextReward: v.number(),
    referralUltraExpiresAt: v.union(v.number(), v.null()),
    referralUltraDaysRemaining: v.union(v.number(), v.null()),
    hasReferralUltra: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return {
        referralCode: null,
        totalReferrals: 0,
        pendingReferrals: 0,
        activatedReferrals: 0,
        creditsToNextReward: REFERRALS_FOR_REWARD,
        referralUltraExpiresAt: null,
        referralUltraDaysRemaining: null,
        hasReferralUltra: false,
      };
    }

    // Get all referrals for this user
    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerId", args.userId))
      .collect();

    const pendingReferrals = referrals.filter((r) => r.status === "pending").length;
    const activatedReferrals = referrals.filter((r) => r.status === "activated").length;
    const totalReferrals = referrals.length;

    // Calculate credits to next reward
    const currentCredits = user.referralCredits ?? 0;
    const creditsInCurrentBatch = currentCredits % REFERRALS_FOR_REWARD;
    const creditsToNextReward = REFERRALS_FOR_REWARD - creditsInCurrentBatch;

    // Calculate days remaining for referral Ultra
    let referralUltraDaysRemaining: number | null = null;
    let hasReferralUltra = false;

    if (user.referralUltraExpiresAt && user.referralUltraExpiresAt > Date.now()) {
      hasReferralUltra = true;
      referralUltraDaysRemaining = Math.ceil(
        (user.referralUltraExpiresAt - Date.now()) / (24 * 60 * 60 * 1000)
      );
    }

    return {
      referralCode: user.referralCode ?? null,
      totalReferrals,
      pendingReferrals,
      activatedReferrals,
      creditsToNextReward,
      referralUltraExpiresAt: user.referralUltraExpiresAt ?? null,
      referralUltraDaysRemaining,
      hasReferralUltra,
    };
  },
});

// Get referral history (list of referred users)
export const getReferralHistory = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("referrals"),
      referredUserName: v.string(),
      status: v.union(v.literal("pending"), v.literal("activated"), v.literal("expired")),
      createdAt: v.number(),
      activatedAt: v.union(v.number(), v.null()),
      daysUntilActivation: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", (q) => q.eq("referrerId", args.userId))
      .collect();

    const now = Date.now();

    const referralsWithDetails = await Promise.all(
      referrals.map(async (referral) => {
        const referredUser = await ctx.db.get(referral.referredUserId);

        // Calculate days until activation for pending referrals
        let daysUntilActivation: number | null = null;
        if (referral.status === "pending") {
          const activationDate = referral.createdAt + ACTIVATION_THRESHOLD_MS;
          if (activationDate > now) {
            daysUntilActivation = Math.ceil((activationDate - now) / (24 * 60 * 60 * 1000));
          }
        }

        return {
          _id: referral._id,
          referredUserName: referredUser?.name ?? "Unknown User",
          status: referral.status,
          createdAt: referral.createdAt,
          activatedAt: referral.activatedAt ?? null,
          daysUntilActivation,
        };
      })
    );

    // Sort by createdAt descending (most recent first)
    return referralsWithDetails.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get user's referral code (generates one if doesn't exist)
export const getReferralCode = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.referralCode ?? null;
  },
});

// Check who referred the current user
export const getReferrer = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      name: v.string(),
      referredAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.referredBy) {
      return null;
    }

    const referrer = await ctx.db.get(user.referredBy);
    if (!referrer) {
      return null;
    }

    // Get the referral record to get the timestamp
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_referredUser", (q) => q.eq("referredUserId", args.userId))
      .unique();

    return {
      name: referrer.name,
      referredAt: referral?.createdAt ?? user._creationTime,
    };
  },
});
