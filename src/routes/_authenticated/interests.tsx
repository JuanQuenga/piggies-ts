import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { toast } from 'sonner'
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
  Eye,
} from 'lucide-react'
import { formatDistanceToNow } from '@/lib/date-utils'

export const Route = createFileRoute('/_authenticated/interests')({
  component: InterestsPage,
})

type TabType = 'waves' | 'viewers'

function InterestsPage() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const { isUltra, checkoutUrl } = useSubscription()
  const [activeTab, setActiveTab] = useState<TabType>('waves')

  // Fetch admirers data
  const stats = useQuery(
    api.admirers.getAdmirersStats,
    user?._id ? { userId: user._id } : 'skip'
  )

  const wavesData = useQuery(
    api.admirers.getMyWaves,
    user?._id ? { userId: user._id } : 'skip'
  )

  const viewersData = useQuery(
    api.admirers.getMyProfileViewers,
    user?._id ? { userId: user._id } : 'skip'
  )

  const sendWave = useMutation(api.admirers.sendWave)
  const markInterestsVisited = useMutation(api.admirers.markInterestsVisited)

  // Mark interests as visited when page loads (clears badge)
  useEffect(() => {
    if (user?._id) {
      markInterestsVisited({ userId: user._id })
    }
  }, [user?._id, markInterestsVisited])

  // Wave animation state
  const [wavingUsers, setWavingUsers] = useState<Record<string, 'waving' | 'success'>>({})

  const handleWaveWithAnimation = async (targetUserId: string) => {
    if (!user?._id) return

    // Set to waving state
    setWavingUsers(prev => ({ ...prev, [targetUserId]: 'waving' }))

    try {
      const result = await sendWave({ waverId: user._id, wavedAtId: targetUserId as any })

      // Check if rate limited
      if (result.rateLimited) {
        setWavingUsers(prev => {
          const next = { ...prev }
          delete next[targetUserId]
          return next
        })
        toast.error('Daily wave limit reached', {
          description: isUltra
            ? 'Something went wrong'
            : 'Upgrade to Ultra for unlimited waves!',
        })
        return
      }

      // After animation, show success
      setTimeout(() => {
        setWavingUsers(prev => ({ ...prev, [targetUserId]: 'success' }))
      }, 800)

      // Show waves remaining toast for free users (if not already waved)
      if (!result.alreadyWaved && result.wavesRemaining !== undefined && result.wavesRemaining <= 5) {
        toast.info(`${result.wavesRemaining} waves remaining today`)
      }

      // Clear success state after a bit
      setTimeout(() => {
        setWavingUsers(prev => {
          const next = { ...prev }
          delete next[targetUserId]
          return next
        })
      }, 2500)
    } catch (error) {
      // Clear on error
      setWavingUsers(prev => {
        const next = { ...prev }
        delete next[targetUserId]
        return next
      })
      toast.error('Failed to send wave')
    }
  }

  const handleUpgrade = () => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl
    }
  }

  const handleViewProfile = (targetUserId: string) => {
    navigate({ to: '/user/$userId', params: { userId: targetUserId } })
  }

  const handleMessage = () => {
    navigate({ to: '/messages' })
  }

  const waves = wavesData?.waves ?? []
  const viewers = viewersData?.viewers ?? []
  const totalWaves = stats?.totalWaves ?? 0
  const totalViewers = stats?.totalViewers ?? 0

  return (
    <div className="min-h-screen bg-background">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-2xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 lg:px-8 py-6 pb-32">
        {/* Stats Cards - clickable tabs on mobile, static stats on desktop */}
        <section className="mb-6 grid grid-cols-2 gap-4">
          <div
            className={`p-4 bg-card rounded-2xl border transition-all lg:cursor-default cursor-pointer ${
              activeTab === 'waves'
                ? 'border-primary ring-2 ring-primary/20 lg:border-border lg:ring-0'
                : 'border-border hover:border-primary/50 lg:hover:border-border'
            }`}
            onClick={() => setActiveTab('waves')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-foreground">{totalWaves}</p>
                <p className="text-xs text-muted-foreground">Waves</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <img
                  src="/waving.svg"
                  alt=""
                  className="w-5 h-5"
                  style={{
                    filter:
                      'invert(36%) sepia(94%) saturate(4000%) hue-rotate(346deg) brightness(90%) contrast(95%)',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            className={`p-4 bg-card rounded-2xl border transition-all lg:cursor-default cursor-pointer ${
              activeTab === 'viewers'
                ? 'border-primary ring-2 ring-primary/20 lg:border-border lg:ring-0'
                : 'border-border hover:border-primary/50 lg:hover:border-border'
            }`}
            onClick={() => setActiveTab('viewers')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-foreground">{totalViewers}</p>
                <p className="text-xs text-muted-foreground">Profile Views</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-primary" />
              </div>
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
                <h2 className="font-bold text-lg mb-1">See Your Full History</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade to Piggies Ultra to see everyone who viewed your profile and waved at you. Go back further in your history and never miss a connection.
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

        {/* Mobile: Tab Content */}
        <div className="lg:hidden">
          {activeTab === 'waves' && (
            <WavesTab
              waves={waves}
              totalCount={totalWaves}
              hasMore={wavesData?.hasMore ?? false}
              isUltra={isUltra ?? false}
              wavingUsers={wavingUsers}
              onWave={handleWaveWithAnimation}
              onMessage={handleMessage}
              onViewProfile={handleViewProfile}
              onUpgrade={handleUpgrade}
            />
          )}

          {activeTab === 'viewers' && (
            <ViewersTab
              viewers={viewers}
              totalCount={totalViewers}
              hasMore={viewersData?.hasMore ?? false}
              isUltra={isUltra ?? false}
              wavingUsers={wavingUsers}
              onWave={handleWaveWithAnimation}
              onMessage={handleMessage}
              onViewProfile={handleViewProfile}
              onUpgrade={handleUpgrade}
            />
          )}
        </div>

        {/* Desktop: Side by side layout */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
          <div className="bg-card/50 rounded-2xl border border-border p-5">
            <WavesTab
              waves={waves}
              totalCount={totalWaves}
              hasMore={wavesData?.hasMore ?? false}
              isUltra={isUltra ?? false}
              wavingUsers={wavingUsers}
              onWave={handleWaveWithAnimation}
              onMessage={handleMessage}
              onViewProfile={handleViewProfile}
              onUpgrade={handleUpgrade}
            />
          </div>
          <div className="bg-card/50 rounded-2xl border border-border p-5">
            <ViewersTab
              viewers={viewers}
              totalCount={totalViewers}
              hasMore={viewersData?.hasMore ?? false}
              isUltra={isUltra ?? false}
              wavingUsers={wavingUsers}
              onWave={handleWaveWithAnimation}
              onMessage={handleMessage}
              onViewProfile={handleViewProfile}
              onUpgrade={handleUpgrade}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

// Waves Tab Component
function WavesTab({
  waves,
  totalCount,
  hasMore,
  isUltra,
  wavingUsers,
  onWave,
  onMessage,
  onViewProfile,
  onUpgrade,
}: {
  waves: Array<{
    _id: string
    waver: {
      _id: string
      name: string
      imageUrl?: string
      isOnline?: boolean
      profile: {
        displayName?: string
        age?: number
        profilePhotoUrl?: string
      } | null
    }
    wavedAt: number
  }>
  totalCount: number
  hasMore: boolean
  isUltra: boolean
  wavingUsers: Record<string, 'waving' | 'success'>
  onWave: (userId: string) => void
  onMessage: () => void
  onViewProfile: (userId: string) => void
  onUpgrade: () => void
}) {
  const freeLimit = 3

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
        People Who Waved at You
      </h2>

      {waves.length === 0 ? (
        <EmptyState
          icon={
            <img
              src="/waving.svg"
              alt=""
              className="w-10 h-10 invert opacity-50"
            />
          }
          title="No waves yet"
          description="Complete your profile and add photos to get more visibility and attract waves from others."
        />
      ) : (
        <div className="space-y-3">
          {waves.map((wave, index) => {
            const isLocked = !isUltra && index >= freeLimit
            const waver = wave.waver
            const displayName = waver.profile?.displayName || waver.name
            const age = waver.profile?.age
            const photoUrl = waver.profile?.profilePhotoUrl || waver.imageUrl

            return (
              <AdmirerCard
                key={wave._id}
                displayName={displayName}
                age={age}
                photoUrl={photoUrl}
                isOnline={waver.isOnline}
                timestamp={wave.wavedAt}
                timestampLabel="Waved"
                isLocked={isLocked}
                wavingState={wavingUsers[waver._id]}
                onWave={() => onWave(waver._id)}
                onMessage={onMessage}
                onViewProfile={() => onViewProfile(waver._id)}
              />
            )
          })}
        </div>
      )}

      {/* Show upgrade CTA if there are more waves */}
      {hasMore && !isUltra && (
        <UpgradeCTA
          message={`${totalCount - freeLimit} more people waved at you. Upgrade to Ultra to see them all.`}
          onUpgrade={onUpgrade}
        />
      )}
    </section>
  )
}

// Viewers Tab Component
function ViewersTab({
  viewers,
  totalCount,
  hasMore,
  isUltra,
  wavingUsers,
  onWave,
  onMessage,
  onViewProfile,
  onUpgrade,
}: {
  viewers: Array<{
    viewerId: string
    viewer: {
      _id: string
      name: string
      imageUrl?: string
      isOnline?: boolean
      profile: {
        displayName?: string
        age?: number
        profilePhotoUrl?: string
      } | null
    }
    lastViewedAt: number
  }>
  totalCount: number
  hasMore: boolean
  isUltra: boolean
  wavingUsers: Record<string, 'waving' | 'success'>
  onWave: (userId: string) => void
  onMessage: () => void
  onViewProfile: (userId: string) => void
  onUpgrade: () => void
}) {
  const freeLimit = 3

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
        People Who Viewed Your Profile
      </h2>

      {viewers.length === 0 ? (
        <EmptyState
          icon={<Eye className="w-10 h-10 text-muted-foreground/50" />}
          title="No profile views yet"
          description="Complete your profile and add photos to get more visibility. The more active you are, the more people will discover you."
        />
      ) : (
        <div className="space-y-3">
          {viewers.map((view, index) => {
            const isLocked = !isUltra && index >= freeLimit
            const viewer = view.viewer
            const displayName = viewer.profile?.displayName || viewer.name
            const age = viewer.profile?.age
            const photoUrl = viewer.profile?.profilePhotoUrl || viewer.imageUrl

            return (
              <AdmirerCard
                key={view.viewerId}
                displayName={displayName}
                age={age}
                photoUrl={photoUrl}
                isOnline={viewer.isOnline}
                timestamp={view.lastViewedAt}
                timestampLabel="Viewed"
                isLocked={isLocked}
                wavingState={wavingUsers[viewer._id]}
                onWave={() => onWave(viewer._id)}
                onMessage={onMessage}
                onViewProfile={() => onViewProfile(viewer._id)}
              />
            )
          })}
        </div>
      )}

      {/* Show upgrade CTA if there are more viewers */}
      {hasMore && !isUltra && (
        <UpgradeCTA
          message={`${totalCount - freeLimit} more people viewed your profile. Upgrade to Ultra to see them all.`}
          onUpgrade={onUpgrade}
        />
      )}
    </section>
  )
}

// Admirer Card Component
function AdmirerCard({
  displayName,
  age,
  photoUrl,
  isOnline,
  timestamp,
  timestampLabel,
  isLocked,
  wavingState,
  onWave,
  onMessage,
  onViewProfile,
}: {
  displayName: string
  age?: number
  photoUrl?: string
  isOnline?: boolean
  timestamp: number
  timestampLabel: string
  isLocked: boolean
  wavingState?: 'waving' | 'success'
  onWave: () => void
  onMessage: () => void
  onViewProfile: () => void
}) {
  return (
    <div
      className={`bg-card rounded-2xl border border-border overflow-hidden transition-all ${
        isLocked ? 'relative' : ''
      }`}
    >
      <div
        className={`flex items-center gap-4 p-4 ${isLocked ? 'blur-sm' : ''}`}
        onClick={() => !isLocked && onViewProfile()}
        role={isLocked ? undefined : 'button'}
      >
        <div className="relative">
          <Avatar className="w-14 h-14 border-2 border-primary/20">
            {photoUrl ? (
              <AvatarImage src={photoUrl} alt={displayName} />
            ) : (
              <AvatarFallback className="bg-primary/20 text-primary text-lg">
                {displayName.charAt(0)}
              </AvatarFallback>
            )}
          </Avatar>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-lg">
              {displayName}
              {age && `, ${age}`}
            </p>
            {isOnline && (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                Online
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timestampLabel} {formatDistanceToNow(timestamp)}
          </p>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={onMessage}
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            className={`rounded-full transition-all duration-300 ${
              wavingState === 'waving' ? 'wave-button-waving bg-primary hover:bg-primary/90' : ''
            } ${
              wavingState === 'success'
                ? 'bg-green-500 hover:bg-green-500'
                : 'bg-primary hover:bg-primary/90'
            }`}
            onClick={() => {
              if (!wavingState) {
                onWave()
              }
            }}
            disabled={!!wavingState}
          >
            {wavingState === 'success' ? (
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
            <p className="text-sm font-medium text-muted-foreground">Upgrade to see</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Empty State Component
function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center py-12 lg:py-8 text-center">
      <div className="w-16 h-16 lg:w-14 lg:h-14 bg-muted rounded-full flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => navigate({ to: '/profile' })}
      >
        <User className="w-4 h-4 mr-2" />
        Edit Profile
      </Button>
    </div>
  )
}

// Upgrade CTA Component
function UpgradeCTA({
  message,
  onUpgrade,
}: {
  message: string
  onUpgrade: () => void
}) {
  return (
    <div className="mt-8 p-6 bg-card rounded-2xl border border-border text-center">
      <Sparkles className="w-10 h-10 text-amber-500 mx-auto mb-3" />
      <h3 className="font-bold text-lg mb-2">See All Who Are Interested</h3>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button
        onClick={onUpgrade}
        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Upgrade Now
      </Button>
    </div>
  )
}
