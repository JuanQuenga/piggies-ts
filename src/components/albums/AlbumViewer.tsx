import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ImageIcon,
  X,
  Loader2,
  Lock,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface AlbumViewerProps {
  viewerUserId: Id<"users">
  ownerUserId: Id<"users">
  ownerName: string
  isOpen: boolean
  onClose: () => void
  expiresAt?: number
}

export function AlbumViewer({
  viewerUserId,
  ownerUserId,
  ownerName,
  isOpen,
  onClose,
  expiresAt,
}: AlbumViewerProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)

  const albumPhotos = useQuery(
    api.albums.viewUserAlbum,
    isOpen ? { viewerUserId, ownerUserId } : "skip"
  )

  const formatExpiry = (expires?: number) => {
    if (!expires) return null
    const now = Date.now()
    const diff = expires - now
    if (diff <= 0) return "Access expired"
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `Access expires in ${days} day${days > 1 ? "s" : ""}`
    return `Access expires in ${hours} hour${hours > 1 ? "s" : ""}`
  }

  const expiryText = formatExpiry(expiresAt)

  const handlePrevPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1)
    }
  }

  const handleNextPhoto = () => {
    if (selectedPhotoIndex !== null && albumPhotos && selectedPhotoIndex < albumPhotos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              {ownerName}'s Album
            </DialogTitle>
            {expiryText && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {expiryText}
              </p>
            )}
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            {albumPhotos === undefined ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : albumPhotos === null ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Access Denied</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You don't have access to view this album
                  </p>
                </div>
              </div>
            ) : albumPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Album is Empty</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ownerName} hasn't added any photos yet
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
                {albumPhotos.map((photo, index) => (
                  <button
                    key={photo._id}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className="relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer group"
                  >
                    <img
                      src={photo.url ?? ""}
                      alt={photo.caption || "Album photo"}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{photo.caption}</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Lightbox for viewing individual photos */}
      {selectedPhotoIndex !== null && albumPhotos && albumPhotos[selectedPhotoIndex] && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={() => setSelectedPhotoIndex(null)}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Photo counter */}
          <div className="absolute top-4 left-4 text-white/80 text-sm">
            {selectedPhotoIndex + 1} / {albumPhotos.length}
          </div>

          {/* Navigation buttons */}
          {selectedPhotoIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation()
                handlePrevPhoto()
              }}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}

          {selectedPhotoIndex < albumPhotos.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation()
                handleNextPhoto()
              }}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}

          {/* Image */}
          <div className="max-w-[90vw] max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={albumPhotos[selectedPhotoIndex].url ?? ""}
              alt={albumPhotos[selectedPhotoIndex].caption || "Album photo"}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {albumPhotos[selectedPhotoIndex].caption && (
              <p className="text-white/80 text-center mt-4 text-sm">
                {albumPhotos[selectedPhotoIndex].caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
