import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ImagePlus,
  Trash2,
  Loader2,
  Lock,
  X,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { AlbumPhotoUpload } from "./AlbumPhotoUpload"
import { cn } from "@/lib/utils"

interface PrivateAlbumManagerProps {
  userId: Id<"users">
  isUltra: boolean
}

export function PrivateAlbumManager({ userId, isUltra }: PrivateAlbumManagerProps) {
  const [showUpload, setShowUpload] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [photoToDelete, setPhotoToDelete] = useState<Id<"privateAlbumPhotos"> | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const albumPhotos = useQuery(api.albums.getMyAlbumPhotos, { userId })
  const albumStatus = useQuery(api.albums.getAlbumStatus, { userId })
  const removePhoto = useMutation(api.albums.removePhotoFromAlbum)

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return

    setIsDeleting(true)
    try {
      await removePhoto({ userId, photoId: photoToDelete })
      toast.success("Photo deleted from album")
      setPhotoToDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete photo")
    } finally {
      setIsDeleting(false)
    }
  }

  const isAtLimit = albumStatus?.isAtLimit ?? false
  const photoCount = albumStatus?.count ?? 0
  const photoLimit = albumStatus?.limit

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Private Album
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {photoLimit
              ? `${photoCount} / ${photoLimit} photos`
              : `${photoCount} photos`
            }
          </p>
        </div>
        {!isAtLimit && (
          <Button onClick={() => setShowUpload(true)}>
            <ImagePlus className="w-4 h-4 mr-2" />
            Add Photo
          </Button>
        )}
      </div>

      {/* Upgrade prompt for free users at limit */}
      {isAtLimit && !isUltra && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Album Full</p>
              <p className="text-sm text-muted-foreground mt-1">
                You've reached your {photoLimit} photo limit. Upgrade to Ultra for unlimited photos!
              </p>
              <Button size="sm" className="mt-3">
                Upgrade to Ultra
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Photo to Album</DialogTitle>
            <DialogDescription>
              Upload a photo to your private album. Only people you share with can see these photos.
            </DialogDescription>
          </DialogHeader>
          <AlbumPhotoUpload
            userId={userId}
            isUltra={isUltra}
            onSuccess={() => setShowUpload(false)}
            onCancel={() => setShowUpload(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Photo grid */}
      {albumPhotos === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : albumPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 border-2 border-dashed border-border rounded-xl">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">Your album is empty</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add photos to share privately with others
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)}>
            <ImagePlus className="w-4 h-4 mr-2" />
            Add Your First Photo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {albumPhotos.map((photo) => (
            <div
              key={photo._id}
              className="group relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer"
              onClick={() => setSelectedPhoto(photo.url ?? null)}
            >
              <img
                src={photo.url ?? ""}
                alt="Album photo"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setPhotoToDelete(photo._id)
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {/* Add photo slot (if not at limit) */}
          {!isAtLimit && (
            <button
              onClick={() => setShowUpload(true)}
              className={cn(
                "aspect-square rounded-xl border-2 border-dashed border-border",
                "flex flex-col items-center justify-center gap-2",
                "text-muted-foreground hover:text-foreground hover:border-foreground/50",
                "transition-colors"
              )}
            >
              <ImagePlus className="w-8 h-8" />
              <span className="text-xs">Add Photo</span>
            </button>
          )}
        </div>
      )}

      {/* Lightbox for viewing photos */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={selectedPhoto}
            alt="Album photo"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!photoToDelete} onOpenChange={() => setPhotoToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Photo</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPhotoToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePhoto}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
