import { useState, useEffect, useRef, useCallback } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { X, Eye, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface SnapViewerProps {
  messageId: Id<"messages">
  viewerId: Id<"users">
  onClose: () => void
}

export function SnapViewer({ messageId, viewerId, onClose }: SnapViewerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isViewing, setIsViewing] = useState(false)
  const [hasMarkedViewed, setHasMarkedViewed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const snapData = useQuery(api.messages.getSnapUrl, { messageId, viewerId })
  const markViewed = useMutation(api.messages.markSnapViewed)

  // Handle marking snap as viewed
  const handleMarkViewed = useCallback(async () => {
    if (hasMarkedViewed) return
    setHasMarkedViewed(true)

    try {
      await markViewed({ messageId, viewerId })
    } catch (err) {
      console.error("Failed to mark snap as viewed:", err)
    }
  }, [hasMarkedViewed, markViewed, messageId, viewerId])

  // Start viewing
  const startViewing = useCallback(() => {
    if (!snapData || snapData.isExpired || isViewing) return

    setIsViewing(true)

    if (snapData.viewMode === "timed" && snapData.duration) {
      // Start countdown timer
      setTimeRemaining(snapData.duration)

      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            // Timer expired
            if (timerRef.current) {
              clearInterval(timerRef.current)
            }
            handleMarkViewed()
            setTimeout(onClose, 500) // Brief delay before closing
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      // View once mode - mark as viewed immediately when they start viewing
      // Close when they release or after 10 seconds max
      setTimeout(() => {
        handleMarkViewed()
        onClose()
      }, 10000) // Max 10 seconds for view once
    }
  }, [snapData, isViewing, handleMarkViewed, onClose])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Handle close (also marks as viewed for view_once)
  const handleClose = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Mark as viewed when closing (for view_once mode)
    if (isViewing && snapData?.viewMode === "view_once") {
      handleMarkViewed()
    }

    onClose()
  }

  // Loading state
  if (!snapData) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Expired state
  if (snapData.isExpired) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white p-2"
        >
          <X className="w-6 h-6" />
        </button>
        <Eye className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-white text-lg">This snap has expired</p>
        <p className="text-muted-foreground text-sm mt-2">
          The photo is no longer available
        </p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header with close button */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2 text-white">
          {snapData.viewMode === "view_once" ? (
            <>
              <Eye className="w-5 h-5" />
              <span className="text-sm">View Once</span>
            </>
          ) : (
            <>
              <Clock className="w-5 h-5" />
              <span className="text-sm">{snapData.duration}s</span>
            </>
          )}
        </div>
        <button
          onClick={handleClose}
          className="text-white/60 hover:text-white p-2"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Timer display */}
      {isViewing && timeRemaining !== null && (
        <div className="absolute top-16 left-0 right-0 z-10 flex justify-center">
          <div className={cn(
            "px-4 py-2 rounded-full text-lg font-bold",
            timeRemaining <= 3 ? "bg-red-500 text-white animate-pulse" : "bg-white/20 text-white"
          )}>
            {timeRemaining}s
          </div>
        </div>
      )}

      {/* Snap image */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        onClick={!isViewing ? startViewing : undefined}
        onTouchStart={!isViewing ? startViewing : undefined}
      >
        {!isViewing ? (
          // Tap to view prompt
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Eye className="w-12 h-12 text-white" />
            </div>
            <p className="text-white text-lg font-medium">Tap to view</p>
            <p className="text-white/60 text-sm mt-1">
              {snapData.viewMode === "view_once"
                ? "This snap will disappear after viewing"
                : `You have ${snapData.duration} seconds to view`
              }
            </p>
          </div>
        ) : (
          <img
            src={snapData.url}
            alt="Snap"
            className="max-w-full max-h-full object-contain"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
      </div>

      {/* Progress bar for timed mode */}
      {isViewing && snapData.viewMode === "timed" && snapData.duration && timeRemaining !== null && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{
              width: `${(timeRemaining / snapData.duration) * 100}%`
            }}
          />
        </div>
      )}
    </div>
  )
}
