import { useState } from "react"
import { useMutation } from "convex/react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, FolderPlus } from "lucide-react"
import { toast } from "sonner"

interface AlbumCreateDialogProps {
  userId: Id<"users">
  isOpen: boolean
  onClose: () => void
  onSuccess?: (albumId: Id<"privateAlbums">) => void
}

export function AlbumCreateDialog({
  userId,
  isOpen,
  onClose,
  onSuccess,
}: AlbumCreateDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const createAlbum = useMutation(api.albums.createAlbum)

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter an album name")
      return
    }

    setIsCreating(true)
    try {
      const albumId = await createAlbum({
        userId,
        name: name.trim(),
        description: description.trim() || undefined,
      })
      toast.success("Album created")
      setName("")
      setDescription("")
      onSuccess?.(albumId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create album")
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      setName("")
      setDescription("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            Create New Album
          </DialogTitle>
          <DialogDescription>
            Create a private album to organize your photos. You can share individual albums with others.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="album-name">Album Name</Label>
            <Input
              id="album-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Vacation Photos"
              maxLength={50}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground text-right">
              {name.length}/50
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="album-description">Description (optional)</Label>
            <Textarea
              id="album-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this album..."
              rows={3}
              disabled={isCreating}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Album"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
