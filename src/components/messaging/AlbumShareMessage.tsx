import { useState, useMemo } from "react"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { AlbumViewer } from "../albums/AlbumViewer"
import { ImageIcon, Clock, Lock, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface AlbumShareData {
  albumId?: string
  albumName: string
  expiresAt?: number
}

interface AlbumShareMessageProps {
  content: string
  isOwn: boolean
  senderId: Id<"users">
  currentUserId: Id<"users">
  senderName: string
}

export function AlbumShareMessage({
  content,
  isOwn,
  senderId,
  currentUserId,
  senderName,
}: AlbumShareMessageProps) {
  const [showAlbumViewer, setShowAlbumViewer] = useState(false)

  // Parse the album share data from content
  const albumData = useMemo((): AlbumShareData | null => {
    try {
      return JSON.parse(content)
    } catch {
      return null
    }
  }, [content])

  // Check if access is expired
  const isExpired = useMemo(() => {
    if (!albumData?.expiresAt) return false
    return Date.now() > albumData.expiresAt
  }, [albumData?.expiresAt])

  // Format remaining time
  const formatExpiry = (expiresAt?: number) => {
    if (!expiresAt) return null
    const now = Date.now()
    const diff = expiresAt - now
    if (diff <= 0) return "Expired"
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ${hours % 24}h left`
    if (hours > 0) return `${hours}h left`
    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes}m left`
  }

  if (!albumData) {
    // Fallback for invalid album share data
    return (
      <p className="text-sm whitespace-pre-wrap break-words">
        {content}
      </p>
    )
  }

  // If this is our own message, we just show that we shared an album
  if (isOwn) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">
            You shared "{albumData.albumName}"
          </span>
        </div>
        {albumData.expiresAt && (
          <div className="flex items-center gap-1 text-xs opacity-80">
            <Clock className="w-3 h-3" />
            <span>{formatExpiry(albumData.expiresAt)}</span>
          </div>
        )}
      </div>
    )
  }

  // For received album shares, show a view button
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            Shared "{albumData.albumName}" with you
          </span>
        </div>

        {albumData.expiresAt && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            isExpired ? "text-destructive" : "text-muted-foreground"
          )}>
            {isExpired ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            <span>{formatExpiry(albumData.expiresAt)}</span>
          </div>
        )}

        <Button
          size="sm"
          variant={isExpired ? "outline" : "secondary"}
          className="w-full"
          onClick={() => setShowAlbumViewer(true)}
          disabled={isExpired}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          {isExpired ? "Access Expired" : "View Album"}
        </Button>
      </div>

      {/* Album Viewer Dialog */}
      <AlbumViewer
        viewerUserId={currentUserId}
        ownerUserId={senderId}
        albumId={albumData.albumId as Id<"privateAlbums"> | undefined}
        albumName={albumData.albumName}
        ownerName={senderName}
        isOpen={showAlbumViewer}
        onClose={() => setShowAlbumViewer(false)}
        expiresAt={albumData.expiresAt}
      />
    </>
  )
}
