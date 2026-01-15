import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { useNavigate } from "@tanstack/react-router"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ImageIcon,
  Share2,
  Loader2,
  Sparkles,
  FolderOpen,
  Lock,
  Image,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ProfileAlbumShareButtonProps {
  currentUserId: Id<"users">
  targetUserId: Id<"users">
  isUltra: boolean
}

export function ProfileAlbumShareButton({
  currentUserId,
  targetUserId,
  isUltra,
}: ProfileAlbumShareButtonProps) {
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)
  const [showAlbumPicker, setShowAlbumPicker] = useState(false)
  const [selectedAlbumId, setSelectedAlbumId] = useState<Id<"privateAlbums"> | null>(null)
  const [selectedAlbumName, setSelectedAlbumName] = useState<string>("")
  const [selectedDuration, setSelectedDuration] = useState<"indefinite" | "24h" | "7d">("indefinite")
  const [isLoading, setIsLoading] = useState(false)

  const albums = useQuery(api.albums.listMyAlbums, { userId: currentUserId })

  const startConversation = useMutation(api.messages.startConversation)
  const shareAlbum = useMutation(api.albums.shareAlbum)
  const sendMessage = useMutation(api.messages.sendMessage)

  const availableAlbums = albums ?? []

  const handleSelectAlbumToShare = (album: { _id: Id<"privateAlbums">; name: string }) => {
    setSelectedAlbumId(album._id)
    setSelectedAlbumName(album.name)
    setShowAlbumPicker(false)
    setShowConfirm(true)
  }

  const handleShare = async () => {
    if (!selectedAlbumId && !albums?.find(a => a.isDefault)) {
      toast.error("No album to share")
      return
    }

    setIsLoading(true)
    try {
      // Create or get conversation
      const result = await startConversation({
        currentUserId,
        otherUserId: targetUserId,
      })

      // Calculate expiration time
      const now = Date.now()
      let expiresAt: number | undefined
      if (selectedDuration === "24h") {
        expiresAt = now + 24 * 60 * 60 * 1000
      } else if (selectedDuration === "7d") {
        expiresAt = now + 7 * 24 * 60 * 60 * 1000
      }

      // Share the album
      await shareAlbum({
        albumId: selectedAlbumId ?? undefined,
        ownerUserId: currentUserId,
        grantedUserId: targetUserId,
        conversationId: result.conversationId,
        expiresIn: selectedDuration === "indefinite" ? undefined : selectedDuration,
      })

      // Get the actual album ID (use default if not specified)
      const actualAlbumId = selectedAlbumId ?? albums?.find(a => a.isDefault)?._id
      const albumName = selectedAlbumName || albums?.find(a => a.isDefault)?.name || "Private Album"

      // Send a message about sharing the album with album_share format
      const messageContent = JSON.stringify({
        albumId: actualAlbumId,
        albumName,
        expiresAt,
      })
      await sendMessage({
        senderId: currentUserId,
        receiverId: targetUserId,
        content: messageContent,
        format: "album_share",
      })

      toast.success(`${albumName} shared successfully`)
      setShowConfirm(false)
      setSelectedAlbumId(null)
      setSelectedAlbumName("")

      // Navigate to the conversation
      navigate({
        to: "/messages",
        search: { conversation: result.conversationId },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to share album")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFreeUserShare = () => {
    const defaultAlbum = albums?.find(a => a.isDefault)
    if (defaultAlbum) {
      setSelectedAlbumId(defaultAlbum._id)
      setSelectedAlbumName(defaultAlbum.name)
      setShowConfirm(true)
    } else {
      toast.error("No album to share. Create an album first.")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <ImageIcon className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {availableAlbums.length > 0 ? (
            isUltra ? (
              <DropdownMenuItem onClick={() => setShowAlbumPicker(true)}>
                <Share2 className="w-4 h-4 mr-2" />
                Share an Album
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleFreeUserShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share My Album
              </DropdownMenuItem>
            )
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No albums to share
            </div>
          )}

          {!isUltra && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Ultra: Multiple albums & time-limits</span>
                </p>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Album Picker Dialog (Ultra only) */}
      <Dialog open={showAlbumPicker} onOpenChange={setShowAlbumPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Select Album to Share
            </DialogTitle>
            <DialogDescription>
              Choose which album to share with this user
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2 p-1">
              {availableAlbums.map((album) => (
                <button
                  key={album._id}
                  onClick={() => handleSelectAlbumToShare(album)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-colors",
                    "border-border hover:border-foreground/20 hover:bg-muted/50"
                  )}
                >
                  {/* Album thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-muted shrink-0 overflow-hidden">
                    {album.coverUrl ? (
                      <img
                        src={album.coverUrl}
                        alt={album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Album info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{album.name}</span>
                      {album.isDefault && (
                        <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {album.photoCount} photo{album.photoCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlbumPicker(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share "{selectedAlbumName || "Private Album"}"</DialogTitle>
            <DialogDescription>
              This user will be able to view all photos in this album. A message will be sent to notify them.
            </DialogDescription>
          </DialogHeader>

          {isUltra && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Access Duration</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedDuration("indefinite")}
                  className={`p-3 rounded-lg border text-sm text-center transition-colors ${
                    selectedDuration === "indefinite"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  Indefinite
                </button>
                <button
                  onClick={() => setSelectedDuration("24h")}
                  className={`p-3 rounded-lg border text-sm text-center transition-colors ${
                    selectedDuration === "24h"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  24 Hours
                </button>
                <button
                  onClick={() => setSelectedDuration("7d")}
                  className={`p-3 rounded-lg border text-sm text-center transition-colors ${
                    selectedDuration === "7d"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  7 Days
                </button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirm(false)
                setSelectedAlbumId(null)
                setSelectedAlbumName("")
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Album
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
