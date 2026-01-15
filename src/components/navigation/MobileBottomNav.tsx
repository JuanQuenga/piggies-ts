import { Link, useLocation } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { MessageCircle, MapPin, ImageIcon, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  path: string
  badge?: number
}

export function MobileBottomNav() {
  const location = useLocation()
  const { user } = useCurrentUser()

  // Fetch unread message count
  const unreadCount = useQuery(
    api.messages.getUnreadCount,
    user?._id ? { userId: user._id } : "skip"
  )

  const navItems: NavItem[] = [
    {
      icon: MapPin,
      label: 'Nearby',
      path: '/nearby',
    },
    {
      icon: Heart,
      label: 'Interests',
      path: '/interests',
    },
    {
      icon: MessageCircle,
      label: 'Messages',
      path: '/messages',
      badge: unreadCount ?? 0,
    },
    {
      icon: ImageIcon,
      label: 'Photos',
      path: '/photos',
    },
  ]

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border lg:hidden z-40">
        <div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <Link
                key={item.label}
                to={item.path}
                activeOptions={{ exact: true }}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-14 px-4 relative rounded-md touch-manipulation",
                  active ? "text-primary" : "text-muted-foreground active:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom padding spacer to prevent content from being hidden behind nav */}
      <div className="h-16 lg:hidden" />
    </>
  )
}
