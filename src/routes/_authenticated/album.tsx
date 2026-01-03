import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { PrivateAlbumManager } from '@/components/albums/PrivateAlbumManager'

export const Route = createFileRoute('/_authenticated/album')({
  component: AlbumPage,
})

function AlbumPage() {
  const navigate = useNavigate()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const { isUltra, isLoading: isSubLoading } = useSubscription()

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
        <p className="text-muted-foreground">Please sign in to view your album</p>
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
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/settings' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg">Private Album</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-32">
        <PrivateAlbumManager userId={user._id} isUltra={isUltra} />
      </main>
    </div>
  )
}
