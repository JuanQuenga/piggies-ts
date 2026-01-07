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

interface AlbumAccessTabProps {
  userId: Id<"users">
}

export function AlbumAccessTab({ userId }: AlbumAccessTabProps) {
  const [userToRevoke, setUserToRevoke] = useState<{ id: Id<"users">; name: string } | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  const albumShares = useQuery(api.albums.getMyAlbumShares, { userId })
  const revokeAccess = useMutation(api.albums.revokeAlbumAccess)

  const handleRevoke = async () => {
    if (!userToRevoke) return

    setIsRevoking(true)
    try {
      await revokeAccess({ ownerUserId: userId, grantedUserId: userToRevoke.id })
      toast.success(`Access revoked for ${userToRevoke.name}`)
      setUserToRevoke(null)
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
    // Calculate time remaining
    const diff = expiresAt - now
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `Expires in ${days}d`
    if (hours > 0) return `Expires in ${hours}h`
    return "Expires soon"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Album Access
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          People who can view your private album
        </p>
      </div>

      {/* Access list */}
      {albumShares === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : albumShares.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 border-2 border-dashed border-border rounded-xl">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <UserX className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">No one has access</p>
            <p className="text-sm text-muted-foreground mt-1">
              Share your album in a conversation to grant access
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {albumShares.map((share) => {
            const expiration = formatExpiration(share.expiresAt)
            return (
              <div
                key={share._id}
                className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={share.grantedUser.imageUrl} />
                  <AvatarFallback>
                    {share.grantedUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{share.grantedUser.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Shared {formatDistanceToNow(share.grantedAt)} ago</span>
                    {expiration && (
                      <>
                        <span>-</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {expiration}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setUserToRevoke({ id: share.grantedUser._id, name: share.grantedUser.name })}
                >
                  <ShieldOff className="w-4 h-4 mr-1" />
                  Revoke
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Revoke confirmation dialog */}
      <Dialog open={!!userToRevoke} onOpenChange={() => setUserToRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke {userToRevoke?.name}'s access to your private album? They will no longer be able to view your photos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUserToRevoke(null)}
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
    </div>
  )
}
