import { useState } from "react"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlbumViewer } from "./AlbumViewer"
import { ImageIcon, Clock, FolderOpen } from "lucide-react"

interface SharedAlbum {
  grantId: Id<"albumAccessGrants">
  albumId?: Id<"privateAlbums">
  albumName: string
  expiresAt?: number
  grantedAt: number
}

interface AlbumViewButtonProps {
  viewerUserId: Id<"users">
  ownerUserId: Id<"users">
  ownerName: string
  sharedAlbums: SharedAlbum[]
}

export function AlbumViewButton({
  viewerUserId,
  ownerUserId,
  ownerName,
  sharedAlbums,
}: AlbumViewButtonProps) {
  const [showAlbumViewer, setShowAlbumViewer] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState<SharedAlbum | null>(null)

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

  const handleSelectAlbum = (album: SharedAlbum) => {
    setSelectedAlbum(album)
    setShowAlbumViewer(true)
  }

  const handleDirectOpen = () => {
    if (sharedAlbums.length === 1) {
      setSelectedAlbum(sharedAlbums[0])
      setShowAlbumViewer(true)
    }
  }

  // If only one album, show direct button
  if (sharedAlbums.length === 1) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDirectOpen}
          className="relative"
          title={`View ${sharedAlbums[0].albumName}`}
        >
          <ImageIcon className="w-5 h-5 text-primary" />
        </Button>

        <AlbumViewer
          viewerUserId={viewerUserId}
          ownerUserId={ownerUserId}
          albumId={selectedAlbum?.albumId}
          albumName={selectedAlbum?.albumName}
          ownerName={ownerName}
          isOpen={showAlbumViewer}
          onClose={() => {
            setShowAlbumViewer(false)
            setSelectedAlbum(null)
          }}
          expiresAt={selectedAlbum?.expiresAt}
        />
      </>
    )
  }

  // Multiple albums - show dropdown picker
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            title="View shared albums"
          >
            <ImageIcon className="w-5 h-5 text-primary" />
            {sharedAlbums.length > 1 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-medium rounded-full flex items-center justify-center px-1">
                {sharedAlbums.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <FolderOpen className="w-3 h-3" />
              Shared Albums ({sharedAlbums.length})
            </DropdownMenuLabel>
            {sharedAlbums.map((album) => (
              <DropdownMenuItem
                key={album.grantId}
                onClick={() => handleSelectAlbum(album)}
                className="flex items-center justify-between"
              >
                <span className="truncate">{album.albumName}</span>
                {album.expiresAt && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 ml-2">
                    <Clock className="w-3 h-3" />
                    {formatExpiry(album.expiresAt)}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlbumViewer
        viewerUserId={viewerUserId}
        ownerUserId={ownerUserId}
        albumId={selectedAlbum?.albumId}
        albumName={selectedAlbum?.albumName}
        ownerName={ownerName}
        isOpen={showAlbumViewer}
        onClose={() => {
          setShowAlbumViewer(false)
          setSelectedAlbum(null)
        }}
        expiresAt={selectedAlbum?.expiresAt}
      />
    </>
  )
}
