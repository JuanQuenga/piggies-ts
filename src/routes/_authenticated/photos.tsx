import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Loader2,
  Lock,
  Unlock,
  Users,
  FolderOpen,
} from 'lucide-react'
import { PrivateAlbumManager } from '@/components/albums/PrivateAlbumManager'
import { AlbumList } from '@/components/albums/AlbumList'
import { UnlockedAlbumsTab } from '@/components/photos/UnlockedAlbumsTab'
import { AlbumAccessTab } from '@/components/photos/AlbumAccessTab'
import { cn } from '@/lib/utils'
import { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_authenticated/photos')({
  component: PhotosPage,
})

type PhotosTab = 'albums' | 'private' | 'unlocked' | 'access'

function PhotosPage() {
  const navigate = useNavigate()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const { isUltra, isLoading: isSubLoading } = useSubscription()
  const [activeTab, setActiveTab] = useState<PhotosTab | null>(null)
  const [selectedAlbumId, setSelectedAlbumId] = useState<Id<"privateAlbums"> | null>(null)
  const [defaultAlbumCreated, setDefaultAlbumCreated] = useState(false)

  // For free users, get or create their default album
  const defaultAlbum = useQuery(
    api.albums.getDefaultAlbum,
    user && !isUltra ? { userId: user._id } : "skip"
  )
  const createDefaultAlbum = useMutation(api.albums.getOrCreateDefaultAlbum)

  // Auto-create default album for free users if they don't have one
  useEffect(() => {
    if (user && !isUltra && !isSubLoading && defaultAlbum === null && !defaultAlbumCreated) {
      setDefaultAlbumCreated(true)
      createDefaultAlbum({ userId: user._id })
    }
  }, [user, isUltra, isSubLoading, defaultAlbum, defaultAlbumCreated, createDefaultAlbum])

  // Set default tab once subscription status is known
  useEffect(() => {
    if (!isSubLoading && activeTab === null) {
      setActiveTab(isUltra ? 'albums' : 'private')
    }
  }, [isSubLoading, isUltra, activeTab])

  // Tab configuration - different for Ultra vs free users
  const tabs: { id: PhotosTab; label: string; icon: typeof Lock }[] = isUltra
    ? [
        { id: 'albums', label: 'My Albums', icon: FolderOpen },
        { id: 'unlocked', label: 'Unlocked', icon: Unlock },
        { id: 'access', label: 'Access', icon: Users },
      ]
    : [
        { id: 'private', label: 'My Album', icon: Lock },
        { id: 'unlocked', label: 'Unlocked', icon: Unlock },
        { id: 'access', label: 'Access', icon: Users },
      ]

  // Wait for all necessary data to load
  const isLoading = isUserLoading || isSubLoading || activeTab === null ||
    (!isUltra && defaultAlbum === undefined)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your photos</p>
      </div>
    )
  }

  const handleSelectAlbum = (albumId: Id<"privateAlbums">) => {
    setSelectedAlbumId(albumId)
  }

  const handleBackToAlbums = () => {
    setSelectedAlbumId(null)
  }

  // Determine what to show in the main content area
  const renderContent = () => {
    // If Ultra user has selected an album, show album manager
    if (isUltra && activeTab === 'albums' && selectedAlbumId) {
      return (
        <PrivateAlbumManager
          userId={user._id}
          albumId={selectedAlbumId}
          isUltra={isUltra}
          onBack={handleBackToAlbums}
        />
      )
    }

    // Otherwise show tab content
    switch (activeTab) {
      case 'albums':
        return (
          <AlbumList
            userId={user._id}
            isUltra={isUltra}
            onSelectAlbum={handleSelectAlbum}
          />
        )
      case 'private':
        return (
          <PrivateAlbumManager
            userId={user._id}
            albumId={defaultAlbum?._id}
            isUltra={isUltra}
          />
        )
      case 'unlocked':
        return <UnlockedAlbumsTab userId={user._id} />
      case 'access':
        return <AlbumAccessTab userId={user._id} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/nearby' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg">Albums</h1>
          <div className="w-10" />
        </div>

        {/* Tab navigation - hide when viewing a specific album */}
        {!(isUltra && selectedAlbumId) && (
          <div className="flex border-b border-border overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setSelectedAlbumId(null) // Clear selection when changing tabs
                  }}
                  className={cn(
                    "flex-1 min-w-0 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors whitespace-nowrap px-4",
                    activeTab === tab.id
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-32">
        {renderContent()}
      </main>
    </div>
  )
}
