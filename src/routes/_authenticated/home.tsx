import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { useState } from 'react'
import { 
  Grid3X3,
  MapPin,
  MessageCircle, 
  Bell, 
  Search, 
  Filter,
  MoreHorizontal,
  LogOut,
  Settings,
  User,
  Heart,
  Star,
  X,
  ChevronDown,
  Flame,
  Eye,
  Lock,
  Camera,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const Route = createFileRoute('/_authenticated/home')({
  component: HomePage,
})

// Mock nearby users data
const NEARBY_USERS = [
  { id: 1, name: 'Marcus', age: 28, distance: '200 ft', online: true, lastSeen: 'Now', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop', bio: 'Looking to meet new people 🐷', verified: true },
  { id: 2, name: 'Tyler', age: 24, distance: '0.3 mi', online: true, lastSeen: 'Now', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop', bio: 'New to the area', verified: false },
  { id: 3, name: 'Jordan', age: 31, distance: '0.5 mi', online: false, lastSeen: '5m ago', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop', bio: 'Adventure seeker 🌍', verified: true },
  { id: 4, name: 'Chris', age: 26, distance: '0.8 mi', online: true, lastSeen: 'Now', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=500&fit=crop', bio: 'Coffee enthusiast ☕', verified: false },
  { id: 5, name: 'Alex', age: 29, distance: '1.1 mi', online: false, lastSeen: '15m ago', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop', bio: 'Music & vibes 🎵', verified: true },
  { id: 6, name: 'Sam', age: 27, distance: '1.4 mi', online: true, lastSeen: 'Now', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop', bio: 'Just moved here!', verified: false },
  { id: 7, name: 'Drew', age: 32, distance: '1.6 mi', online: true, lastSeen: 'Now', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop', bio: 'Fitness & food 💪', verified: true },
  { id: 8, name: 'Riley', age: 25, distance: '1.9 mi', online: false, lastSeen: '1h ago', image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=500&fit=crop', bio: 'Art lover 🎨', verified: false },
  { id: 9, name: 'Blake', age: 30, distance: '2.1 mi', online: true, lastSeen: 'Now', image: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=500&fit=crop', bio: 'Spontaneous plans only', verified: false },
  { id: 10, name: 'Casey', age: 28, distance: '2.4 mi', online: false, lastSeen: '2h ago', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop', bio: 'Weekend warrior', verified: true },
  { id: 11, name: 'Morgan', age: 26, distance: '2.7 mi', online: true, lastSeen: 'Now', image: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=500&fit=crop', bio: 'Tech geek 🤓', verified: false },
  { id: 12, name: 'Jamie', age: 33, distance: '3.0 mi', online: false, lastSeen: '30m ago', image: 'https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=400&h=500&fit=crop', bio: 'Dog dad 🐕', verified: true },
  { id: 13, name: 'Avery', age: 24, distance: '3.2 mi', online: true, lastSeen: 'Now', image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&h=500&fit=crop', bio: 'Night owl 🦉', verified: false },
  { id: 14, name: 'Quinn', age: 29, distance: '3.5 mi', online: false, lastSeen: '45m ago', image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=500&fit=crop', bio: 'Foodie 🍕', verified: false },
  { id: 15, name: 'Reese', age: 27, distance: '3.8 mi', online: true, lastSeen: 'Now', image: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=500&fit=crop', bio: 'Beach lover 🏖️', verified: true },
  { id: 16, name: 'Parker', age: 31, distance: '4.0 mi', online: false, lastSeen: '3h ago', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop', bio: 'Creative soul', verified: false },
]

function HomePage() {
  const { user, signOut } = useAuth()
  const [selectedUser, setSelectedUser] = useState<typeof NEARBY_USERS[0] | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
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

          {/* Location */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Downtown</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </div>

          {/* Nav Icons */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="relative">
              <Flame className="w-5 h-5 text-primary" />
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <MessageCircle className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-[10px] text-white rounded-full flex items-center justify-center font-bold">
                5
              </span>
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-1">
                  <Avatar size="sm">
                    <AvatarImage src={user?.profilePictureUrl || undefined} alt={user?.firstName || 'User'} />
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {getInitials(user?.firstName, user?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                <div className="px-3 py-2">
                  <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 w-4 h-4" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Eye className="mr-2 w-4 h-4" />
                  Who Viewed Me
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Star className="mr-2 w-4 h-4 text-yellow-500" />
                  Upgrade to Pro
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
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
        <Button variant="outline" size="sm" className="shrink-0 border-border gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
        <Button variant="outline" size="sm" className="shrink-0 border-border">
          Online Now
        </Button>
        <Button variant="outline" size="sm" className="shrink-0 border-border">
          With Photos
        </Button>
        <Button variant="outline" size="sm" className="shrink-0 border-border">
          Nearby
        </Button>
        <Button variant="outline" size="sm" className="shrink-0 border-border">
          Age 21-35
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
        <div className={`grid gap-1.5 sm:gap-2 ${
          viewMode === 'grid' 
            ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8' 
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
        }`}>
          {NEARBY_USERS.map((nearbyUser) => (
            <div 
              key={nearbyUser.id}
              onClick={() => setSelectedUser(nearbyUser)}
              className="profile-card aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group relative bg-card"
            >
              <img 
                src={nearbyUser.image} 
                alt={nearbyUser.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              
              {/* Online indicator */}
              {nearbyUser.online && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-online rounded-full border-2 border-black/50 online-indicator" />
              )}

              {/* Verified badge */}
              {nearbyUser.verified && (
                <div className="absolute top-2 left-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              
              {/* User info */}
              <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                <div className="flex items-center gap-1">
                  <p className="font-bold text-white text-sm truncate">{nearbyUser.name}, {nearbyUser.age}</p>
                </div>
                <p className="text-xs text-white/70 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {nearbyUser.distance}
                </p>
              </div>

              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="w-12 h-12 rounded-full border-2 border-white/30 bg-transparent hover:bg-white/10 hover:border-white/50"
                  onClick={(e) => { e.stopPropagation() }}
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
              <img 
                src={selectedUser.image} 
                alt={selectedUser.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              
              {/* Online/Distance badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                {selectedUser.online ? (
                  <Badge className="bg-online text-black font-bold">
                    <span className="w-2 h-2 bg-black/30 rounded-full mr-1.5" />
                    Online Now
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-black/50 text-white border-0">
                    {selectedUser.lastSeen}
                  </Badge>
                )}
              </div>

              {/* Verified badge */}
              {selectedUser.verified && (
                <Badge className="absolute top-4 right-14 bg-primary text-white border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>

            {/* Profile Info */}
            <div className="p-6 -mt-16 relative">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black text-foreground">
                    {selectedUser.name}, {selectedUser.age}
                  </h2>
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" />
                    {selectedUser.distance} away
                  </p>
                </div>
              </div>

              {/* Bio */}
              <p className="text-foreground mb-6">{selectedUser.bio}</p>

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
          <Button variant="ghost" size="icon" className="relative">
            <MessageCircle className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
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
