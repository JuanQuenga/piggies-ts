import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Lock,
  Sparkles,
  User,
  Clock,
  MessageCircle,
  Check,
} from 'lucide-react'
import { formatDistanceToNow } from '@/lib/date-utils'

export const Route = createFileRoute('/_authenticated/waves')({
  component: WavesPage,
})

// Mock data for demonstration - in production this would come from Convex
const mockWavers = [
  {
    id: '1',
    name: 'Alex',
    age: 28,
    imageUrl: null,
    wavedAt: Date.now() - 1000 * 60 * 5, // 5 minutes ago
    isOnline: true,
  },
  {
    id: '2',
    name: 'Jordan',
    age: 25,
    imageUrl: null,
    wavedAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    isOnline: false,
  },
  {
    id: '3',
    name: 'Taylor',
    age: 32,
    imageUrl: null,
    wavedAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    isOnline: true,
  },
  {
    id: '4',
    name: 'Morgan',
    age: 27,
    imageUrl: null,
    wavedAt: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
    isOnline: false,
  },
  {
    id: '5',
    name: 'Casey',
    age: 30,
    imageUrl: null,
    wavedAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    isOnline: false,
  },
]

function WavesPage() {
  const navigate = useNavigate()
  useCurrentUser()
  const { isUltra, checkoutUrl } = useSubscription()

  const wavers = mockWavers // In production: useQuery(api.waves.getWaves, ...)

  // Wave animation state
  const [wavingUsers, setWavingUsers] = useState<Record<string, 'waving' | 'success'>>({})

  const handleWaveWithAnimation = (userId: string) => {
    // Set to waving state
    setWavingUsers(prev => ({ ...prev, [userId]: 'waving' }))

    // After animation, show success
    setTimeout(() => {
      setWavingUsers(prev => ({ ...prev, [userId]: 'success' }))
    }, 800)

    // Clear success state after a bit
    setTimeout(() => {
      setWavingUsers(prev => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    }, 2500)
  }

  const handleUpgrade = () => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl
    }
  }

  const handleMessage = () => {
    // In production, start a conversation and navigate
    navigate({ to: '/messages' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Page Title */}
        <h1 className="font-bold text-2xl flex items-center gap-2 mb-6">
          <img src="/waving.svg" alt="" className="w-6 h-6 invert" />
          Waves
        </h1>
        {/* Stats Card */}
        <section className="mb-6 p-5 bg-card rounded-2xl border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-black text-foreground">{wavers.length}</p>
              <p className="text-sm text-muted-foreground">People waved at you</p>
            </div>
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <img src="/waving.svg" alt="" className="w-7 h-7" style={{ filter: 'invert(36%) sepia(94%) saturate(4000%) hue-rotate(346deg) brightness(90%) contrast(95%)' }} />
            </div>
          </div>
        </section>

        {/* Premium Gate for non-Ultra users */}
        {!isUltra && (
          <section className="mb-6 p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg mb-1">Unlock Full Access</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade to Piggies Ultra to see everyone who waved at you and connect with them instantly.
                </p>
                <Button
                  onClick={handleUpgrade}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upgrade to Ultra
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Wavers List */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Recent Waves
          </h2>
          <div className="space-y-3">
            {wavers.map((waver, index) => {
              // For non-Ultra users, blur/hide wavers after the first 2
              const isLocked = !isUltra && index >= 2

              return (
                <div
                  key={waver.id}
                  className={`bg-card rounded-2xl border border-border overflow-hidden transition-all ${
                    isLocked ? 'relative' : ''
                  }`}
                >
                  <div className={`flex items-center gap-4 p-4 ${isLocked ? 'blur-sm' : ''}`}>
                    <div className="relative">
                      <Avatar size="lg" className="w-14 h-14 border-2 border-primary/20">
                        {waver.imageUrl ? (
                          <AvatarImage src={waver.imageUrl} alt={waver.name} />
                        ) : (
                          <AvatarFallback className="bg-primary/20 text-primary text-lg">
                            {waver.name.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {waver.isOnline && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">
                          {waver.name}, {waver.age}
                        </p>
                        {waver.isOnline && (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                            Online
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Waved {formatDistanceToNow(waver.wavedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        onClick={handleMessage}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        className={`rounded-full transition-all duration-300 ${
                          wavingUsers[waver.id] === 'waving' ? 'wave-button-waving bg-primary hover:bg-primary/90' : ''
                        } ${
                          wavingUsers[waver.id] === 'success' ? 'bg-green-500 hover:bg-green-500' : 'bg-primary hover:bg-primary/90'
                        }`}
                        onClick={() => {
                          if (!wavingUsers[waver.id]) {
                            handleWaveWithAnimation(waver.id)
                          }
                        }}
                        disabled={!!wavingUsers[waver.id]}
                      >
                        {wavingUsers[waver.id] === 'success' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <img src="/waving.svg" alt="" className="w-4 h-4 invert wave-icon" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Lock overlay for non-Ultra users */}
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-[2px]">
                      <div className="text-center">
                        <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Upgrade to see
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Empty State */}
        {wavers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <img src="/waving.svg" alt="" className="w-10 h-10 invert opacity-50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No waves yet</h3>
            <p className="text-muted-foreground max-w-xs">
              Complete your profile and add photos to get more visibility and attract waves from others.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate({ to: '/profile' })}
            >
              <User className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        )}

        {/* Ultra CTA at bottom for non-subscribers */}
        {!isUltra && wavers.length > 2 && (
          <div className="mt-8 p-6 bg-card rounded-2xl border border-border text-center">
            <Sparkles className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-2">See All Your Waves</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {wavers.length - 2} more people waved at you. Upgrade to Ultra to see them all.
            </p>
            <Button
              onClick={handleUpgrade}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
