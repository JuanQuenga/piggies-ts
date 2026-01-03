import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useAuth } from "@workos/authkit-tanstack-react-start/client"
import { useEffect } from "react"

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
      syncUser({
        workosId: workosUser.id,
        email: workosUser.email ?? "",
        name: `${workosUser.firstName ?? ""} ${workosUser.lastName ?? ""}`.trim() || "User",
        imageUrl: workosUser.profilePictureUrl ?? undefined,
      })
    }
  }, [workosUser, convexUser, syncUser])
  
  return {
    user: convexUser,
    workosUser,
    isLoading: isAuthLoading || (workosUser && !convexUser),
    isAuthenticated: !!workosUser,
  }
}


