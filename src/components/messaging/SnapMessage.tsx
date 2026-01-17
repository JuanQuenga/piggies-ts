import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Camera, Eye, Clock, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SnapMessageProps {
  messageId: Id<"messages">
  viewerId: Id<"users">
  isOwn: boolean
  snapViewMode?: "view_once" | "timed"
  snapDuration?: number
  snapExpired?: boolean
  snapViewedAt?: number
  onClick?: () => void
}

export function SnapMessage({
  messageId,
  viewerId,
  isOwn,
  snapViewMode,
  snapDuration,
  snapExpired,
  snapViewedAt,
  onClick,
}: SnapMessageProps) {
  // Only fetch snap data for recipients (to check if they can view it)
  const snapData = useQuery(
    api.messages.getSnapUrl,
    !isOwn ? { messageId, viewerId } : "skip"
  )

  // Determine the status to display
  const isViewed = snapExpired || snapViewedAt !== undefined
  const canView = !isOwn && !isViewed && snapData && !snapData.isExpired

  return (
    <button
      type="button"
      onClick={canView ? onClick : undefined}
      disabled={!canView}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all min-w-[160px]",
        isOwn
          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
          : "bg-gradient-to-br from-violet-500 to-purple-600 text-white",
        canView && "hover:scale-105 cursor-pointer active:scale-95",
        !canView && "opacity-80"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
        isOwn ? "bg-white/20" : "bg-white/20"
      )}>
        {isViewed ? (
          <Check className="w-5 h-5" />
        ) : (
          <Camera className="w-5 h-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 text-left">
        <div className="font-medium text-sm">
          {isOwn ? "Snap sent" : "Snap"}
        </div>
        <div className="flex items-center gap-1 text-xs opacity-80">
          {isViewed ? (
            <>
              <Eye className="w-3 h-3" />
              <span>Opened</span>
            </>
          ) : isOwn ? (
            // Sender sees mode info
            <>
              {snapViewMode === "view_once" ? (
                <>
                  <Eye className="w-3 h-3" />
                  <span>View once</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" />
                  <span>{snapDuration}s</span>
                </>
              )}
            </>
          ) : (
            // Recipient sees tap to view
            <span>Tap to view</span>
          )}
        </div>
      </div>

      {/* Arrow indicator for viewable snaps */}
      {canView && (
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      )}
    </button>
  )
}
