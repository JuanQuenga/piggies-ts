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
  Send,
  Trash2,
  Loader2,
  X,
  Play,
  Image as ImageIcon,
} from "lucide-react"
import { toast } from "sonner"
import { ConversationPickerDialog } from "./ConversationPickerDialog"

interface SentPhotosTabProps {
  userId: Id<"users">
  isUltra: boolean
}

export function SentPhotosTab({ userId }: SentPhotosTabProps) {
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; format: "image" | "video" } | null>(null)
  const [mediaToDelete, setMediaToDelete] = useState<Id<"messages"> | null>(null)
  const [mediaToResend, setMediaToResend] = useState<{ storageId: Id<"_storage">; format: "image" | "video" } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const sentMedia = useQuery(api.messages.getUserSentMedia, { userId, limit: 50 })
  const deleteMedia = useMutation(api.messages.deleteUserSentMedia)

  const handleDeleteMedia = async () => {
    if (!mediaToDelete) return

    setIsDeleting(true)
    try {
      await deleteMedia({ userId, messageId: mediaToDelete })
      toast.success("Media deleted")
      setMediaToDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete media")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleResendSuccess = () => {
    setMediaToResend(null)
    toast.success("Media sent!")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Send className="w-5 h-5" />
          Sent Media
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Photos and videos you've sent in messages
        </p>
      </div>

      {/* Media grid */}
      {sentMedia === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : sentMedia.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 border-2 border-dashed border-border rounded-xl">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">No sent media yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Photos and videos you send in messages will appear here
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sentMedia.map((media) => (
            <div
              key={media._id}
              className="group relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer"
              onClick={() => setSelectedMedia({ url: media.url!, format: media.format })}
            >
              {media.format === "video" ? (
                <>
                  <video
                    src={media.url ?? ""}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-1" />
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={media.url ?? ""}
                  alt="Sent media"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="w-8 h-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMediaToResend({ storageId: media.storageId, format: media.format })
                  }}
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="w-8 h-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMediaToDelete(media._id)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox for viewing media */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setSelectedMedia(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          {selectedMedia.format === "video" ? (
            <video
              src={selectedMedia.url}
              className="max-w-full max-h-full object-contain"
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={selectedMedia.url}
              alt="Sent media"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!mediaToDelete} onOpenChange={() => setMediaToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this media? This will remove it from the conversation as well.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMediaToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMedia}
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

      {/* Conversation picker for resending */}
      <ConversationPickerDialog
        open={!!mediaToResend}
        onOpenChange={(open) => !open && setMediaToResend(null)}
        userId={userId}
        storageId={mediaToResend?.storageId ?? null}
        mediaFormat={mediaToResend?.format ?? "image"}
        onSuccess={handleResendSuccess}
      />
    </div>
  )
}
