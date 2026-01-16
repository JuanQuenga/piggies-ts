import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useQuery } from "convex/react"
import { useNavigate } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Unlock,
  Loader2,
  ImageOff,
  Clock,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
} from "lucide-react"
import { formatDistanceToNow } from "@/lib/date-utils"

interface UnlockedAlbumsTabProps {
  userId: Id<"users">
}

interface AlbumViewerProps {
  viewerUserId: Id<"users">
  ownerUserId: Id<"users">
  albumId?: Id<"privateAlbums">
  albumName: string
  ownerName: string
  ownerImageUrl?: string
  onClose: () => void
}

function AlbumViewer({
  viewerUserId,
  ownerUserId,
  albumId,
  albumName,
  ownerName,
  ownerImageUrl,
  onClose,
}: AlbumViewerProps) {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  const albumData = useQuery(api.albums.viewUserAlbum, {
    viewerUserId,
    ownerUserId,
    albumId,
  })

  // Handle portal mounting and body scroll lock
  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const goToProfile = () => {
    onClose()
    navigate({ to: "/user/$userId", params: { userId: ownerUserId } })
  }

  const goToPrevious = () => {
    if (albumData?.photos && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToNext = () => {
    if (albumData?.photos && currentIndex < albumData.photos.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious()
    if (e.key === "ArrowRight") goToNext()
    if (e.key === "Escape") onClose()
  }

  // Don't render until mounted (for SSR safety)
  if (!mounted) return null

  const content = (() => {
    if (albumData === undefined) {
      return (
        <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ zIndex: 99999 }}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )
    }

    if (!albumData || albumData.photos.length === 0) {
      return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
          <ImageOff className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-white text-lg">This album is empty</p>
        </div>
      )
    }

    const currentPhoto = albumData.photos[currentIndex]

    return (
      <div
        className="fixed inset-0 bg-black flex flex-col"
        style={{ zIndex: 99999 }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/80 safe-area-inset-top">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white/20">
              <AvatarImage src={ownerImageUrl} />
              <AvatarFallback>{ownerName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                {albumName}
              </p>
              <p className="text-white/60 text-sm">
                {ownerName} - {currentIndex + 1} of {albumData.photos.length} photos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={goToProfile}
            >
              <User className="w-4 h-4 mr-2" />
              View Profile
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Photo viewer */}
        <div className="flex-1 min-h-0 flex items-center justify-center relative overflow-hidden">
          {/* Tap zones for mobile navigation */}
          {albumData.photos.length > 1 && (
            <>
              <button
                className="absolute left-0 top-0 w-1/4 h-full z-10 focus:outline-none"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                aria-label="Previous photo"
              />
              <button
                className="absolute right-0 top-0 w-1/4 h-full z-10 focus:outline-none"
                onClick={goToNext}
                disabled={currentIndex === albumData.photos.length - 1}
                aria-label="Next photo"
              />
            </>
          )}

          {/* Previous button - always visible when multiple photos */}
          {albumData.photos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className={`absolute left-2 sm:left-4 text-white hover:bg-white/20 w-10 h-10 sm:w-12 sm:h-12 z-20 ${
                currentIndex === 0 ? "opacity-30 cursor-not-allowed" : ""
              }`}
              onClick={goToPrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
            </Button>
          )}

          {/* Current photo - properly constrained */}
          <img
            src={currentPhoto.url ?? ""}
            alt={currentPhoto.caption || `Photo ${currentIndex + 1}`}
            className="max-w-[calc(100%-5rem)] max-h-full object-contain rounded-lg select-none"
            draggable={false}
          />

          {/* Next button - always visible when multiple photos */}
          {albumData.photos.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className={`absolute right-2 sm:right-4 text-white hover:bg-white/20 w-10 h-10 sm:w-12 sm:h-12 z-20 ${
                currentIndex === albumData.photos.length - 1 ? "opacity-30 cursor-not-allowed" : ""
              }`}
              onClick={goToNext}
              disabled={currentIndex === albumData.photos.length - 1}
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
            </Button>
          )}
        </div>

        {/* Caption if present */}
        {currentPhoto.caption && (
          <div className="p-4 bg-black/50 text-center">
            <p className="text-white/80">{currentPhoto.caption}</p>
          </div>
        )}

        {/* Thumbnail strip */}
        <div className="p-4 pb-6 bg-black/50 safe-area-inset-bottom">
          <div className="flex gap-2 justify-center overflow-x-auto max-w-full">
            {albumData.photos.map((photo, index) => (
              <button
                key={photo._id}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? "border-primary scale-110"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={photo.url ?? ""}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  })()

  // Render via portal to document.body to escape all stacking contexts
  return createPortal(content, document.body)
}

export function UnlockedAlbumsTab({ userId }: UnlockedAlbumsTabProps) {
  const navigate = useNavigate()
  const [viewingAlbum, setViewingAlbum] = useState<{
    ownerUserId: Id<"users">
    albumId?: Id<"privateAlbums">
    albumName: string
    ownerName: string
    ownerImageUrl?: string
  } | null>(null)

  const sharedAlbums = useQuery(api.albums.getAlbumsSharedWithMe, { userId })

  const formatExpiration = (expiresAt: number | undefined) => {
    if (!expiresAt) return null
    const now = Date.now()
    if (expiresAt <= now) return "Expired"
    const diff = expiresAt - now
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `Expires in ${days}d`
    if (hours > 0) return `Expires in ${hours}h`
    return "Expires soon"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Unlock className="w-5 h-5" />
          Unlocked Albums
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Private albums that others have shared with you
        </p>
      </div>

      {/* Albums list */}
      {sharedAlbums === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : sharedAlbums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 border-2 border-dashed border-border rounded-xl">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">No unlocked albums</p>
            <p className="text-sm text-muted-foreground mt-1">
              When someone shares their private album with you, it will appear here
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sharedAlbums.map((album) => {
            const expiration = formatExpiration(album.expiresAt)
            return (
              <div
                key={album._id}
                className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() =>
                  setViewingAlbum({
                    ownerUserId: album.owner._id,
                    albumId: album.albumId ?? undefined,
                    albumName: album.albumName,
                    ownerName: album.owner.name,
                    ownerImageUrl: album.owner.imageUrl,
                  })
                }
              >
                {/* Album preview */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {album.previewUrl ? (
                    <img
                      src={album.previewUrl}
                      alt={album.albumName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Album info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="font-medium truncate">{album.albumName}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={album.owner.imageUrl} />
                      <AvatarFallback className="text-xs">
                        {album.owner.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground truncate">
                      {album.owner.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>{album.photoCount} photos</span>
                    <span>-</span>
                    <span>Shared {formatDistanceToNow(album.grantedAt)} ago</span>
                  </div>
                  {expiration && (
                    <div className="flex items-center gap-1 text-sm text-amber-500 mt-1">
                      <Clock className="w-3 h-3" />
                      {expiration}
                    </div>
                  )}
                </div>

                {/* Quick action */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate({ to: "/user/$userId", params: { userId: album.owner._id } })
                  }}
                >
                  <ExternalLink className="w-5 h-5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Album viewer */}
      {viewingAlbum && (
        <AlbumViewer
          viewerUserId={userId}
          ownerUserId={viewingAlbum.ownerUserId}
          albumId={viewingAlbum.albumId}
          albumName={viewingAlbum.albumName}
          ownerName={viewingAlbum.ownerName}
          ownerImageUrl={viewingAlbum.ownerImageUrl}
          onClose={() => setViewingAlbum(null)}
        />
      )}
    </div>
  )
}
