import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

export function useModerationNotifications(userId: Id<"users"> | undefined) {
  const notifications = useQuery(
    api.moderation.getUnreadModerationNotifications,
    userId ? { userId } : "skip"
  )

  const markReadMutation = useMutation(api.moderation.markModerationNotificationRead)
  const markAllReadMutation = useMutation(api.moderation.markAllModerationNotificationsRead)

  const markRead = async (notificationId: Id<"moderationNotifications">) => {
    if (!userId) return
    await markReadMutation({ notificationId, userId })
  }

  const markAllRead = async () => {
    if (!userId) return
    await markAllReadMutation({ userId })
  }

  return {
    notifications: notifications ?? [],
    hasUnread: (notifications?.length ?? 0) > 0,
    isLoading: notifications === undefined,
    markRead,
    markAllRead,
  }
}
