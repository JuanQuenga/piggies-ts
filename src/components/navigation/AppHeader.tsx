import { Link, useNavigate, useLocation } from '@tanstack/react-router'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
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
import {
  MessageCircle,
  LogOut,
  Settings,
  User,
  Sparkles,
  Eye,
  ImageIcon,
  MapPin,
  Heart,
  Telescope,
  ChevronDown,
  Navigation,
  Loader2,
  Store,
  Clock,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function AppHeader() {
  const { user: workosUser, signOut } = useAuth()
  const { user: convexUser } = useCurrentUser()
  const { isUltra, checkoutUrl, portalUrl } = useSubscription()
  const navigate = useNavigate()
  const location = useLocation()

  // Get unread message count
  const unreadCount = useQuery(
    api.messages.getUnreadCount,
    convexUser?._id ? { userId: convexUser._id } : 'skip',
  )

  // Location state
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [locationType, setLocationType] = useState<'nearby' | 'custom'>('nearby')
  const [customLocation, setCustomLocation] = useState('')
  const [customLocationInput, setCustomLocationInput] = useState('')
  const [nearbyLocationName, setNearbyLocationName] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [isSettingCustomLocation, setIsSettingCustomLocation] = useState(false)

  // Load location from localStorage on mount and listen for external updates
  useEffect(() => {
    const loadLocationFromStorage = () => {
      const savedType = localStorage.getItem('piggies-location-type')
      if (savedType === 'nearby' || savedType === 'custom') {
        setLocationType(savedType)
      }
      const savedCustom = localStorage.getItem('piggies-custom-location')
      if (savedCustom) setCustomLocation(savedCustom)
      const savedNearby = localStorage.getItem('piggies-nearby-location')
      if (savedNearby) setNearbyLocationName(savedNearby)
    }

    if (typeof window !== 'undefined') {
      loadLocationFromStorage()

      // Listen for location updates from useLocationTracking hook
      const handleLocationChanged = () => {
        loadLocationFromStorage()
      }
      window.addEventListener('location-changed', handleLocationChanged)

      return () => {
        window.removeEventListener('location-changed', handleLocationChanged)
      }
    }
  }, [])

  // Save location to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('piggies-location-type', locationType)
      if (customLocation) {
        localStorage.setItem('piggies-custom-location', customLocation)
      }
      if (nearbyLocationName) {
        localStorage.setItem('piggies-nearby-location', nearbyLocationName)
      }
      // Dispatch event so nearby page can react
      window.dispatchEvent(new Event('location-changed'))
    }
  }, [locationType, customLocation, nearbyLocationName])

  const getLocationDisplayText = () => {
    if (locationType === 'nearby') {
      return nearbyLocationName || 'Nearby'
    }
    return customLocation || 'Set Location'
  }

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLocation(true)

    // Check/request permission first
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'geolocation' })
        if (permission.state === 'denied') {
          toast.error('Location permission denied. Please enable it in your browser settings.')
          setIsGettingLocation(false)
          return
        }
      }
    } catch {
      // Permissions API not supported, continue with geolocation request
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        // Save the coordinates
        localStorage.setItem('piggies-nearby-coords', JSON.stringify({ latitude, longitude }))

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
              'Location access denied. Please enable location in your browser/device settings and try again.',
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
      {
        enableHighAccuracy: false, // Use false for faster response
        timeout: 15000, // Longer timeout for mobile
        maximumAge: 60000, // Cache for 1 minute (reduced from 5 min for fresher location)
      },
    )
  }

  const handleSetCustomLocation = async () => {
    if (!customLocationInput.trim()) {
      toast.error('Please enter a city or zip code')
      return
    }

    setIsSettingCustomLocation(true)

    try {
      const searchQuery = customLocationInput.trim()
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1&countrycodes=us`,
      )
      const data = await response.json()

      if (!data || data.length === 0) {
        toast.error('Location not found. Please try a different city or zip code.')
        setIsSettingCustomLocation(false)
        return
      }

      const result = data.find(
        (r: { type?: string; class?: string }) =>
          r.type === 'city' ||
          r.type === 'town' ||
          r.type === 'village' ||
          r.type === 'administrative' ||
          r.class === 'place'
      ) || data[0]

      const lat = parseFloat(result.lat)
      const lon = parseFloat(result.lon)

      const cityName =
        result.address?.city ||
        result.address?.town ||
        result.address?.village ||
        result.address?.municipality ||
        result.address?.county ||
        result.name ||
        searchQuery

      localStorage.setItem('piggies-custom-coords', JSON.stringify({ latitude: lat, longitude: lon }))
      setCustomLocation(cityName)
      setLocationType('custom')
      setLocationDialogOpen(false)
      setCustomLocationInput('')
      toast.success(`Location set to ${cityName}!`)
    } catch (error) {
      console.error('Geocoding error:', error)
      toast.error('Failed to find location. Please try again.')
    } finally {
      setIsSettingCustomLocation(false)
    }
  }

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
  }

  const isActive = (path: string) => location.pathname === path

  // Navigation items for desktop header
  const navItems = [
    { icon: Store, label: 'Community', path: '/community' },
    { icon: Users, label: 'Members', path: '/members' },
    { icon: Heart, label: 'Interests', path: '/interests' },
    { icon: MessageCircle, label: 'Messages', path: '/messages', badge: unreadCount ?? 0 },
    { icon: Clock, label: 'Looking Now', path: '/looking-now' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link to="/members" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <img
              src="/pig-snout.svg"
              alt="Piggies"
              className="w-5 h-5 brightness-0 invert"
            />
          </div>
          <span className="text-lg font-bold">Piggies</span>
        </Link>

        {/* Desktop Navigation - hidden on mobile */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "flex items-center gap-2 px-3 relative",
                  active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => navigate({ to: item.path })}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </Button>
            )
          })}
        </nav>

        {/* Right side: Location selector + User menu */}
        <div className="flex items-center gap-2">
          {/* Location Selector - always visible */}
          <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
            <DialogTrigger className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer">
              {locationType === 'custom' ? (
                <Telescope className="w-4 h-4 text-primary" />
              ) : (
                <MapPin className="w-4 h-4 text-primary" />
              )}
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
                  <div className="flex items-center gap-2">
                    <Telescope className="w-5 h-5 text-primary" />
                    <p className="font-semibold text-foreground">
                      Enter City or Zip Code
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Miami or 33101"
                      value={customLocationInput}
                      onChange={(e) => setCustomLocationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSettingCustomLocation) {
                          handleSetCustomLocation()
                        }
                      }}
                      disabled={isSettingCustomLocation}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSetCustomLocation}
                      size="sm"
                      disabled={isSettingCustomLocation}
                    >
                      {isSettingCustomLocation ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Set'
                      )}
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

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 rounded-lg hover:bg-accent">
              <Avatar size="sm">
                <AvatarImage
                  src={workosUser?.profilePictureUrl || undefined}
                  alt={workosUser?.firstName || 'User'}
                />
                <AvatarFallback className="bg-primary text-white text-xs">
                  {getInitials(workosUser?.firstName, workosUser?.lastName)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-card border-border"
            >
              <div className="px-3 py-2">
                <p className="font-medium">
                  {workosUser?.firstName} {workosUser?.lastName}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {workosUser?.email}
                </p>
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
                onClick={() => navigate({ to: '/photos' })}
              >
                <ImageIcon className="mr-2 w-4 h-4" />
                Photos
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
                  onClick={() =>
                    portalUrl && (window.location.href = portalUrl)
                  }
                >
                  <Sparkles className="mr-2 w-4 h-4 text-amber-500" />
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent font-medium">
                    Piggies Ultra
                  </span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() =>
                    checkoutUrl && (window.location.href = checkoutUrl)
                  }
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
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 w-4 h-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
