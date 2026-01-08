import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ConversationsList } from '@/components/messaging/ConversationsList'
import { ChatView } from '@/components/messaging/ChatView'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Id } from '../../../convex/_generated/dataModel'
import { MessageCircle } from 'lucide-react'

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
  const { user, isLoading } = useCurrentUser()
  const { conversation: initialConversation } = Route.useSearch()
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(
    initialConversation ?? null
  )
  const [isMobileView, setIsMobileView] = useState(false)

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

  // Mobile: Show either list or chat
  if (isMobileView) {
    if (selectedConversationId) {
      return (
        <div className="min-h-screen bg-background flex flex-col">
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


