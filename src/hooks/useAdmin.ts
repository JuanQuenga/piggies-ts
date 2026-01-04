import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useCurrentUser } from "./useCurrentUser"
import { Id } from "../../convex/_generated/dataModel"

/**
 * Hook to check admin status and provide admin data access
 */
export function useAdmin() {
  const { user } = useCurrentUser()

  const isAdmin = useQuery(
    api.admin.isAdmin,
    user?._id ? { userId: user._id } : "skip"
  )

  const stats = useQuery(
    api.admin.getAdminStats,
    user?._id && isAdmin ? { adminUserId: user._id } : "skip"
  )

  return {
    isAdmin: isAdmin ?? false,
    isLoading: isAdmin === undefined,
    stats,
    userId: user?._id,
  }
}

/**
 * Hook to manage reports in admin panel
 */
export function useAdminReports(status?: "pending" | "reviewed" | "resolved" | "dismissed") {
  const { user } = useCurrentUser()

  const isAdmin = useQuery(
    api.admin.isAdmin,
    user?._id ? { userId: user._id } : "skip"
  )

  const reportsData = useQuery(
    api.admin.getAllReports,
    user?._id && isAdmin ? { adminUserId: user._id, status } : "skip"
  )

  const updateReportStatus = useMutation(api.admin.updateReportStatus)

  const handleUpdateReport = async (
    reportId: Id<"reportedUsers">,
    newStatus: "pending" | "reviewed" | "resolved" | "dismissed",
    options?: {
      adminNotes?: string
      actionTaken?: "none" | "warning" | "suspension" | "ban"
      suspensionDays?: number
    }
  ) => {
    if (!user?._id) return
    await updateReportStatus({
      adminUserId: user._id,
      reportId,
      status: newStatus,
      adminNotes: options?.adminNotes,
      actionTaken: options?.actionTaken,
      suspensionDays: options?.suspensionDays,
    })
  }

  return {
    reports: reportsData?.reports ?? [],
    total: reportsData?.total ?? 0,
    hasMore: reportsData?.hasMore ?? false,
    isLoading: reportsData === undefined,
    updateReport: handleUpdateReport,
  }
}

/**
 * Hook to manage users in admin panel
 */
export function useAdminUsers(options?: {
  search?: string
  filter?: "all" | "banned" | "suspended" | "warned" | "admin"
}) {
  const { user } = useCurrentUser()

  const isAdmin = useQuery(
    api.admin.isAdmin,
    user?._id ? { userId: user._id } : "skip"
  )

  const usersData = useQuery(
    api.admin.getAllUsers,
    user?._id && isAdmin
      ? {
          adminUserId: user._id,
          search: options?.search,
          filter: options?.filter,
        }
      : "skip"
  )

  // Mutations
  const banUserMutation = useMutation(api.admin.banUser)
  const unbanUserMutation = useMutation(api.admin.unbanUser)
  const suspendUserMutation = useMutation(api.admin.suspendUser)
  const unsuspendUserMutation = useMutation(api.admin.unsuspendUser)
  const warnUserMutation = useMutation(api.admin.warnUser)
  const clearWarningsMutation = useMutation(api.admin.clearWarnings)
  const toggleAdminMutation = useMutation(api.admin.toggleAdminStatus)

  const banUser = async (userId: Id<"users">, reason: string) => {
    if (!user?._id) return
    return banUserMutation({ adminUserId: user._id, userId, reason })
  }

  const unbanUser = async (userId: Id<"users">) => {
    if (!user?._id) return
    return unbanUserMutation({ adminUserId: user._id, userId })
  }

  const suspendUser = async (userId: Id<"users">, days: number, reason?: string) => {
    if (!user?._id) return
    return suspendUserMutation({ adminUserId: user._id, userId, days, reason })
  }

  const unsuspendUser = async (userId: Id<"users">) => {
    if (!user?._id) return
    return unsuspendUserMutation({ adminUserId: user._id, userId })
  }

  const warnUser = async (userId: Id<"users">) => {
    if (!user?._id) return
    return warnUserMutation({ adminUserId: user._id, userId })
  }

  const clearWarnings = async (userId: Id<"users">) => {
    if (!user?._id) return
    return clearWarningsMutation({ adminUserId: user._id, userId })
  }

  const toggleAdmin = async (userId: Id<"users">, makeAdmin: boolean) => {
    if (!user?._id) return
    return toggleAdminMutation({ adminUserId: user._id, userId, makeAdmin })
  }

  return {
    users: usersData?.users ?? [],
    total: usersData?.total ?? 0,
    hasMore: usersData?.hasMore ?? false,
    isLoading: usersData === undefined,
    banUser,
    unbanUser,
    suspendUser,
    unsuspendUser,
    warnUser,
    clearWarnings,
    toggleAdmin,
  }
}

/**
 * Hook to get detailed user info for admin
 */
export function useAdminUserDetails(userId: Id<"users"> | undefined) {
  const { user: adminUser } = useCurrentUser()

  const isAdmin = useQuery(
    api.admin.isAdmin,
    adminUser?._id ? { userId: adminUser._id } : "skip"
  )

  const userDetails = useQuery(
    api.admin.getUserDetails,
    adminUser?._id && isAdmin && userId
      ? { adminUserId: adminUser._id, userId }
      : "skip"
  )

  return {
    user: userDetails,
    isLoading: userDetails === undefined,
  }
}
