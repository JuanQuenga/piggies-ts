import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { ConversationsList } from '@/components/messaging/ConversationsList'
import { ChatView } from '@/components/messaging/ChatView'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Id } from '../../../convex/_generated/dataModel'
import { MessageCircle, LogOut, Settings, User, Sparkles, ImageIcon, Eye, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type MessagesSearch = {
  conversation?: Id<"conversations">
}

export const Route = createFileRoute('/_authenticated/messages')({
  component: MessagesPage,
  validateSearch: (search: Record<string, unknown>): MessagesSearch => {
    return {
      conversation: search.conversation as Id<"conversations"> | undefined,
    }
  },
})

function MessagesPage() {
  const { user: workosUser, signOut } = useAuth()
  const { user, isLoading } = useCurrentUser()
  const { isUltra, checkoutUrl, portalUrl } = useSubscription()
  const navigate = useNavigate()
  const { conversation: initialConversation } = Route.useSearch()
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(
    initialConversation ?? null
  )
  const [isMobileView, setIsMobileView] = useState(false)

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
  }

  // Update selected conversation when search param changes
  useEffect(() => {
    if (initialConversation) {
      setSelectedConversationId(initialConversation)
    }
  }, [initialConversation])

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const Header = () => (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <img src="/pig-snout.svg" alt="Piggies" className="w-5 h-5 brightness-0 invert" />
          </div>
          <span className="text-lg font-bold hidden sm:block">Piggies</span>
        </Link>

        {/* Nav Icons */}
        <div className="flex items-center gap-1">
          {/* Back to Home */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate({ to: '/home' })}
          >
            <Home className="w-5 h-5" />
          </Button>

          {/* Waves */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate({ to: '/waves' })}
          >
            <img src="/waving.svg" alt="Waves" className="w-5 h-5 invert opacity-60" />
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
  )

  // Mobile: Show either list or chat
  if (isMobileView) {
    if (selectedConversationId) {
      return (
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <div className="flex-1 overflow-hidden">
            <ChatView
              conversationId={selectedConversationId}
              currentUserId={user._id}
              onBack={() => setSelectedConversationId(null)}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 overflow-hidden">
          <ConversationsList
            userId={user._id}
            selectedConversationId={selectedConversationId ?? undefined}
            onSelectConversation={setSelectedConversationId}
          />
        </div>
      </div>
    )
  }

  // Desktop: Side-by-side layout
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Conversations sidebar */}
        <div className="w-80 xl:w-96 border-r border-border shrink-0 overflow-hidden">
          <ConversationsList
            userId={user._id}
            selectedConversationId={selectedConversationId ?? undefined}
            onSelectConversation={setSelectedConversationId}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden">
          {selectedConversationId ? (
            <ChatView
              conversationId={selectedConversationId}
              currentUserId={user._id}
              onBack={() => setSelectedConversationId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Your Messages</h2>
              <p className="text-muted-foreground max-w-sm">
                Select a conversation to start messaging, or find someone new to chat with.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


