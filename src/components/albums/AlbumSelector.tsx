import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Lock, Image, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AlbumSelectorProps {
  userId: Id<"users">
  isOpen: boolean
  onClose: () => void
  onSelect: (albumId: Id<"privateAlbums">) => void
  selectedAlbumId?: Id<"privateAlbums">
  sharedAlbumIds?: Id<"privateAlbums">[]
  title?: string
  description?: string
}

export function AlbumSelector({
  userId,
  isOpen,
  onClose,
  onSelect,
  selectedAlbumId,
  sharedAlbumIds = [],
  title = "Select Album",
  description = "Choose which album to share",
}: AlbumSelectorProps) {
  const albums = useQuery(api.albums.listMyAlbums, { userId })

  // Filter out albums that are already shared
  const availableAlbums = albums?.filter(
    (album) => !sharedAlbumIds.includes(album._id)
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {albums === undefined ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : availableAlbums?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No albums available</p>
            <p className="text-sm text-muted-foreground">
              {albums.length === 0
                ? "You don't have any albums yet"
                : "All your albums are already shared"}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2 p-1">
              {availableAlbums?.map((album) => (
                <button
                  key={album._id}
                  onClick={() => onSelect(album._id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-colors",
                    selectedAlbumId === album._id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/20 hover:bg-muted/50"
                  )}
                >
                  {/* Album thumbnail */}
                  <div className="w-14 h-14 rounded-lg bg-muted shrink-0 overflow-hidden">
                    {album.coverUrl ? (
                      <img
                        src={album.coverUrl}
                        alt={album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-6 h-6 text-muted-foreground" />
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

                  {/* Selected indicator */}
                  {selectedAlbumId === album._id && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
