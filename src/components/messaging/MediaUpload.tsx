import { useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { ImagePlus, X, Loader2, FileVideo, AlertCircle, Clock, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

// File size limits in bytes
const FREE_LIMIT = 5 * 1024 * 1024 // 5MB
const ULTRA_LIMIT = 25 * 1024 * 1024 // 25MB

interface MediaUploadProps {
  conversationId: Id<"conversations">
  senderId: Id<"users">
  isUltra: boolean
  onSuccess?: () => void
  onError?: (error: string) => void
  triggerId?: string
  hideTrigger?: boolean
}

type MediaType = "image" | "video"

interface SelectedMedia {
  file: File
  preview: string
  type: MediaType
}

type MediaTab = "upload" | "previous"

export function MediaUpload({
  conversationId,
  senderId,
  isUltra,
  onSuccess,
  onError,
  triggerId,
  hideTrigger = false,
}: MediaUploadProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<MediaTab>("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(api.messages.generateUploadUrl)
  const sendMessage = useMutation(api.messages.sendMessageToConversation)

  // Get previously sent media
  const previousMedia = useQuery(api.messages.getUserSentMedia, { userId: senderId })

  const maxSize = isUltra ? ULTRA_LIMIT : FREE_LIMIT
  const maxSizeMB = isUltra ? 25 : 5

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)

    // Check file size
    if (file.size > maxSize) {
      const errorMsg = isUltra
        ? `File too large. Max size is ${maxSizeMB}MB.`
        : `File too large. Max size is ${maxSizeMB}MB. Upgrade to Ultra for 25MB uploads!`
      setUploadError(errorMsg)
      toast.error(errorMsg)
      onError?.(errorMsg)
      return
    }

    // Determine media type
    const type: MediaType = file.type.startsWith("video/") ? "video" : "image"

    // Create preview
    const preview = URL.createObjectURL(file)
    setSelectedMedia({ file, preview, type })
    setShowPicker(true)
  }

  const handleUpload = async () => {
    if (!selectedMedia) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl()

      // Upload file to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedMedia.file.type },
        body: selectedMedia.file,
      })

      if (!response.ok) throw new Error("Upload failed")

      const { storageId } = await response.json()

      // Send message with media
      await sendMessage({
        conversationId,
        senderId,
        content: selectedMedia.type === "image" ? "📷 Photo" : "🎥 Video",
        format: selectedMedia.type,
        storageId,
      })

      // Cleanup
      URL.revokeObjectURL(selectedMedia.preview)
      setSelectedMedia(null)
      setShowPicker(false)
      toast.success("Media sent successfully")
      onSuccess?.()
    } catch {
      const errorMsg = "Failed to upload media. Please try again."
      setUploadError(errorMsg)
      toast.error(errorMsg)
      onError?.(errorMsg)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    if (selectedMedia) {
      URL.revokeObjectURL(selectedMedia.preview)
    }
    setSelectedMedia(null)
    setShowPicker(false)
    setUploadError(null)
    setActiveTab("upload")
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleOpenMediaPicker = () => {
    setShowPicker(true)
    setActiveTab("upload")
  }

  const handleSendPreviousMedia = async (storageId: Id<"_storage">, format: "image" | "video") => {
    setIsUploading(true)
    setUploadError(null)

    try {
      await sendMessage({
        conversationId,
        senderId,
        content: format === "image" ? "📷 Photo" : "🎥 Video",
        format,
        storageId,
      })

      setShowPicker(false)
      setActiveTab("upload")
      toast.success("Media sent successfully")
      onSuccess?.()
    } catch {
      const errorMsg = "Failed to send media. Please try again."
      setUploadError(errorMsg)
      toast.error(errorMsg)
      onError?.(errorMsg)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Trigger button */}
      {!hideTrigger && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleOpenMediaPicker}
          className="shrink-0 text-muted-foreground hover:text-primary"
          disabled={isUploading}
          id={triggerId}
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ImagePlus className="w-5 h-5" />
          )}
        </Button>
      )}
      {/* Hidden button for programmatic triggering when hideTrigger is true */}
      {hideTrigger && (
        <button
          type="button"
          onClick={handleOpenMediaPicker}
          id={triggerId}
          className="hidden"
          aria-hidden="true"
        />
      )}

      {/* Media picker modal */}
      {showPicker && !selectedMedia && (
        <div className="fixed bottom-32 left-4 right-4 lg:absolute lg:bottom-full lg:left-0 lg:right-0 lg:mb-2 lg:mx-4 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                activeTab === "upload"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="w-4 h-4" />
              New Upload
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("previous")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                activeTab === "previous"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="w-4 h-4" />
              Recent
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === "upload" ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <ImagePlus className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Upload a photo or video
                </p>
                <Button onClick={openFilePicker}>
                  Choose File
                </Button>
                {!isUltra && (
                  <p className="text-xs text-muted-foreground">
                    Max {maxSizeMB}MB • <span className="text-primary">Upgrade to Ultra for 25MB</span>
                  </p>
                )}
              </div>
            ) : (
              <div>
                {previousMedia === undefined ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : previousMedia.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Clock className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No recent media</p>
                  </div>
                ) : (
                  <ScrollArea className="h-32">
                    <div className="grid grid-cols-4 gap-1.5">
                      {previousMedia.map((media) => (
                        <button
                          key={media._id}
                          type="button"
                          onClick={() => handleSendPreviousMedia(media.storageId, media.format)}
                          disabled={isUploading}
                          className="relative aspect-square rounded-md overflow-hidden bg-muted hover:opacity-80 transition-opacity disabled:opacity-50 w-16 h-16"
                        >
                          {media.format === "image" ? (
                            <img
                              src={media.url ?? ""}
                              alt="Previous media"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <FileVideo className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          {media.format === "video" && (
                            <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[8px] px-0.5 rounded">
                              <FileVideo className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>

          {/* Close button */}
          <div className="px-4 pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-full"
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>

          {/* Error */}
          {uploadError && (
            <div className="px-4 pb-2 flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* Preview modal for new uploads */}
      {showPicker && selectedMedia && (
        <div className="fixed bottom-32 left-4 right-4 lg:absolute lg:bottom-full lg:left-0 lg:right-0 lg:mb-2 lg:mx-4 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
          {/* Preview */}
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
              {selectedMedia.type === "image" ? (
                <img
                  src={selectedMedia.preview}
                  alt="Preview"
                  className="max-h-64 object-contain"
                />
              ) : (
                <video
                  src={selectedMedia.preview}
                  controls
                  className="max-h-64 object-contain"
                />
              )}
            </div>

            {/* File info */}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              {selectedMedia.type === "video" ? (
                <FileVideo className="w-4 h-4" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              <span className="truncate">{selectedMedia.file.name}</span>
              <span>({(selectedMedia.file.size / (1024 * 1024)).toFixed(1)}MB)</span>
            </div>

            {/* Error */}
            {uploadError && (
              <div className="mt-2 flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Actions */}
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
                  Sending...
                </>
              ) : (
                "Send"
              )}
            </Button>
          </div>

          {/* Size limit note */}
          {!isUltra && (
            <div className="px-3 pb-2 text-center">
              <span className="text-xs text-muted-foreground">
                Max {maxSizeMB}MB •{" "}
                <span className="text-primary">Upgrade to Ultra for 25MB</span>
              </span>
            </div>
          )}
        </div>
      )}
    </>
  )
}



