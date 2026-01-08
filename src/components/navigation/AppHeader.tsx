import { Link, useNavigate, useLocation } from '@tanstack/react-router'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MessageCircle,
  LogOut,
  Settings,
  User,
  Sparkles,
  Eye,
  ImageIcon,
  Home,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function AppHeader() {
  const { user: workosUser, signOut } = useAuth()
  const { user: convexUser } = useCurrentUser()
  const { isUltra, checkoutUrl, portalUrl } = useSubscription()
  const navigate = useNavigate()
  const location = useLocation()

  // Get location display text from localStorage (for mobile header)
  const getLocationDisplayText = () => {
    if (typeof window === 'undefined') return 'Nearby'
    const locationType = localStorage.getItem('piggies-location-type')
    if (locationType === 'custom') {
      return localStorage.getItem('piggies-custom-location') || 'Set Location'
    }
    return localStorage.getItem('piggies-nearby-location') || 'Nearby'
  }

  // Get unread message count
  const unreadCount = useQuery(
    api.messages.getUnreadCount,
    convexUser?._id ? { userId: convexUser._id } : 'skip',
  )

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
  }

  const isActive = (path: string) => location.pathname === path

  // Navigation items for desktop header
  const navItems = [
    { icon: Home, label: 'Browse', path: '/home' },
    { icon: MapPin, label: 'Looking', path: '/looking-now' },
    { icon: MessageCircle, label: 'Messages', path: '/messages', badge: unreadCount ?? 0 },
    { icon: ImageIcon, label: 'Photos', path: '/photos' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo + Mobile Location */}
        <div className="flex items-center gap-2">
          <Link to="/home" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <img
                src="/pig-snout.svg"
                alt="Piggies"
                className="w-5 h-5 brightness-0 invert"
              />
            </div>
            <span className="text-lg font-bold hidden sm:block">Piggies</span>
          </Link>

          {/* Mobile Location Button - only on home page */}
          {location.pathname === '/home' && (
            <button
              onClick={() => navigate({ to: '/home', search: { openLocation: true } })}
              className="flex lg:hidden items-center gap-1.5 bg-card border border-border rounded-full px-2.5 py-1 hover:bg-accent transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium truncate max-w-[80px]">
                {getLocationDisplayText()}
              </span>
            </button>
          )}
        </div>

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
          {/* Waves button */}
          <Button
            variant="ghost"
            className={cn(
              "flex items-center gap-2 px-3",
              isActive('/waves') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => navigate({ to: '/waves' })}
          >
            <img
              src="/waving.svg"
              alt="Waves"
              className={cn("w-5 h-5 invert", isActive('/waves') ? "opacity-100" : "opacity-60")}
            />
            <span className="text-sm font-medium">Waves</span>
          </Button>
        </nav>

        {/* Right side: Nav icons on mobile + User menu */}
        <div className="flex items-center gap-1">
          {/* Mobile Nav Icons - visible only on mobile */}
          <div className="flex lg:hidden items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate({ to: '/waves' })}
            >
              <img
                src="/waving.svg"
                alt="Waves"
                className="w-5 h-5 invert opacity-60"
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate({ to: '/messages' })}
            >
              <MessageCircle className="w-5 h-5" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-[10px] text-white rounded-full flex items-center justify-center font-bold">
                  {unreadCount! > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-1 p-2 rounded-lg hover:bg-accent">
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
                onClick={() => navigate({ to: '/album' })}
              >
                <ImageIcon className="mr-2 w-4 h-4" />
                Private Album
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
