import { useRef, useState, useCallback } from "react"
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
  Star,
  AlertCircle,
  X,
  GripVertical,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const MAX_PHOTOS = 6
const FREE_LIMIT = 5 * 1024 * 1024 // 5MB
const ULTRA_LIMIT = 25 * 1024 * 1024 // 25MB

interface ProfilePhotoGridProps {
  userId: Id<"users">
  isUltra: boolean
}

export function ProfilePhotoGrid({ userId, isUltra }: ProfilePhotoGridProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoToDelete, setPhotoToDelete] = useState<Id<"_storage"> | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profilePhotos = useQuery(api.users.getProfilePhotos, { userId })
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl)
  const addProfilePhoto = useMutation(api.users.addProfilePhoto)
  const removeProfilePhoto = useMutation(api.users.removeProfilePhoto)
  const reorderProfilePhotos = useMutation(api.users.reorderProfilePhotos)

  const maxSize = isUltra ? ULTRA_LIMIT : FREE_LIMIT
  const maxSizeMB = isUltra ? 25 : 5

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    if (file.size > maxSize) {
      const errorMsg = isUltra
        ? `File too large. Max size is ${maxSizeMB}MB.`
        : `File too large. Max size is ${maxSizeMB}MB. Upgrade to Ultra for 25MB uploads!`
      setError(errorMsg)
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreview(previewUrl)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)

    try {
      const uploadUrl = await generateUploadUrl()

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      })

      if (!response.ok) throw new Error("Upload failed")

      const { storageId } = await response.json()

      await addProfilePhoto({
        userId,
        storageId,
      })

      if (preview) URL.revokeObjectURL(preview)
      setSelectedFile(null)
      setPreview(null)
      toast.success("Profile photo added")
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to upload photo"
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    if (preview) URL.revokeObjectURL(preview)
    setSelectedFile(null)
    setPreview(null)
    setError(null)
  }

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return

    setIsDeleting(true)
    try {
      await removeProfilePhoto({ userId, storageId: photoToDelete })
      toast.success("Photo deleted")
      setPhotoToDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete photo")
    } finally {
      setIsDeleting(false)
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  // Handle reordering photos
  const handleReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    if (!profilePhotos || fromIndex === toIndex) return

    const photoIds = profilePhotos.map(p => p.storageId)
    const [movedId] = photoIds.splice(fromIndex, 1)
    photoIds.splice(toIndex, 0, movedId)

    try {
      await reorderProfilePhotos({ userId, photoIds })
      toast.success("Photos reordered")
    } catch (err) {
      toast.error("Failed to reorder photos")
    }
  }, [profilePhotos, reorderProfilePhotos, userId])

  // Drag handlers for desktop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null) {
      handleReorder(draggedIndex, dragOverIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0]
    setTouchStartX(touch.clientX)
    setDraggedIndex(index)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null || touchStartX === null) return

    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartX)

    // Only reorder if significant horizontal movement
    if (deltaX > 30) {
      e.preventDefault()
      const element = document.elementFromPoint(touch.clientX, touch.clientY)
      const slot = element?.closest('[data-photo-index]')
      if (slot) {
        const newIndex = parseInt(slot.getAttribute('data-photo-index') || '-1')
        if (newIndex >= 0 && newIndex !== draggedIndex && profilePhotos?.[newIndex]) {
          setDragOverIndex(newIndex)
        }
      }
    }
  }

  const handleTouchEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null) {
      handleReorder(draggedIndex, dragOverIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
    setTouchStartX(null)
  }

  const photoCount = profilePhotos?.length ?? 0
  const canAddMore = photoCount < MAX_PHOTOS

  // Create 6 slots
  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => {
    const photo = profilePhotos?.[i]
    return { index: i, photo }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Profile Photos</h3>
          <p className="text-sm text-muted-foreground">
            {photoCount} / {MAX_PHOTOS} photos • First photo is your profile picture
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-3">
        {slots.map(({ index, photo }) => (
          <div
            key={index}
            data-photo-index={index}
            draggable={!!photo}
            onDragStart={photo ? (e) => handleDragStart(e, index) : undefined}
            onDragOver={photo ? (e) => handleDragOver(e, index) : undefined}
            onDragEnd={photo ? handleDragEnd : undefined}
            onTouchStart={photo ? (e) => handleTouchStart(e, index) : undefined}
            onTouchMove={photo ? handleTouchMove : undefined}
            onTouchEnd={photo ? handleTouchEnd : undefined}
            className={cn(
              "relative aspect-square rounded-xl overflow-hidden transition-all duration-200",
              photo ? "bg-muted cursor-grab active:cursor-grabbing" : "border-2 border-dashed border-border",
              draggedIndex === index && "opacity-50 scale-95",
              dragOverIndex === index && "ring-2 ring-primary ring-offset-2"
            )}
          >
            {photo ? (
              <>
                <img
                  src={photo.url ?? ""}
                  alt={`Profile photo ${index + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                />
                {/* Tap to view overlay - only on center area */}
                <button
                  className="absolute inset-4 z-10"
                  onClick={() => setViewingPhoto(photo.url)}
                  aria-label="View photo"
                />
                {/* Primary indicator */}
                {photo.isPrimary && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs flex items-center gap-1 pointer-events-none">
                    <Star className="w-3 h-3" />
                    Primary
                  </div>
                )}
                {/* Delete button - always visible on mobile */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 w-8 h-8 opacity-100 md:opacity-0 md:hover:opacity-100 transition-opacity z-20"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPhotoToDelete(photo.storageId)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                {/* Drag handle - always visible on mobile */}
                <div className="absolute bottom-2 left-2 bg-black/50 text-white p-1.5 rounded opacity-100 md:opacity-0 md:hover:opacity-100 transition-opacity pointer-events-none">
                  <GripVertical className="w-4 h-4" />
                </div>
              </>
            ) : (
              <button
                onClick={canAddMore ? openFilePicker : undefined}
                disabled={!canAddMore}
                className={cn(
                  "w-full h-full flex flex-col items-center justify-center gap-2",
                  "text-muted-foreground transition-colors",
                  canAddMore && "hover:text-foreground hover:border-foreground/50"
                )}
              >
                <ImagePlus className="w-8 h-8" />
                <span className="text-xs">Add Photo</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Reorder hint */}
      {photoCount > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Drag photos to reorder. First photo is your profile picture.
        </p>
      )}

      {/* Upload preview dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => handleCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Profile Photo</DialogTitle>
            <DialogDescription>
              This photo will be added to your profile. The first photo is used as your main profile picture.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-64 object-contain rounded-lg"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Add Photo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => setPhotoToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePhoto} disabled={isDeleting}>
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

      {/* Lightbox for viewing photos */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setViewingPhoto(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={viewingPhoto}
            alt="Profile photo"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
