import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useCurrentUser } from "./useCurrentUser"

/**
 * Hook to manage referrals and get referral statistics
 */
export function useReferrals() {
  const { user, isLoading: isUserLoading } = useCurrentUser()

  const stats = useQuery(
    api.referrals.getReferralStats,
    user?._id ? { userId: user._id } : "skip"
  )

  const history = useQuery(
    api.referrals.getReferralHistory,
    user?._id ? { userId: user._id } : "skip"
  )

  const generateCode = useMutation(api.referrals.generateReferralCode)
  const applyCode = useMutation(api.referrals.applyReferralCode)

  // Generate the shareable referral link
  const referralLink = stats?.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${stats.referralCode}`
    : null

  // Progress toward next reward (0-3)
  const progressToNextReward = stats
    ? 3 - stats.creditsToNextReward
    : 0

  return {
    // Stats
    referralCode: stats?.referralCode ?? null,
    totalReferrals: stats?.totalReferrals ?? 0,
    pendingReferrals: stats?.pendingReferrals ?? 0,
    activatedReferrals: stats?.activatedReferrals ?? 0,
    creditsToNextReward: stats?.creditsToNextReward ?? 3,
    progressToNextReward,

    // Referral Ultra status
    hasReferralUltra: stats?.hasReferralUltra ?? false,
    referralUltraDaysRemaining: stats?.referralUltraDaysRemaining ?? null,
    referralUltraExpiresAt: stats?.referralUltraExpiresAt ?? null,

    // History
    referralHistory: history ?? [],

    // Computed
    referralLink,
    isLoading: isUserLoading || stats === undefined,

    // Actions
    generateCode: async () => {
      if (!user?._id) throw new Error("User not found")
      return generateCode({ userId: user._id })
    },
    applyCode: async (code: string) => {
      if (!user?._id) throw new Error("User not found")
      return applyCode({ userId: user._id, referralCode: code })
    },
  }
}
