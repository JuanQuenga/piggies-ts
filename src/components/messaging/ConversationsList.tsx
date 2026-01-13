import { usePaginatedQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Edit, MapPin } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "@/lib/date-utils"
import { Link } from "@tanstack/react-router"

interface ConversationsListProps {
  userId: Id<"users">
  selectedConversationId?: Id<"conversations">
  onSelectConversation: (conversationId: Id<"conversations">) => void
  onNewConversation?: () => void
}

export function ConversationsList({
  userId,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationsListProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const { results: conversations, status, loadMore } = usePaginatedQuery(
    api.messages.listConversations,
    { userId },
    { initialNumItems: 20 }
  )

  const filteredConversations = searchQuery
    ? conversations?.filter((c) =>
        c.otherParticipant.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations

  const getLastMessagePreview = (
    message: { content: string; format: string; senderId: Id<"users"> } | null,
    currentUserId: Id<"users">
  ) => {
    if (!message) return "No messages yet"

    const prefix = message.senderId === currentUserId ? "You: " : ""

    switch (message.format) {
      case "image":
        return `${prefix}📷 Sent a photo`
      case "video":
        return `${prefix}🎥 Sent a video`
      case "gif":
        return `${prefix}GIF`
      case "location":
        return `${prefix}📍 Shared location`
      default:
        return `${prefix}${message.content}`
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link to="/nearby">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <MapPin className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
          {onNewConversation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewConversation}
              className="text-primary hover:bg-primary/10"
            >
              <Edit className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {status === "LoadingFirstPage" ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-muted rounded mb-2" />
                  <div className="h-3 w-40 bg-muted rounded" />
                </div>
              </div>
            ))
          ) : filteredConversations?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a conversation with someone!</p>
            </div>
          ) : (
            filteredConversations?.map((conversation) => (
              <button
                key={conversation._id}
                onClick={() => onSelectConversation(conversation._id)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-card",
                  selectedConversationId === conversation._id && "bg-card border-l-2 border-l-primary"
                )}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar size="lg">
                    <AvatarImage
                      src={conversation.otherParticipant.imageUrl}
                      alt={conversation.otherParticipant.name}
                    />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {getInitials(conversation.otherParticipant.name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  {conversation.otherParticipant.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-online rounded-full border-2 border-background online-indicator" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold truncate">
                      {conversation.otherParticipant.name}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {conversation.lastMessageTime
                        ? formatDistanceToNow(conversation.lastMessageTime)
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate pr-2">
                      {getLastMessagePreview(conversation.lastMessage, userId)}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <Badge className="shrink-0 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Load more */}
        {status === "CanLoadMore" && (
          <div className="p-4 text-center">
            <Button variant="ghost" onClick={() => loadMore(20)}>
              Load more
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}


