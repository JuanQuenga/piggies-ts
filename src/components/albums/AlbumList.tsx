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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Lock,
  Image,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  FolderOpen,
} from "lucide-react"
import { toast } from "sonner"
import { AlbumCreateDialog } from "./AlbumCreateDialog"
import { cn } from "@/lib/utils"

interface AlbumListProps {
  userId: Id<"users">
  isUltra: boolean
  onSelectAlbum: (albumId: Id<"privateAlbums">) => void
}

export function AlbumList({ userId, isUltra, onSelectAlbum }: AlbumListProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [albumToDelete, setAlbumToDelete] = useState<{
    id: Id<"privateAlbums">
    name: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const albums = useQuery(api.albums.listMyAlbums, { userId })
  const albumStatus = useQuery(api.albums.getAlbumStatus, { userId })
  const deleteAlbum = useMutation(api.albums.deleteAlbum)

  const handleDeleteAlbum = async () => {
    if (!albumToDelete) return

    setIsDeleting(true)
    try {
      await deleteAlbum({ userId, albumId: albumToDelete.id })
      toast.success("Album deleted")
      setAlbumToDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete album")
    } finally {
      setIsDeleting(false)
    }
  }

  const canCreateAlbums = albumStatus?.canCreateAlbums ?? false
  const albumCount = albumStatus?.albumCount ?? 0
  const albumLimit = albumStatus?.albumLimit ?? 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            My Albums
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {albumCount} / {albumLimit === 20 ? "20" : albumLimit} album{albumCount !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreateAlbums && albumCount < albumLimit && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Album
          </Button>
        )}
      </div>

      {/* Ultra upsell for non-Ultra users */}
      {!isUltra && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Want Multiple Albums?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upgrade to Ultra to create up to 20 private albums and organize your photos!
              </p>
              <Button size="sm" className="mt-3">
                Upgrade to Ultra
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Album Dialog */}
      <AlbumCreateDialog
        userId={userId}
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={(albumId) => {
          setShowCreateDialog(false)
          onSelectAlbum(albumId)
        }}
      />

      {/* Album Grid */}
      {albums === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 border-2 border-dashed border-border rounded-xl">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">No albums yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isUltra
                ? "Create your first private album"
                : "Your private album will appear here"}
            </p>
          </div>
          {isUltra && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Album
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {albums.map((album) => (
            <div
              key={album._id}
              className="group relative bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-foreground/20 transition-colors"
              onClick={() => onSelectAlbum(album._id)}
            >
              {/* Album Cover */}
              <div className="aspect-square bg-muted relative">
                {album.coverUrl ? (
                  <img
                    src={album.coverUrl}
                    alt={album.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}

                {/* Default badge */}
                {album.isDefault && (
                  <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Default
                  </div>
                )}

                {/* Menu for non-default albums */}
                {!album.isDefault && isUltra && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 w-8 h-8 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectAlbum(album._id)
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit Album
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAlbumToDelete({ id: album._id, name: album.name })
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Album
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Album Info */}
              <div className="p-3">
                <h3 className="font-medium truncate">{album.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {album.photoCount} photo{album.photoCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ))}

          {/* Create Album Card (for Ultra users) */}
          {canCreateAlbums && albumCount < albumLimit && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className={cn(
                "aspect-square rounded-xl border-2 border-dashed border-border",
                "flex flex-col items-center justify-center gap-2",
                "text-muted-foreground hover:text-foreground hover:border-foreground/50",
                "transition-colors"
              )}
            >
              <Plus className="w-8 h-8" />
              <span className="text-sm">New Album</span>
            </button>
          )}
        </div>
      )}

      {/* Delete Album Confirmation */}
      <Dialog open={!!albumToDelete} onOpenChange={() => setAlbumToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Album</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{albumToDelete?.name}"? All photos in this album will be permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAlbumToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAlbum}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Album"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
