import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Id } from '../../../convex/_generated/dataModel'
import { formatDistanceToNow } from '@/lib/date-utils'
import { INTEREST_CATEGORIES, type InterestCategory } from '@/lib/interests'
import { toast } from 'sonner'
import {
  LayoutList,
  Grid3X3,
  MapPin,
  MessageCircle,
  Filter,
  User,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
  Tags,
  Share2,
  UserPlus,
  Image,
  Heart,
  Zap,
  Shield,
  Star,
  Navigation,
  Loader2,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_authenticated/home')({
  component: HomePage,
})

type NearbyUser = {
  _id: Id<'users'>
  name: string
  imageUrl?: string
  isOnline?: boolean
  lastActive?: number
  isSelf?: boolean
  profile: {
    displayName?: string
    bio?: string
    age?: number
    profilePhotoUrls?: string[]
    lookingFor?: string
    interests?: string[]
    onboardingComplete?: boolean
  } | null
}

// Profile limits based on subscription
const FREE_PROFILE_LIMIT = 1
const ULTRA_PROFILE_LIMIT = 100

function HomePage() {
  const { user: convexUser } = useCurrentUser()
  const { checkoutUrl, isUltra } = useSubscription()
  const navigate = useNavigate()
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'grid' | 'detailed'>('grid')
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [withPhotos, setWithPhotos] = useState(false)
  const [ageFilter, setAgeFilter] = useState<{
    min?: number
    max?: number
  } | null>(null)
  const [interestFilter, setInterestFilter] = useState<string[]>([])
  const [interestDialogOpen, setInterestDialogOpen] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<
    Set<InterestCategory>
  >(new Set(['hobbies']))

  // Wave animation state: 'waving' -> 'success' -> cleared
  const [wavingUsers, setWavingUsers] = useState<
    Record<string, 'waving' | 'success'>
  >({})

  const handleWaveWithAnimation = (userId: string) => {
    // Set to waving state
    setWavingUsers((prev) => ({ ...prev, [userId]: 'waving' }))

    // After animation, show success
    setTimeout(() => {
      setWavingUsers((prev) => ({ ...prev, [userId]: 'success' }))
    }, 800)

    // Clear success state after a bit
    setTimeout(() => {
      setWavingUsers((prev) => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    }, 2500)
  }

  // Location state
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [locationType, setLocationType] = useState<'nearby' | 'custom'>(
    'nearby',
  )
  const [customLocation, setCustomLocation] = useState('')
  const [customLocationInput, setCustomLocationInput] = useState('')
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [nearbyLocationName, setNearbyLocationName] = useState<string | null>(
    null,
  )

  const getLocationDisplayText = () => {
    if (locationType === 'nearby') {
      return nearbyLocationName || 'Nearby'
    }
    return customLocation || 'Set Location'
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        // Try to get city name from coordinates using reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
          )
          const data = await response.json()
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            'Nearby'
          setNearbyLocationName(city)
        } catch {
          setNearbyLocationName('Nearby')
        }
        setLocationType('nearby')
        setIsGettingLocation(false)
        setLocationDialogOpen(false)
        toast.success('Location updated!')
      },
      (error) => {
        setIsGettingLocation(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error(
              'Location access denied. Please enable location permissions.',
            )
            break
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable.')
            break
          case error.TIMEOUT:
            toast.error('Location request timed out.')
            break
          default:
            toast.error('Unable to get your location.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  const handleSetCustomLocation = () => {
    if (!customLocationInput.trim()) {
      toast.error('Please enter a city or zip code')
      return
    }
    setCustomLocation(customLocationInput.trim())
    setLocationType('custom')
    setLocationDialogOpen(false)
    toast.success('Location updated!')
  }

  // Get nearby users from Convex (including self)
  // Ultra members see more profiles
  const profileLimit = isUltra ? ULTRA_PROFILE_LIMIT : FREE_PROFILE_LIMIT
  const nearbyUsers = useQuery(
    api.users.getNearbyUsers,
    convexUser?._id
      ? {
          currentUserId: convexUser._id,
          limit: profileLimit,
          onlineOnly,
          withPhotos,
          minAge: ageFilter?.min,
          maxAge: ageFilter?.max,
          interests: interestFilter.length > 0 ? interestFilter : undefined,
          includeSelf: true,
        }
      : 'skip',
  )

  // Get users who have sent unread messages to current user
  const usersWithUnreadMessages = useQuery(
    api.messages.getUsersWithUnreadMessages,
    convexUser?._id ? { userId: convexUser._id } : 'skip',
  )

  // Helper to check if a user has sent unread messages
  const hasUnreadFrom = (userId: Id<'users'>) => {
    return usersWithUnreadMessages?.includes(userId) ?? false
  }

  const toggleCategory = (category: InterestCategory) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const toggleInterestFilter = (interest: string) => {
    setInterestFilter((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    )
  }

  const clearInterestFilter = () => {
    setInterestFilter([])
  }

  // Start conversation mutation
  const startConversation = useMutation(api.messages.startConversation)

  const handleGoToMessages = () => {
    navigate({ to: '/messages' })
  }

  const handleMessageUser = async (userId: Id<'users'>) => {
    if (!convexUser?._id) return
    try {
      const result = await startConversation({
        currentUserId: convexUser._id,
        otherUserId: userId,
      })
      navigate({
        to: '/messages',
        search: { conversation: result.conversationId },
      })
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
  }

  const getLastSeenText = (lastActive?: number, isOnline?: boolean) => {
    if (isOnline) return 'Now'
    if (!lastActive) return 'Unknown'
    return formatDistanceToNow(lastActive)
  }

  const getProfileImage = (user: NearbyUser) => {
    // Use profile photo if available, otherwise fall back to user image
    return user.profile?.profilePhotoUrls?.[0] || user.imageUrl
  }

  const getDisplayName = (user: NearbyUser) => {
    return user.profile?.displayName || user.name
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Filter Bar */}
      <div className="sticky top-14 z-40 bg-background border-b border-border px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {/* Location Selector */}
        <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
          <DialogTrigger className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium truncate max-w-[100px]">
              {getLocationDisplayText()}
            </span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Set Your Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Use My Location Option */}
              <button
                onClick={handleUseMyLocation}
                disabled={isGettingLocation}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  locationType === 'nearby' && nearbyLocationName
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                } ${isGettingLocation ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  {isGettingLocation ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Navigation className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">
                    Use My Location
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isGettingLocation
                      ? 'Getting location...'
                      : nearbyLocationName
                        ? `Currently: ${nearbyLocationName}`
                        : 'Find people near you'}
                  </p>
                </div>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* City/Zip Input */}
              <div className="space-y-3">
                <p className="font-semibold text-foreground">
                  Enter City or Zip Code
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Miami or 33101"
                    value={customLocationInput}
                    onChange={(e) => setCustomLocationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSetCustomLocation()
                      }
                    }}
                    className="flex-1"
                  />
                  <Button onClick={handleSetCustomLocation} size="sm">
                    Set
                  </Button>
                </div>
                {locationType === 'custom' && customLocation && (
                  <p className="text-sm text-muted-foreground">
                    Currently set to:{' '}
                    <span className="text-primary font-medium">
                      {customLocation}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="w-px h-6 bg-border shrink-0" />
        <Button
          variant={
            onlineOnly || withPhotos || ageFilter || interestFilter.length > 0
              ? 'default'
              : 'outline'
          }
          size="sm"
          className={`shrink-0 gap-2 ${onlineOnly || withPhotos || ageFilter || interestFilter.length > 0 ? '' : 'border-border'}`}
          onClick={() => {
            setOnlineOnly(false)
            setWithPhotos(false)
            setAgeFilter(null)
            setInterestFilter([])
          }}
        >
          <Filter className="w-4 h-4" />
          {onlineOnly || withPhotos || ageFilter || interestFilter.length > 0
            ? 'Clear'
            : 'Filters'}
        </Button>
        <Button
          variant={onlineOnly ? 'default' : 'outline'}
          size="sm"
          className={`shrink-0 ${onlineOnly ? '' : 'border-border'}`}
          onClick={() => setOnlineOnly(!onlineOnly)}
        >
          Online Now
        </Button>
        <Button
          variant={withPhotos ? 'default' : 'outline'}
          size="sm"
          className={`shrink-0 ${withPhotos ? '' : 'border-border'}`}
          onClick={() => setWithPhotos(!withPhotos)}
        >
          With Photos
        </Button>

        {/* Interest Filter Button */}
        <Dialog open={interestDialogOpen} onOpenChange={setInterestDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant={interestFilter.length > 0 ? 'default' : 'outline'}
              size="sm"
              className={`shrink-0 gap-1.5 ${interestFilter.length > 0 ? '' : 'border-border'}`}
            >
              <Tags className="w-4 h-4" />
              Interests
              {interestFilter.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                  {interestFilter.length}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Filter by Interests</span>
                {interestFilter.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearInterestFilter}
                    className="text-muted-foreground"
                  >
                    Clear all
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {(
                Object.entries(INTEREST_CATEGORIES) as [
                  InterestCategory,
                  (typeof INTEREST_CATEGORIES)[InterestCategory],
                ][]
              ).map(([categoryKey, category]) => {
                const isExpanded = expandedCategories.has(categoryKey)
                const selectedInCategory = category.interests.filter((i) =>
                  interestFilter.includes(i),
                )

                return (
                  <div
                    key={categoryKey}
                    className="bg-card rounded-xl border border-border overflow-hidden"
                  >
                    <button
                      onClick={() => toggleCategory(categoryKey)}
                      className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.emoji}</span>
                        <span className="font-semibold">{category.label}</span>
                        {selectedInCategory.length > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                            {selectedInCategory.length}
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 flex flex-wrap gap-2">
                        {category.interests.map((interest) => (
                          <button
                            key={interest}
                            onClick={() => toggleInterestFilter(interest)}
                            className={`px-3 py-1.5 rounded-full border-2 transition-all duration-200 font-medium text-sm ${
                              interestFilter.includes(interest)
                                ? 'border-primary bg-primary text-white shadow-lg shadow-primary/30'
                                : 'border-border bg-background hover:border-primary/50'
                            }`}
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="pt-4 border-t border-border">
              <Button
                className="w-full"
                onClick={() => setInterestDialogOpen(false)}
              >
                Apply Filter ({interestFilter.length} selected)
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant={
            ageFilter?.min === 18 && ageFilter?.max === 25
              ? 'default'
              : 'outline'
          }
          size="sm"
          className={`shrink-0 ${ageFilter?.min === 18 && ageFilter?.max === 25 ? '' : 'border-border'}`}
          onClick={() =>
            setAgeFilter(
              ageFilter?.min === 18 && ageFilter?.max === 25
                ? null
                : { min: 18, max: 25 },
            )
          }
        >
          Age 18-25
        </Button>
        <Button
          variant={
            ageFilter?.min === 25 && ageFilter?.max === 35
              ? 'default'
              : 'outline'
          }
          size="sm"
          className={`shrink-0 ${ageFilter?.min === 25 && ageFilter?.max === 35 ? '' : 'border-border'}`}
          onClick={() =>
            setAgeFilter(
              ageFilter?.min === 25 && ageFilter?.max === 35
                ? null
                : { min: 25, max: 35 },
            )
          }
        >
          Age 25-35
        </Button>
        <Button
          variant={
            ageFilter?.min === 35 && ageFilter?.max === 50
              ? 'default'
              : 'outline'
          }
          size="sm"
          className={`shrink-0 ${ageFilter?.min === 35 && ageFilter?.max === 50 ? '' : 'border-border'}`}
          onClick={() =>
            setAgeFilter(
              ageFilter?.min === 35 && ageFilter?.max === 50
                ? null
                : { min: 35, max: 50 },
            )
          }
        >
          Age 35-50
        </Button>
        <div className="ml-auto shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() =>
              setViewMode(viewMode === 'grid' ? 'detailed' : 'grid')
            }
            title={
              viewMode === 'grid'
                ? 'Switch to detailed view'
                : 'Switch to grid view'
            }
          >
            {viewMode === 'grid' ? (
              <LayoutList className="w-4 h-4" />
            ) : (
              <Grid3X3 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <main className="flex-1 p-2 sm:p-3">
        {nearbyUsers === undefined ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : nearbyUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <Users className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No users found
            </h3>
            <p className="text-muted-foreground">
              {onlineOnly ||
              withPhotos ||
              ageFilter ||
              interestFilter.length > 0
                ? 'No one matches your filters. Try adjusting them.'
                : 'Be the first to complete your profile and start connecting!'}
            </p>
            {(onlineOnly ||
              withPhotos ||
              ageFilter ||
              interestFilter.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setOnlineOnly(false)
                  setWithPhotos(false)
                  setAgeFilter(null)
                  setInterestFilter([])
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid gap-1.5 sm:gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                {nearbyUsers.map((nearbyUser) => (
                  <div
                    key={nearbyUser._id}
                    onClick={() => {
                      if (nearbyUser.isSelf) {
                        navigate({ to: '/profile' })
                      } else {
                        setCurrentPhotoIndex(0)
                        setSelectedUser(nearbyUser)
                      }
                    }}
                    className={`profile-card aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group relative bg-card ${
                      !nearbyUser.isSelf && hasUnreadFrom(nearbyUser._id)
                        ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-background'
                        : ''
                    }`}
                  >
                    {getProfileImage(nearbyUser) ? (
                      <img
                        src={getProfileImage(nearbyUser)}
                        alt={getDisplayName(nearbyUser)}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 flex items-center justify-center">
                        <img
                          src="/pig-snout.svg"
                          alt=""
                          className="w-16 h-16 opacity-60"
                        />
                      </div>
                    )}

                    {/* "You" badge for self */}
                    {nearbyUser.isSelf && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-white text-xs font-bold rounded-full">
                        You
                      </div>
                    )}

                    {/* Online indicator */}
                    {nearbyUser.isOnline && !nearbyUser.isSelf && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-online rounded-full border-2 border-black/50 online-indicator" />
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    {/* User info */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-white text-sm truncate">
                          {getDisplayName(nearbyUser)}
                          {nearbyUser.profile?.age &&
                            `, ${nearbyUser.profile.age}`}
                        </p>
                      </div>
                      {nearbyUser.profile?.lookingFor && (
                        <p className="text-xs text-white/70 truncate">
                          {nearbyUser.profile.lookingFor}
                        </p>
                      )}
                    </div>

                    {/* Hover overlay with view profile - only for other users */}
                    {!nearbyUser.isSelf && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentPhotoIndex(0)
                            setSelectedUser(nearbyUser)
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Profile
                        </Button>
                      </div>
                    )}

                    {/* Hover overlay for self - edit profile prompt */}
                    {nearbyUser.isSelf && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate({ to: '/profile' })
                          }}
                        >
                          Edit Profile
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Upsell for free users when at profile limit */}
                {!isUltra && nearbyUsers.length >= FREE_PROFILE_LIMIT && (
                  <div
                    className="profile-card aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group relative bg-gradient-to-br from-amber-500/20 via-primary/20 to-primary/30 flex flex-col items-center justify-center p-4 text-center border-2 border-dashed border-primary/50 hover:border-primary transition-colors"
                    onClick={() =>
                      checkoutUrl && (window.location.href = checkoutUrl)
                    }
                  >
                    <Shield className="w-10 h-10 text-amber-500 mb-2" />
                    <p className="text-sm font-bold text-foreground">
                      See More Profiles
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upgrade to Ultra for {ULTRA_PROFILE_LIMIT}+ profiles
                    </p>
                    <Button
                      size="sm"
                      className="mt-3 bg-amber-500 hover:bg-amber-600 text-black font-bold"
                    >
                      Get Ultra
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Detailed View */
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {nearbyUsers.map((nearbyUser) => (
                  <div
                    key={nearbyUser._id}
                    onClick={() => {
                      if (nearbyUser.isSelf) {
                        navigate({ to: '/profile' })
                      } else {
                        setCurrentPhotoIndex(0)
                        setSelectedUser(nearbyUser)
                      }
                    }}
                    className={`bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:bg-card/80 transition-colors ${
                      !nearbyUser.isSelf && hasUnreadFrom(nearbyUser._id)
                        ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-background'
                        : ''
                    }`}
                  >
                    <div className="flex gap-4 p-4">
                      {/* Photo */}
                      <div className="relative w-24 h-32 sm:w-28 sm:h-36 shrink-0 rounded-lg overflow-hidden bg-muted">
                        {getProfileImage(nearbyUser) ? (
                          <img
                            src={getProfileImage(nearbyUser)}
                            alt={getDisplayName(nearbyUser)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 flex items-center justify-center">
                            <img
                              src="/pig-snout.svg"
                              alt=""
                              className="w-12 h-12 opacity-60"
                            />
                          </div>
                        )}
                        {/* Online indicator */}
                        {nearbyUser.isOnline && !nearbyUser.isSelf && (
                          <div className="absolute top-2 right-2 w-3 h-3 bg-online rounded-full border-2 border-black/50 online-indicator" />
                        )}
                        {/* "You" badge for self */}
                        {nearbyUser.isSelf && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-white text-xs font-bold rounded-full">
                            You
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-lg text-foreground">
                              {getDisplayName(nearbyUser)}
                              {nearbyUser.profile?.age &&
                                `, ${nearbyUser.profile.age}`}
                            </h3>
                            {nearbyUser.profile?.lookingFor && (
                              <p className="text-sm text-muted-foreground">
                                {nearbyUser.profile.lookingFor}
                              </p>
                            )}
                          </div>
                          {!nearbyUser.isSelf && (
                            <div className="flex items-center gap-1 shrink-0">
                              {nearbyUser.isOnline ? (
                                <Badge className="bg-online text-black text-xs">
                                  Online
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  {getLastSeenText(
                                    nearbyUser.lastActive,
                                    nearbyUser.isOnline,
                                  )}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Bio */}
                        {nearbyUser.profile?.bio && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {nearbyUser.profile.bio}
                          </p>
                        )}

                        {/* Interests */}
                        {nearbyUser.profile?.interests &&
                          nearbyUser.profile.interests.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {nearbyUser.profile.interests
                                .slice(0, 4)
                                .map((interest) => (
                                  <span
                                    key={interest}
                                    className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full"
                                  >
                                    {interest}
                                  </span>
                                ))}
                              {nearbyUser.profile.interests.length > 4 && (
                                <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                                  +{nearbyUser.profile.interests.length - 4}
                                </span>
                              )}
                            </div>
                          )}

                        {/* Action buttons */}
                        {!nearbyUser.isSelf && (
                          <div className="flex gap-2 mt-auto pt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className={`flex-1 h-8 text-xs transition-all duration-300 ${
                                wavingUsers[nearbyUser._id] === 'waving'
                                  ? 'wave-button-waving'
                                  : ''
                              } ${
                                wavingUsers[nearbyUser._id] === 'success'
                                  ? 'bg-green-500 border-green-500 text-white hover:bg-green-500'
                                  : ''
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!wavingUsers[nearbyUser._id]) {
                                  handleWaveWithAnimation(nearbyUser._id)
                                }
                              }}
                              disabled={!!wavingUsers[nearbyUser._id]}
                            >
                              {wavingUsers[nearbyUser._id] === 'success' ? (
                                <>
                                  <Check className="w-3 h-3 mr-1" />
                                  Waved!
                                </>
                              ) : (
                                <>
                                  <img
                                    src="/waving.svg"
                                    alt=""
                                    className="w-3 h-3 mr-1 invert wave-icon"
                                  />
                                  Wave
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMessageUser(nearbyUser._id)
                              }}
                            >
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Message
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Upsell for free users when at profile limit */}
                {!isUltra && nearbyUsers.length >= FREE_PROFILE_LIMIT && (
                  <div
                    className="bg-gradient-to-br from-amber-500/20 via-primary/20 to-primary/30 border-2 border-dashed border-primary/50 hover:border-primary transition-colors rounded-xl overflow-hidden cursor-pointer p-6 flex flex-col items-center justify-center text-center"
                    onClick={() =>
                      checkoutUrl && (window.location.href = checkoutUrl)
                    }
                  >
                    <Shield className="w-12 h-12 text-amber-500 mb-3" />
                    <h3 className="text-lg font-bold text-foreground">
                      Want to See More?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      Upgrade to Ultra to browse {ULTRA_PROFILE_LIMIT}+ profiles
                    </p>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
                      Get Ultra
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Low Activity Content - shows when there are few users */}
            {nearbyUsers.length < 8 && (
              <div className="mt-8 space-y-6 pb-4">
                {/* Invite Friends Section */}
                <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                      <UserPlus className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-1">
                        Grow Your Network
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Know someone who'd love Piggies? Invite your friends and
                        help build the community!
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              window.location.origin,
                            )
                            toast.success('Link copied to clipboard!')
                          }}
                        >
                          <Share2 className="w-4 h-4" />
                          Copy Invite Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-border"
                          onClick={() => navigate({ to: '/referrals' })}
                        >
                          <Star className="w-4 h-4" />
                          Referral Program
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Getting Started Tips */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Quick Tips to Get Noticed
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate({ to: '/profile' })}
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                        <Image className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          Add More Photos
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Profiles with 3+ photos get 5x more views
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate({ to: '/profile' })}
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          Complete Your Bio
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tell others what makes you unique
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate({ to: '/profile' })}
                    >
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                        <Heart className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          Add Your Interests
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Match with people who share your passions
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => setOnlineOnly(false)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          Check Back Often
                        </p>
                        <p className="text-xs text-muted-foreground">
                          New users join every day
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature Highlights */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Discover Piggies Features
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div
                      className="text-center p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={handleGoToMessages}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-semibold text-foreground text-sm">
                        Instant Messaging
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Chat with matches in real-time
                      </p>
                    </div>
                    <div
                      className="text-center p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate({ to: '/who-viewed-me' })}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                        <Eye className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-semibold text-foreground text-sm">
                        Who Viewed Me
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        See who's checking you out
                      </p>
                    </div>
                    <div
                      className="text-center p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() =>
                        checkoutUrl && (window.location.href = checkoutUrl)
                      }
                    >
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                        <Shield className="w-6 h-6 text-amber-500" />
                      </div>
                      <p className="font-semibold text-foreground text-sm">
                        Piggies Ultra
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Unlock premium features
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Profile Preview Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="group bg-background border-t sm:border border-border/50 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-hidden overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button - only visible on hover */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              onClick={() => setSelectedUser(null)}
            >
              <X className="w-5 h-5 text-white" />
            </Button>

            {/* Profile Photo Gallery */}
            <div className="relative aspect-[4/5]">
              {(() => {
                const photos = selectedUser.profile?.profilePhotoUrls || []
                const currentPhoto =
                  photos[currentPhotoIndex] || selectedUser.imageUrl
                const hasMultiplePhotos = photos.length > 1

                return (
                  <>
                    {currentPhoto ? (
                      <img
                        src={currentPhoto}
                        alt={getDisplayName(selectedUser)}
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

                    {/* Photo navigation buttons */}
                    {hasMultiplePhotos && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full w-10 h-10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentPhotoIndex((prev) =>
                              prev === 0 ? photos.length - 1 : prev - 1,
                            )
                          }}
                        >
                          <ChevronLeft className="w-6 h-6 text-white" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full w-10 h-10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentPhotoIndex((prev) =>
                              prev === photos.length - 1 ? 0 : prev + 1,
                            )
                          }}
                        >
                          <ChevronRight className="w-6 h-6 text-white" />
                        </Button>
                      </>
                    )}

                    {/* Photo indicators */}
                    {hasMultiplePhotos && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {photos.map((_, index) => (
                          <button
                            key={index}
                            className={`h-1 rounded-full transition-all ${
                              index === currentPhotoIndex
                                ? 'w-6 bg-white'
                                : 'w-1.5 bg-white/50 hover:bg-white/70'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setCurrentPhotoIndex(index)
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />

              {/* Online/Distance badge */}
              <div className="absolute bottom-20 left-4 flex items-center gap-2">
                {selectedUser.isOnline ? (
                  <Badge className="bg-online text-black font-bold">
                    <span className="w-2 h-2 bg-black/30 rounded-full mr-1.5" />
                    Online Now
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-black/50 text-white border-0"
                  >
                    {getLastSeenText(
                      selectedUser.lastActive,
                      selectedUser.isOnline,
                    )}
                  </Badge>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="p-6 -mt-16 relative">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black text-foreground">
                    {getDisplayName(selectedUser)}
                    {selectedUser.profile?.age &&
                      `, ${selectedUser.profile.age}`}
                  </h2>
                  {selectedUser.profile?.lookingFor && (
                    <p className="text-muted-foreground mt-1">
                      Looking for: {selectedUser.profile.lookingFor}
                    </p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {selectedUser.profile?.bio && (
                <p className="text-foreground mb-4">
                  {selectedUser.profile.bio}
                </p>
              )}

              {/* Interests */}
              {selectedUser.profile?.interests &&
                selectedUser.profile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedUser.profile.interests.map((interest) => (
                      <Badge key={interest} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className={`flex-1 h-12 border-2 transition-all duration-300 ${
                    wavingUsers[selectedUser._id] === 'waving'
                      ? 'wave-button-waving border-border'
                      : 'border-border hover:border-primary'
                  } ${
                    wavingUsers[selectedUser._id] === 'success'
                      ? 'bg-green-500 border-green-500 text-white hover:bg-green-500 hover:border-green-500'
                      : ''
                  }`}
                  onClick={() => {
                    if (!wavingUsers[selectedUser._id]) {
                      handleWaveWithAnimation(selectedUser._id)
                    }
                  }}
                  disabled={!!wavingUsers[selectedUser._id]}
                >
                  {wavingUsers[selectedUser._id] === 'success' ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Waved!
                    </>
                  ) : (
                    <>
                      <img
                        src="/waving.svg"
                        alt=""
                        className="w-5 h-5 mr-2 invert wave-icon"
                      />
                      Wave
                    </>
                  )}
                </Button>
                <Button
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 glow-red font-bold"
                  onClick={() => {
                    handleMessageUser(selectedUser._id)
                    setSelectedUser(null)
                  }}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
