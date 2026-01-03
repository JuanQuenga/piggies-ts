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
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ImageIcon,
  Share2,
  X,
  Clock,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

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
  const [selectedDuration, setSelectedDuration] = useState<"indefinite" | "24h" | "7d">("indefinite")
  const [isLoading, setIsLoading] = useState(false)

  const sharingStatus = useQuery(api.albums.getAlbumSharingStatus, {
    userId,
    conversationId,
  })

  const shareAlbum = useMutation(api.albums.shareAlbum)
  const revokeAccess = useMutation(api.albums.revokeAlbumAccess)

  const handleShare = async () => {
    if (!sharingStatus?.otherUserId) return

    setIsLoading(true)
    try {
      await shareAlbum({
        ownerUserId: userId,
        grantedUserId: sharingStatus.otherUserId,
        conversationId,
        expiresIn: selectedDuration === "indefinite" ? undefined : selectedDuration,
      })
      toast.success("Album shared successfully")
      setShowConfirm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to share album")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!sharingStatus?.otherUserId) return

    setIsLoading(true)
    try {
      await revokeAccess({
        ownerUserId: userId,
        grantedUserId: sharingStatus.otherUserId,
      })
      toast.success("Album access revoked")
      setShowRevokeConfirm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke access")
    } finally {
      setIsLoading(false)
    }
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

  const iShared = sharingStatus?.iShared ?? false
  const expiryText = formatExpiry(sharingStatus?.myShareExpiresAt)

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
            {iShared && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {iShared ? (
            <>
              <div className="px-2 py-1.5 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="w-4 h-4" />
                  <span>Album Shared</span>
                </div>
                {expiryText && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {expiryText}
                  </p>
                )}
              </div>
              <DropdownMenuSeparator />
              {isUltra && (
                <DropdownMenuItem onClick={() => setShowConfirm(true)}>
                  <Clock className="w-4 h-4 mr-2" />
                  Update Access Duration
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setShowRevokeConfirm(true)}
                className="text-destructive focus:text-destructive"
              >
                <X className="w-4 h-4 mr-2" />
                Revoke Access
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => setShowConfirm(true)}>
                <Share2 className="w-4 h-4 mr-2" />
                Share My Album
              </DropdownMenuItem>
              {!isUltra && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Ultra: Time-limited sharing</span>
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Private Album</DialogTitle>
            <DialogDescription>
              This user will be able to view all photos in your private album.
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
              onClick={() => setShowConfirm(false)}
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
              This user will no longer be able to view your private album. You can share it again anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevokeConfirm(false)}
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
