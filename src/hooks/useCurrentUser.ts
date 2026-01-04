import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useAuth } from "@workos/authkit-tanstack-react-start/client"
import { useEffect } from "react"

const REFERRAL_CODE_KEY = "piggies_referral_code"

/**
 * Hook to sync the current WorkOS user with Convex and return the Convex user
 */
export function useCurrentUser() {
  const { user: workosUser, isLoading: isAuthLoading } = useAuth()

  const syncUser = useMutation(api.users.syncUser)

  const convexUser = useQuery(
    api.users.getCurrentUser,
    workosUser?.id ? { workosId: workosUser.id } : "skip"
  )

  // Sync user on login
  useEffect(() => {
    if (workosUser && !convexUser) {
      // Check for referral code in localStorage (set from URL param)
      const referralCode = typeof window !== "undefined"
        ? localStorage.getItem(REFERRAL_CODE_KEY)
        : null

      syncUser({
        workosId: workosUser.id,
        email: workosUser.email ?? "",
        name: `${workosUser.firstName ?? ""} ${workosUser.lastName ?? ""}`.trim() || "User",
        imageUrl: workosUser.profilePictureUrl ?? undefined,
        referralCode: referralCode ?? undefined,
      })

      // Clear the referral code after use
      if (referralCode && typeof window !== "undefined") {
        localStorage.removeItem(REFERRAL_CODE_KEY)
      }
    }
  }, [workosUser, convexUser, syncUser])

  return {
    user: convexUser,
    workosUser,
    isLoading: isAuthLoading || (workosUser && !convexUser),
    isAuthenticated: !!workosUser,
  }
}

/**
 * Store a referral code in localStorage (call this when ?ref= is in URL)
 */
export function storeReferralCode(code: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(REFERRAL_CODE_KEY, code.toUpperCase())
  }
}


