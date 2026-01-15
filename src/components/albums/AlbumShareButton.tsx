import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
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
  X,
  Loader2,
  Check,
  Sparkles,
  FolderOpen,
  Lock,
  Image,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AlbumShareButtonProps {
  userId: Id<"users">
  conversationId: Id<"conversations">
  isUltra: boolean
}

export function AlbumShareButton({
  userId,
  conversationId,
  isUltra,
}: AlbumShareButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const [showAlbumPicker, setShowAlbumPicker] = useState(false)
  const [selectedAlbumId, setSelectedAlbumId] = useState<Id<"privateAlbums"> | null>(null)
  const [selectedAlbumName, setSelectedAlbumName] = useState<string>("")
  const [albumToRevoke, setAlbumToRevoke] = useState<{
    id: Id<"privateAlbums"> | undefined
    name: string
  } | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<"indefinite" | "24h" | "7d">("indefinite")
  const [isLoading, setIsLoading] = useState(false)

  const sharingStatus = useQuery(api.albums.getAlbumSharingStatus, {
    userId,
    conversationId,
  })

  const albums = useQuery(api.albums.listMyAlbums, { userId })

  const shareAlbum = useMutation(api.albums.shareAlbum)
  const revokeAccess = useMutation(api.albums.revokeAlbumAccess)

  // Get already shared album IDs
  const sharedAlbumIds = sharingStatus?.mySharedAlbums
    ?.map((a) => a.albumId)
    .filter((id): id is Id<"privateAlbums"> => id !== undefined) ?? []

  // Available albums to share (not already shared)
  const availableAlbums = albums?.filter(
    (album) => !sharedAlbumIds.includes(album._id)
  ) ?? []

  const handleShare = async () => {
    if (!sharingStatus?.otherUserId) return

    setIsLoading(true)
    try {
      await shareAlbum({
        albumId: selectedAlbumId ?? undefined,
        ownerUserId: userId,
        grantedUserId: sharingStatus.otherUserId,
        conversationId,
        expiresIn: selectedDuration === "indefinite" ? undefined : selectedDuration,
      })
      toast.success(`${selectedAlbumName || "Album"} shared successfully`)
      setShowConfirm(false)
      setSelectedAlbumId(null)
      setSelectedAlbumName("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to share album")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!sharingStatus?.otherUserId || !albumToRevoke) return

    setIsLoading(true)
    try {
      await revokeAccess({
        ownerUserId: userId,
        grantedUserId: sharingStatus.otherUserId,
        albumId: albumToRevoke.id,
      })
      toast.success(`Access to ${albumToRevoke.name} revoked`)
      setShowRevokeConfirm(false)
      setAlbumToRevoke(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke access")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAlbumToShare = (album: { _id: Id<"privateAlbums">; name: string }) => {
    setSelectedAlbumId(album._id)
    setSelectedAlbumName(album.name)
    setShowAlbumPicker(false)
    setShowConfirm(true)
  }

  const formatExpiry = (expiresAt?: number) => {
    if (!expiresAt) return null
    const now = Date.now()
    const diff = expiresAt - now
    if (diff <= 0) return "Expired"
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d left`
    return `${hours}h left`
  }

  const hasSharedAlbums = (sharingStatus?.mySharedAlbums?.length ?? 0) > 0
  const sharedAlbumCount = sharingStatus?.mySharedAlbums?.length ?? 0

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
          >
            <ImageIcon className="w-5 h-5" />
            {hasSharedAlbums && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* Shared Albums Section */}
          {hasSharedAlbums && (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3 h-3" />
                  Shared ({sharedAlbumCount})
                </DropdownMenuLabel>
                {sharingStatus?.mySharedAlbums?.map((share) => (
                  <div
                    key={share.grantId}
                    className="px-2 py-1.5 text-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-3 h-3 text-green-500 shrink-0" />
                      <span className="truncate">{share.albumName}</span>
                      {share.expiresAt && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({formatExpiry(share.expiresAt)})
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setAlbumToRevoke({
                          id: share.albumId,
                          name: share.albumName,
                        })
                        setShowRevokeConfirm(true)
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Share New Album */}
          {availableAlbums.length > 0 ? (
            isUltra ? (
              <DropdownMenuItem onClick={() => setShowAlbumPicker(true)}>
                <Share2 className="w-4 h-4 mr-2" />
                Share an Album
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => {
                  // For free users, share default album directly
                  const defaultAlbum = albums?.find((a) => a.isDefault)
                  if (defaultAlbum) {
                    setSelectedAlbumId(defaultAlbum._id)
                    setSelectedAlbumName(defaultAlbum.name)
                    setShowConfirm(true)
                  }
                }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share My Album
              </DropdownMenuItem>
            )
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              {albums?.length === 0
                ? "No albums to share"
                : "All albums shared"}
            </div>
          )}

          {/* Ultra Upsell */}
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
              This user will be able to view all photos in this album.
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

      {/* Revoke Confirmation Dialog */}
      <Dialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Album Access</DialogTitle>
            <DialogDescription>
              This user will no longer be able to view "{albumToRevoke?.name}". You can share it again anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRevokeConfirm(false)
                setAlbumToRevoke(null)
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Access"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
