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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  Loader2,
  ShieldOff,
  Clock,
  UserX,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "@/lib/date-utils"

interface AlbumAccessDialogProps {
  userId: Id<"users">
  albumId: Id<"privateAlbums">
  albumName: string
  isOpen: boolean
  onClose: () => void
}

export function AlbumAccessDialog({
  userId,
  albumId,
  albumName,
  isOpen,
  onClose,
}: AlbumAccessDialogProps) {
  const [shareToRevoke, setShareToRevoke] = useState<{
    userId: Id<"users">
    userName: string
  } | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  const albumShares = useQuery(
    api.albums.getAlbumShares,
    isOpen ? { userId, albumId } : "skip"
  )
  const revokeAccess = useMutation(api.albums.revokeAlbumAccess)

  const handleRevoke = async () => {
    if (!shareToRevoke) return

    setIsRevoking(true)
    try {
      await revokeAccess({
        ownerUserId: userId,
        grantedUserId: shareToRevoke.userId,
        albumId,
      })
      toast.success(`Access revoked for ${shareToRevoke.userName}`)
      setShareToRevoke(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke access")
    } finally {
      setIsRevoking(false)
    }
  }

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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Album Access
            </DialogTitle>
            <DialogDescription>
              People who can view "{albumName}"
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {albumShares === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : albumShares.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <UserX className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">No one has access</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share this album in a conversation to grant access
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {albumShares.map((share) => {
                  const expiration = formatExpiration(share.expiresAt)
                  return (
                    <div
                      key={share._id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={share.grantedUser.imageUrl} />
                        <AvatarFallback>
                          {share.grantedUser.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {share.grantedUser.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDistanceToNow(share.grantedAt)} ago</span>
                          {expiration && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-amber-500">
                                <Clock className="w-3 h-3" />
                                {expiration}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          setShareToRevoke({
                            userId: share.grantedUser._id,
                            userName: share.grantedUser.name,
                          })
                        }
                      >
                        <ShieldOff className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <Dialog open={!!shareToRevoke} onOpenChange={() => setShareToRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke {shareToRevoke?.userName}'s access to
              "{albumName}"? They will no longer be able to view this album.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShareToRevoke(null)}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? (
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
