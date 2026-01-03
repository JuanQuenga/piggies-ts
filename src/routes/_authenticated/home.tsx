import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Id } from '../../../convex/_generated/dataModel'
import { formatDistanceToNow } from '@/lib/date-utils'
import { INTEREST_CATEGORIES, type InterestCategory } from '@/lib/interests'
import {
  Grid3X3,
  MapPin,
  MessageCircle,
  Bell,
  Search,
  Filter,
  LogOut,
  Settings,
  User,
  Heart,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Flame,
  Eye,
  Camera,
  Users,
  Tags,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export const Route = createFileRoute('/_authenticated/home')({
  component: HomePage,
})

type NearbyUser = {
  _id: Id<"users">
  name: string
  imageUrl?: string
  isOnline?: boolean
  lastActive?: number
  profile: {
    displayName?: string
    bio?: string
    age?: number
    profilePhotos?: string[]
    lookingFor?: string
    interests?: string[]
    onboardingComplete?: boolean
  } | null
}

function HomePage() {
  const { user: workosUser, signOut } = useAuth()
  const { user: convexUser } = useCurrentUser()
  const { isUltra, checkoutUrl, portalUrl } = useSubscription()
  const navigate = useNavigate()
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [withPhotos, setWithPhotos] = useState(false)
  const [ageFilter, setAgeFilter] = useState<{ min?: number; max?: number } | null>(null)
  const [selectedLocation, setSelectedLocation] = useState('Downtown')
  const [interestFilter, setInterestFilter] = useState<string[]>([])
  const [interestDialogOpen, setInterestDialogOpen] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<InterestCategory>>(new Set(['hobbies']))

  const locations = [
    'Downtown',
    'Midtown',
    'Uptown',
    'West Side',
    'East Side',
    'North End',
    'South End',
    'Suburbs',
    'Nearby',
  ]

  // Get nearby users from Convex
  const nearbyUsers = useQuery(
    api.users.getNearbyUsers,
    convexUser?._id ? {
      currentUserId: convexUser._id,
      onlineOnly,
      withPhotos,
      minAge: ageFilter?.min,
      maxAge: ageFilter?.max,
      interests: interestFilter.length > 0 ? interestFilter : undefined,
    } : "skip"
  )

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
        : [...prev, interest]
    )
  }

  const clearInterestFilter = () => {
    setInterestFilter([])
  }

  // Get unread message count
  const unreadCount = useQuery(
    api.messages.getUnreadCount,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  )

  // Start conversation mutation
  const startConversation = useMutation(api.messages.startConversation)

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
  }

  const handleGoToMessages = () => {
    navigate({ to: '/messages' })
  }

  const handleMessageUser = async (userId: Id<"users">) => {
    if (!convexUser?._id) return
    try {
      const result = await startConversation({
        currentUserId: convexUser._id,
        otherUserId: userId,
      })
      navigate({ to: '/messages', search: { conversation: result.conversationId } })
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
    return user.profile?.profilePhotos?.[0] || user.imageUrl
  }

  const getDisplayName = (user: NearbyUser) => {
    return user.profile?.displayName || user.name
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <img src="/pig-snout.svg" alt="Piggies" className="w-5 h-5 brightness-0 invert" />
            </div>
            <span className="text-lg font-bold hidden sm:block">Piggies</span>
          </Link>

          {/* Location Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{selectedLocation}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48 bg-card border-border">
              {locations.map((location) => (
                <DropdownMenuItem
                  key={location}
                  className={`cursor-pointer ${selectedLocation === location ? 'bg-accent' : ''}`}
                  onClick={() => setSelectedLocation(location)}
                >
                  <MapPin className={`mr-2 w-4 h-4 ${selectedLocation === location ? 'text-primary' : 'text-muted-foreground'}`} />
                  {location}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Nav Icons */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="relative">
              <Flame className="w-5 h-5 text-primary" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={handleGoToMessages}
            >
              <MessageCircle className="w-5 h-5" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-[10px] text-white rounded-full flex items-center justify-center font-bold">
                  {unreadCount! > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 p-2 rounded-lg hover:bg-accent">
                <Avatar size="sm">
                  <AvatarImage src={workosUser?.profilePictureUrl || undefined} alt={workosUser?.firstName || 'User'} />
                  <AvatarFallback className="bg-primary text-white text-xs">
                    {getInitials(workosUser?.firstName, workosUser?.lastName)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                <div className="px-3 py-2">
                  <p className="font-medium">{workosUser?.firstName} {workosUser?.lastName}</p>
                  <p className="text-sm text-muted-foreground truncate">{workosUser?.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => navigate({ to: '/profile' })}
                >
                  <User className="mr-2 w-4 h-4" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigate({ to: '/who-viewed-me' })}
                >
                  <Eye className="mr-2 w-4 h-4" />
                  Who Viewed Me
                </DropdownMenuItem>
                {isUltra ? (
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => portalUrl && (window.location.href = portalUrl)}
                  >
                    <Sparkles className="mr-2 w-4 h-4 text-amber-500" />
                    <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent font-medium">
                      Piggies Ultra
                    </span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => checkoutUrl && (window.location.href = checkoutUrl)}
                  >
                    <Sparkles className="mr-2 w-4 h-4 text-amber-500" />
                    Upgrade to Ultra
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigate({ to: '/settings' })}
                >
                  <Settings className="mr-2 w-4 h-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="sticky top-14 z-40 bg-background border-b border-border px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <Button
          variant={(onlineOnly || withPhotos || ageFilter || interestFilter.length > 0) ? "default" : "outline"}
          size="sm"
          className={`shrink-0 gap-2 ${(onlineOnly || withPhotos || ageFilter || interestFilter.length > 0) ? '' : 'border-border'}`}
          onClick={() => {
            setOnlineOnly(false)
            setWithPhotos(false)
            setAgeFilter(null)
            setInterestFilter([])
          }}
        >
          <Filter className="w-4 h-4" />
          {(onlineOnly || withPhotos || ageFilter || interestFilter.length > 0) ? 'Clear' : 'Filters'}
        </Button>
        <Button
          variant={onlineOnly ? "default" : "outline"}
          size="sm"
          className={`shrink-0 ${onlineOnly ? '' : 'border-border'}`}
          onClick={() => setOnlineOnly(!onlineOnly)}
        >
          Online Now
        </Button>
        <Button
          variant={withPhotos ? "default" : "outline"}
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
              variant={interestFilter.length > 0 ? "default" : "outline"}
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
              {(Object.entries(INTEREST_CATEGORIES) as [InterestCategory, typeof INTEREST_CATEGORIES[InterestCategory]][]).map(([categoryKey, category]) => {
                const isExpanded = expandedCategories.has(categoryKey)
                const selectedInCategory = category.interests.filter((i) => interestFilter.includes(i))

                return (
                  <div key={categoryKey} className="bg-card rounded-xl border border-border overflow-hidden">
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
          variant={ageFilter?.min === 18 && ageFilter?.max === 25 ? "default" : "outline"}
          size="sm"
          className={`shrink-0 ${ageFilter?.min === 18 && ageFilter?.max === 25 ? '' : 'border-border'}`}
          onClick={() => setAgeFilter(ageFilter?.min === 18 && ageFilter?.max === 25 ? null : { min: 18, max: 25 })}
        >
          Age 18-25
        </Button>
        <Button
          variant={ageFilter?.min === 25 && ageFilter?.max === 35 ? "default" : "outline"}
          size="sm"
          className={`shrink-0 ${ageFilter?.min === 25 && ageFilter?.max === 35 ? '' : 'border-border'}`}
          onClick={() => setAgeFilter(ageFilter?.min === 25 && ageFilter?.max === 35 ? null : { min: 25, max: 35 })}
        >
          Age 25-35
        </Button>
        <Button
          variant={ageFilter?.min === 35 && ageFilter?.max === 50 ? "default" : "outline"}
          size="sm"
          className={`shrink-0 ${ageFilter?.min === 35 && ageFilter?.max === 50 ? '' : 'border-border'}`}
          onClick={() => setAgeFilter(ageFilter?.min === 35 && ageFilter?.max === 50 ? null : { min: 35, max: 50 })}
        >
          Age 35-50
        </Button>
        <div className="ml-auto shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            <Grid3X3 className="w-4 h-4" />
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
            <h3 className="text-lg font-semibold text-foreground mb-2">No users found</h3>
            <p className="text-muted-foreground">
              {(onlineOnly || withPhotos || ageFilter || interestFilter.length > 0)
                ? "No one matches your filters. Try adjusting them."
                : "Be the first to complete your profile and start connecting!"}
            </p>
            {(onlineOnly || withPhotos || ageFilter || interestFilter.length > 0) && (
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
          <div className={`grid gap-1.5 sm:gap-2 ${
            viewMode === 'grid'
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
          }`}>
            {nearbyUsers.map((nearbyUser) => (
              <div
                key={nearbyUser._id}
                onClick={() => setSelectedUser(nearbyUser)}
                className="profile-card aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group relative bg-card"
              >
                {getProfileImage(nearbyUser) ? (
                  <img
                    src={getProfileImage(nearbyUser)}
                    alt={getDisplayName(nearbyUser)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <User className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}

                {/* Online indicator */}
                {nearbyUser.isOnline && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-online rounded-full border-2 border-black/50 online-indicator" />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* User info */}
                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-white text-sm truncate">
                      {getDisplayName(nearbyUser)}
                      {nearbyUser.profile?.age && `, ${nearbyUser.profile.age}`}
                    </p>
                  </div>
                  {nearbyUser.profile?.lookingFor && (
                    <p className="text-xs text-white/70 truncate">
                      {nearbyUser.profile.lookingFor}
                    </p>
                  )}
                </div>

                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-12 h-12 rounded-full border-2 border-white/30 bg-transparent hover:bg-white/10 hover:border-white/50"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMessageUser(nearbyUser._id)
                    }}
                  >
                    <MessageCircle className="w-5 h-5 text-white" />
                  </Button>
                  <Button
                    size="icon"
                    className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 glow-red"
                    onClick={(e) => { e.stopPropagation() }}
                  >
                    <Heart className="w-5 h-5 text-white" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Profile Preview Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 rounded-full"
              onClick={() => setSelectedUser(null)}
            >
              <X className="w-5 h-5 text-white" />
            </Button>

            {/* Profile Image */}
            <div className="relative aspect-[4/5]">
              {getProfileImage(selectedUser) ? (
                <img
                  src={getProfileImage(selectedUser)}
                  alt={getDisplayName(selectedUser)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <User className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

              {/* Online/Distance badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                {selectedUser.isOnline ? (
                  <Badge className="bg-online text-black font-bold">
                    <span className="w-2 h-2 bg-black/30 rounded-full mr-1.5" />
                    Online Now
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-black/50 text-white border-0">
                    {getLastSeenText(selectedUser.lastActive, selectedUser.isOnline)}
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
                    {selectedUser.profile?.age && `, ${selectedUser.profile.age}`}
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
                <p className="text-foreground mb-4">{selectedUser.profile.bio}</p>
              )}

              {/* Interests */}
              {selectedUser.profile?.interests && selectedUser.profile.interests.length > 0 && (
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
                  className="flex-1 h-12 border-2 border-border hover:border-primary"
                  onClick={() => setSelectedUser(null)}
                >
                  <X className="w-5 h-5 mr-2" />
                  Pass
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

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border lg:hidden z-40">
        <div className="flex items-center justify-around h-16 px-4">
          <Button variant="ghost" size="icon" className="text-primary">
            <Grid3X3 className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon">
            <Search className="w-6 h-6" />
          </Button>
          <Button size="icon" className="bg-primary glow-red -mt-6 w-14 h-14 rounded-full shadow-lg">
            <Camera className="w-6 h-6" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            onClick={handleGoToMessages}
          >
            <MessageCircle className="w-6 h-6" />
            {(unreadCount ?? 0) > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            )}
          </Button>
          <Button variant="ghost" size="icon">
            <User className="w-6 h-6" />
          </Button>
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="h-16 lg:hidden" />
    </div>
  )
}
