import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from './useCurrentUser'

/**
 * Hook to check user's subscription status
 */
export function useSubscription() {
  const { user, isLoading } = useCurrentUser()

  const isUltra = useQuery(
    api.users.hasUltraSubscription,
    user?._id ? { userId: user._id } : 'skip'
  )

  const checkoutUrl = user
    ? `/api/checkout?products=${import.meta.env.VITE_PUBLIC_POLAR_ULTRA_PRODUCT_ID}&customerEmail=${encodeURIComponent(user.email)}`
    : null

  const portalUrl = user?.polarCustomerId
    ? `/api/portal?customerId=${user.polarCustomerId}`
    : null

  return {
    isUltra: isUltra ?? false,
    isLoading: isLoading || isUltra === undefined,
    subscriptionTier: user?.subscriptionTier ?? 'free',
    subscriptionStatus: user?.subscriptionStatus,
    checkoutUrl,
    portalUrl,
  }
}



