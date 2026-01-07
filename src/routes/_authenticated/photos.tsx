import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Loader2,
  User,
  Send,
  Lock,
  Users,
} from 'lucide-react'
import { ProfilePhotoGrid } from '@/components/profile/ProfilePhotoGrid'
import { PrivateAlbumManager } from '@/components/albums/PrivateAlbumManager'
import { SentPhotosTab } from '@/components/photos/SentPhotosTab'
import { AlbumAccessTab } from '@/components/photos/AlbumAccessTab'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/photos')({
  component: PhotosPage,
})

type PhotosTab = 'profile' | 'sent' | 'private' | 'access'

const tabs: { id: PhotosTab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'private', label: 'Private', icon: Lock },
  { id: 'access', label: 'Access', icon: Users },
]

function PhotosPage() {
  const navigate = useNavigate()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const { isUltra, isLoading: isSubLoading } = useSubscription()
  const [activeTab, setActiveTab] = useState<PhotosTab>('profile')

  if (isUserLoading || isSubLoading) {
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
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/home' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg">My Photos</h1>
          <div className="w-10" />
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-32">
        {activeTab === 'profile' && (
          <ProfilePhotoGrid userId={user._id} isUltra={isUltra} />
        )}
        {activeTab === 'sent' && (
          <SentPhotosTab userId={user._id} isUltra={isUltra} />
        )}
        {activeTab === 'private' && (
          <PrivateAlbumManager userId={user._id} isUltra={isUltra} />
        )}
        {activeTab === 'access' && (
          <AlbumAccessTab userId={user._id} />
        )}
      </main>
    </div>
  )
}
