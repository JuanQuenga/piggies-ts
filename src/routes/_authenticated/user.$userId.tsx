import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Id } from '../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  MessageCircle,
  Star,
  ChevronLeft,
  ChevronRight,
  Ban,
  Flag,
  MoreVertical,
  Check,
  MapPin,
  Clock,
  Home,
  Car,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProfileAlbumShareButton } from '@/components/albums/ProfileAlbumShareButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/user/$userId')({
  component: UserProfilePage,
})

function UserProfilePage() {
  const { userId } = Route.useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useCurrentUser()
  const { isUltra } = useSubscription()
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')

  // Wave animation state
  const [waveState, setWaveState] = useState<'idle' | 'waving' | 'success'>(
    'idle'
  )

  // Fetch user data
  const user = useQuery(api.users.getUser, { userId: userId as Id<'users'> })
  const profile = useQuery(api.users.getProfile, {
    userId: userId as Id<'users'>,
  })
  const profilePhotos = useQuery(api.users.getProfilePhotos, {
    userId: userId as Id<'users'>,
  })

  // Fetch user's Looking Now post
  const lookingNowPost = useQuery(api.lookingNow.getMyActivePost, {
    userId: userId as Id<'users'>,
  })

  // Check if favorited
  const isFavorited = useQuery(
    api.users.isUserFavorited,
    currentUser?._id
      ? { userId: currentUser._id, favoriteId: userId as Id<'users'> }
      : 'skip'
  )

  // Mutations
  const addFavorite = useMutation(api.users.addFavorite)
  const removeFavorite = useMutation(api.users.removeFavorite)
  const blockUser = useMutation(api.users.blockUser)
  const reportUser = useMutation(api.users.reportUser)
  const startConversation = useMutation(api.messages.startConversation)

  // Record profile view
  const recordView = useMutation(api.users.recordProfileView)
  useQuery(
    api.users.getUser,
    currentUser?._id && userId ? { userId: userId as Id<'users'> } : 'skip',
    {
      // Use this as a trigger to record the view
    }
  )
  // Record view on mount
  useState(() => {
    if (currentUser?._id && userId) {
      recordView({
        viewerId: currentUser._id,
        viewedId: userId as Id<'users'>,
      })
    }
  })

  const photos =
    (profilePhotos?.map((p) => p.url).filter(Boolean) as Array<string>) ?? []
  const hasMultiplePhotos = photos.length > 1
  const currentPhoto = photos[currentPhotoIndex]

  const handlePrevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
  }

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
  }

  // Touch swipe handling for mobile
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const minSwipeDistance = 50

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return

    const distance = touchStartX.current - touchEndX.current
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && hasMultiplePhotos) {
      handleNextPhoto()
    } else if (isRightSwipe && hasMultiplePhotos) {
      handlePrevPhoto()
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  const handleToggleFavorite = async () => {
    if (!currentUser?._id) return
    try {
      if (isFavorited) {
        await removeFavorite({
          userId: currentUser._id,
          favoriteId: userId as Id<'users'>,
        })
        toast.success('Removed from favorites')
      } else {
        await addFavorite({
          userId: currentUser._id,
          favoriteId: userId as Id<'users'>,
        })
        toast.success('Added to favorites')
      }
    } catch {
      toast.error('Failed to update favorites')
    }
  }

  const handleWave = () => {
    if (waveState !== 'idle') return

    // Start wave animation
    setWaveState('waving')

    // After animation, show success
    setTimeout(() => {
      setWaveState('success')
    }, 800)

    // Reset after showing success
    setTimeout(() => {
      setWaveState('idle')
    }, 2500)
  }

  const handleMessage = async () => {
    if (!currentUser?._id) return
    try {
      const result = await startConversation({
        currentUserId: currentUser._id,
        otherUserId: userId as Id<'users'>,
      })
      navigate({
        to: '/messages',
        search: { conversation: result.conversationId },
      })
    } catch {
      toast.error('Failed to start conversation')
    }
  }

  const handleBlockUser = async () => {
    if (!currentUser?._id) return
    try {
      await blockUser({
        blockerId: currentUser._id,
        blockedId: userId as Id<'users'>,
      })
      setShowBlockDialog(false)
      toast.success('User blocked successfully')
      navigate({ to: '/members' })
    } catch {
      toast.error('Failed to block user')
    }
  }

  const handleReportUser = async () => {
    if (!currentUser?._id || !reportReason) return
    try {
      await reportUser({
        reporterId: currentUser._id,
        reportedId: userId as Id<'users'>,
        reason: reportReason,
        details: reportDetails || undefined,
      })
      setShowReportDialog(false)
      setReportReason('')
      setReportDetails('')
      toast.success('Report submitted successfully')
    } catch {
      toast.error('Failed to submit report')
    }
  }

  // Helper to format time remaining
  const formatTimeRemaining = (expiresAt: number) => {
    const now = Date.now()
    const remaining = expiresAt - now
    if (remaining <= 0) return 'Expired'

    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    }
    return `${minutes}m left`
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const displayName = profile.displayName || user.name

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/members' })}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex items-center gap-1">
            {/* Favorite Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              className={isFavorited ? 'text-amber-500' : ''}
            >
              {isFavorited ? (
                <Star className="w-5 h-5 fill-current" />
              ) : (
                <Star className="w-5 h-5" />
              )}
            </Button>

            {/* Album Share */}
            {currentUser?._id && (
              <ProfileAlbumShareButton
                currentUserId={currentUser._id}
                targetUserId={userId as Id<'users'>}
                isUltra={isUltra}
              />
            )}

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setShowReportDialog(true)}
                  className="text-amber-600 focus:text-amber-600"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Report user
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowBlockDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Block user
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content - Desktop: side by side, Mobile: stacked */}
      <div className="max-w-6xl mx-auto p-4 pb-40 sm:pb-24">
        <div className="flex flex-col lg:flex-row lg:gap-8">
          {/* Photo Section - Left side on desktop */}
          <div className="lg:w-1/2 lg:sticky lg:top-28 lg:self-start">
            {/* Main Photo */}
            <div
              className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-card touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 flex items-center justify-center">
                  <img
                    src="/pig-snout.svg"
                    alt=""
                    className="w-32 h-32 opacity-60"
                  />
                </div>
              )}

              {/* Photo navigation arrows (for mobile/touch) */}
              {hasMultiplePhotos && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full lg:hidden"
                    onClick={handlePrevPhoto}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full lg:hidden"
                    onClick={handleNextPhoto}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                </>
              )}

              {/* Online indicator */}
              {user.isOnline && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-white text-sm font-medium">Online</span>
                </div>
              )}

              {/* Photo Thumbnails - floating on top of photo */}
              {photos.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-2">
                  {photos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`relative flex-shrink-0 w-12 h-12 rounded-full overflow-hidden transition-all ${
                        index === currentPhotoIndex
                          ? 'ring-2 ring-white scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Profile Info - Right side on desktop */}
          <div className="lg:w-1/2 mt-4 lg:mt-0 space-y-4">
          {/* Name and Age */}
          <div>
            <h1 className="text-2xl font-bold">
              {displayName}
              {profile.age && (
                <span className="text-muted-foreground font-normal">
                  , {profile.age}
                </span>
              )}
            </h1>
          </div>

          {/* Looking Now Banner */}
          {lookingNowPost && (
            <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-primary text-sm">Looking Now</span>
                    <Badge variant="outline" className="text-xs py-0 px-1.5">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimeRemaining(lookingNowPost.expiresAt)}
                    </Badge>
                  </div>
                  <p className="text-foreground">{lookingNowPost.message}</p>
                  {(lookingNowPost.locationName || lookingNowPost.canHost !== undefined) && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {lookingNowPost.locationName && (
                        <Badge variant="secondary" className="text-xs">
                          <MapPin className="w-3 h-3 mr-1" />
                          {lookingNowPost.locationName}
                        </Badge>
                      )}
                      {lookingNowPost.canHost === true && (
                        <Badge variant="secondary" className="text-xs">
                          <Home className="w-3 h-3 mr-1" />
                          Can Host
                        </Badge>
                      )}
                      {lookingNowPost.canHost === false && (
                        <Badge variant="secondary" className="text-xs">
                          <Car className="w-3 h-3 mr-1" />
                          Can Travel
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Looking For */}
          {profile.lookingFor && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-lg">
                {profile.lookingFor === 'chat' && '💬'}
                {profile.lookingFor === 'dates' && '❤️'}
                {profile.lookingFor === 'network' && '🤝'}
                {profile.lookingFor === 'open' && '✨'}
              </span>
              <span>
                {profile.lookingFor === 'chat' && 'Looking for Chat & Friends'}
                {profile.lookingFor === 'dates' && 'Looking for Dates'}
                {profile.lookingFor === 'network' && 'Looking to Network'}
                {profile.lookingFor === 'open' && 'Open to Anything'}
              </span>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-foreground whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions - positioned above mobile nav on small screens */}
      <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4">
        <div className="max-w-6xl mx-auto flex gap-3 lg:w-1/2 lg:ml-auto lg:pr-4">
          <Button
            variant="outline"
            size="lg"
            className={`flex-1 transition-all duration-300 ${
              waveState === 'waving' ? 'wave-button-waving' : ''
            } ${
              waveState === 'success'
                ? 'bg-green-500 border-green-500 text-white hover:bg-green-500 hover:border-green-500'
                : ''
            }`}
            onClick={handleWave}
            disabled={waveState !== 'idle'}
          >
            {waveState === 'success' ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Waved!
              </>
            ) : (
              <>
                <img
                  src="/waving.svg"
                  alt=""
                  className={`w-5 h-5 mr-2 invert ${waveState === 'waving' ? 'wave-icon' : ''}`}
                />
                Wave
              </>
            )}
          </Button>
          <Button size="lg" className="flex-1" onClick={handleMessage}>
            <MessageCircle className="w-5 h-5 mr-2" />
            Message
          </Button>
        </div>
      </div>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block {displayName}?</DialogTitle>
            <DialogDescription>
              They won't be able to message you or see your profile. You can
              unblock them later from your settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBlockDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBlockUser}>
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {displayName}</DialogTitle>
            <DialogDescription>
              Help us understand what happened. Your report will be reviewed by
              our team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a reason...</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="inappropriate_content">
                  Inappropriate Content
                </option>
                <option value="fake_profile">Fake Profile</option>
                <option value="scam">Scam</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Additional details (optional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Tell us more about what happened..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleReportUser} disabled={!reportReason}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
