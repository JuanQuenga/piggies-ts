import { useRef, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { ImagePlus, X, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

const FREE_LIMIT = 5 * 1024 * 1024 // 5MB
const ULTRA_LIMIT = 25 * 1024 * 1024 // 25MB

interface AlbumPhotoUploadProps {
  userId: Id<"users">
  isUltra: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

export function AlbumPhotoUpload({
  userId,
  isUltra,
  onSuccess,
  onCancel,
}: AlbumPhotoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(api.messages.generateUploadUrl)
  const addPhotoToAlbum = useMutation(api.albums.addPhotoToAlbum)

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

      await addPhotoToAlbum({
        userId,
        storageId,
      })

      if (preview) URL.revokeObjectURL(preview)
      setSelectedFile(null)
      setPreview(null)
      toast.success("Photo added to album")
      onSuccess?.()
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
    onCancel?.()
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  if (!selectedFile) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4 border-2 border-dashed border-border rounded-xl">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <ImagePlus className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Add a photo to your private album
        </p>
        <Button onClick={openFilePicker}>Choose Photo</Button>
        {!isUltra && (
          <p className="text-xs text-muted-foreground">
            Max {maxSizeMB}MB • <span className="text-primary">Upgrade to Ultra for 25MB</span>
          </p>
        )}
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="relative p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="flex items-center justify-center max-h-64 overflow-hidden rounded-lg bg-muted">
          <img
            src={preview ?? ""}
            alt="Preview"
            className="max-h-64 object-contain"
          />
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <ImagePlus className="w-4 h-4" />
          <span className="truncate">{selectedFile.name}</span>
          <span>({(selectedFile.size / (1024 * 1024)).toFixed(1)}MB)</span>
        </div>

        {error && (
          <div className="mt-2 flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 p-3 border-t border-border bg-muted/50">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          className="flex-1"
          disabled={isUploading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleUpload}
          className="flex-1"
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            "Add to Album"
          )}
        </Button>
      </div>
    </div>
  )
}
