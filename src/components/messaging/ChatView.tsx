import { usePaginatedQuery, useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Send,
  MoreVertical,
  X,
  Smile,
  Star,
  Ban,
  Flag,
  StarOff,
  ImageIcon,
  CheckCheck,
} from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { formatTime, formatDateDivider, formatDistanceToNow } from "@/lib/date-utils"
import { GifPicker } from "./GifPicker"
import { MediaUpload } from "./MediaUpload"
import { AlbumShareButton } from "../albums/AlbumShareButton"
import { AlbumViewer } from "../albums/AlbumViewer"
import { useSubscription } from "@/hooks/useSubscription"
import { toast } from "sonner"

interface ChatViewProps {
  conversationId: Id<"conversations">
  currentUserId: Id<"users">
  onBack?: () => void
}

export function ChatView({ conversationId, currentUserId, onBack }: ChatViewProps) {
  const [messageInput, setMessageInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [showAlbumViewer, setShowAlbumViewer] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { isUltra } = useSubscription()

  // Get conversation details
  const conversation = useQuery(api.messages.getConversation, {
    conversationId,
    currentUserId,
  })

  // Get messages
  const { results: messages, status, loadMore } = usePaginatedQuery(
    api.messages.listMessages,
    { conversationId },
    { initialNumItems: 50 }
  )

  // Check if user is favorited
  const otherUserId = conversation?.otherParticipant._id
  const isFavorited = useQuery(
    api.users.isUserFavorited,
    otherUserId ? { userId: currentUserId, favoriteId: otherUserId } : "skip"
  )

  // Check album sharing status
  const albumSharingStatus = useQuery(
    api.albums.getAlbumSharingStatus,
    { userId: currentUserId, conversationId }
  )

  // Mutations
  const sendMessage = useMutation(api.messages.sendMessageToConversation)
  const markRead = useMutation(api.messages.markMessagesRead)
  const addFavorite = useMutation(api.users.addFavorite)
  const removeFavorite = useMutation(api.users.removeFavorite)
  const blockUser = useMutation(api.users.blockUser)
  const reportUser = useMutation(api.users.reportUser)

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversationId && currentUserId) {
      markRead({ conversationId, userId: currentUserId })
    }
  }, [conversationId, currentUserId, markRead])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Close GIF picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showGifPicker && !(e.target as Element).closest('.gif-picker-container')) {
        setShowGifPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showGifPicker])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    const content = messageInput.trim()
    if (!content || isSending) return

    setIsSending(true)
    setMessageInput("")

    try {
      await sendMessage({
        conversationId,
        senderId: currentUserId,
        content,
        format: "text",
      })
    } catch {
      toast.error("Failed to send message")
      setMessageInput(content) // Restore message on error
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const handleSendGif = async (gifUrl: string) => {
    setIsSending(true)
    try {
      await sendMessage({
        conversationId,
        senderId: currentUserId,
        content: gifUrl,
        format: "gif",
      })
    } catch {
      toast.error("Failed to send GIF")
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
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

  const handleToggleFavorite = async () => {
    if (!otherUserId) return
    try {
      if (isFavorited) {
        await removeFavorite({ userId: currentUserId, favoriteId: otherUserId })
        toast.success("Removed from favorites")
      } else {
        await addFavorite({ userId: currentUserId, favoriteId: otherUserId })
        toast.success("Added to favorites")
      }
    } catch {
      toast.error("Failed to update favorites")
    }
  }

  const handleBlockUser = async () => {
    if (!otherUserId) return
    try {
      await blockUser({ blockerId: currentUserId, blockedId: otherUserId })
      setShowBlockDialog(false)
      toast.success("User blocked successfully")
      onBack?.()
    } catch {
      toast.error("Failed to block user")
    }
  }

  const handleReportUser = async () => {
    if (!otherUserId || !reportReason) return
    try {
      await reportUser({
        reporterId: currentUserId,
        reportedId: otherUserId,
        reason: reportReason,
        details: reportDetails || undefined,
      })
      setShowReportDialog(false)
      setReportReason("")
      setReportDetails("")
      toast.success("Report submitted successfully")
    } catch {
      toast.error("Failed to submit report")
    }
  }

  // Group messages by date
  const groupedMessages = messages?.reduce((groups, message) => {
    const date = new Date(message.sentAt).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {} as Record<string, typeof messages>)

  // Reverse messages within each group (they come in desc order)
  const reversedGroups = Object.entries(groupedMessages || {})
    .map(([date, msgs]) => ({
      date,
      messages: [...msgs].reverse(),
    }))
    .reverse()

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card/50 backdrop-blur-sm">
        {/* Back button - visible on mobile */}
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="lg:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}

        {/* Avatar */}
        <div className="relative">
          <Avatar>
            <AvatarImage
              src={conversation.otherParticipant.imageUrl}
              alt={conversation.otherParticipant.name}
            />
            <AvatarFallback className="bg-primary/20 text-primary">
              {getInitials(conversation.otherParticipant.name)}
            </AvatarFallback>
          </Avatar>
          {conversation.otherParticipant.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-online rounded-full border-2 border-card" />
          )}
        </div>

        {/* Name and status */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">
            {conversation.otherParticipant.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {conversation.otherParticipant.isOnline ? (
              <span className="text-online">Online</span>
            ) : (
              "Offline"
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* View their album button (when they've shared) */}
          {albumSharingStatus?.theyShared && otherUserId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAlbumViewer(true)}
              className="relative"
              title="View their album"
            >
              <ImageIcon className="w-5 h-5 text-primary" />
            </Button>
          )}

          {/* Album share button */}
          <AlbumShareButton
            userId={currentUserId}
            conversationId={conversationId}
            isUltra={isUltra}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleToggleFavorite}>
                {isFavorited ? (
                  <>
                    <StarOff className="w-4 h-4 mr-2" />
                    Remove from favorites
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 mr-2" />
                    Add to favorites
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowReportDialog(true)}
                className="text-amber-600 focus:text-amber-600"
              >
                <Flag className="w-4 h-4 mr-2" />
                Report user
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowBlockDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Ban className="w-4 h-4 mr-2" />
                Block user
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Close button - visible on desktop */}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="hidden lg:flex"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {/* Load more button */}
        {status === "CanLoadMore" && (
          <div className="flex justify-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadMore(50)}
              className="text-muted-foreground"
            >
              Load earlier messages
            </Button>
          </div>
        )}

        {status === "LoadingFirstPage" ? (
          // Loading skeleton
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-end gap-2",
                  i % 2 === 0 ? "justify-end" : ""
                )}
              >
                {i % 2 !== 0 && (
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                )}
                <div
                  className={cn(
                    "rounded-2xl animate-pulse",
                    i % 2 === 0
                      ? "bg-primary/30 w-48 h-10"
                      : "bg-muted w-56 h-10"
                  )}
                />
              </div>
            ))}
          </div>
        ) : reversedGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar size="xl">
              <AvatarImage
                src={conversation.otherParticipant.imageUrl}
                alt={conversation.otherParticipant.name}
              />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                {getInitials(conversation.otherParticipant.name)}
              </AvatarFallback>
            </Avatar>
            <h3 className="mt-4 font-semibold text-lg">
              {conversation.otherParticipant.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start the conversation by sending a message
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {reversedGroups.map(({ date, messages: dayMessages }) => (
              <div key={date}>
                {/* Date divider */}
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatDateDivider(new Date(date).getTime())}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Messages for this day */}
                <div className="space-y-1">
                  {dayMessages?.map((message, index) => {
                    const isOwn = message.senderId === currentUserId
                    const showAvatar =
                      !isOwn &&
                      (index === 0 ||
                        dayMessages[index - 1]?.senderId !== message.senderId)
                    const showTime =
                      index === dayMessages.length - 1 ||
                      dayMessages[index + 1]?.senderId !== message.senderId

                    return (
                      <div
                        key={message._id}
                        className={cn(
                          "flex items-end gap-2",
                          isOwn ? "justify-end" : ""
                        )}
                      >
                        {/* Avatar (for other's messages) */}
                        {!isOwn && (
                          <div className="w-8 shrink-0">
                            {showAvatar && (
                              <Avatar size="sm">
                                <AvatarImage
                                  src={message.sender.imageUrl}
                                  alt={message.sender.name}
                                />
                                <AvatarFallback className="bg-muted text-xs">
                                  {getInitials(message.sender.name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )}

                        {/* Message bubble */}
                        <div
                          className={cn(
                            "max-w-[70%]",
                            message.format === "gif" || message.format === "image" || message.format === "video"
                              ? "rounded-xl overflow-hidden"
                              : cn(
                                  "px-4 py-2 rounded-2xl",
                                  isOwn
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-card border border-border rounded-bl-md"
                                )
                          )}
                        >
                          <MessageContent message={message} isOwn={isOwn} />

                          {/* Time and Read Receipt */}
                          {showTime && (
                            <div
                              className={cn(
                                "flex items-center gap-1 text-[10px] mt-1",
                                message.format === "gif" || message.format === "image" || message.format === "video"
                                  ? "text-muted-foreground px-1"
                                  : isOwn
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                              )}
                            >
                              <span>{formatTime(message.sentAt)}</span>
                              {/* Read receipt for Ultra members on own messages */}
                              {isOwn && isUltra && otherUserId && message.readAt?.[otherUserId] && (
                                <span className="flex items-center gap-0.5 text-blue-400">
                                  <CheckCheck className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Message Input */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2 p-4 border-t border-border bg-card/50 relative"
      >
        {/* GIF Picker */}
        {showGifPicker && (
          <div className="gif-picker-container">
            <GifPicker
              onSelect={handleSendGif}
              onClose={() => setShowGifPicker(false)}
            />
          </div>
        )}

        {/* Media Upload */}
        <MediaUpload
          conversationId={conversationId}
          senderId={currentUserId}
          isUltra={isUltra}
        />

        {/* GIF Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowGifPicker(!showGifPicker)}
          className={cn(
            "shrink-0 text-muted-foreground hover:text-primary",
            showGifPicker && "text-primary bg-primary/10"
          )}
        >
          <Smile className="w-5 h-5" />
        </Button>

        <Input
          ref={inputRef}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          disabled={isSending}
        />

        <Button
          type="submit"
          size="icon"
          disabled={!messageInput.trim() || isSending}
          className="shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>

      {/* Block User Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block {conversation?.otherParticipant.name}?</DialogTitle>
            <DialogDescription>
              They won't be able to message you or see your profile. You can unblock them later from your settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBlockUser}>
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report User Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {conversation?.otherParticipant.name}</DialogTitle>
            <DialogDescription>
              Help us understand what happened. Your report will be reviewed by our team.
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
                <option value="inappropriate_content">Inappropriate Content</option>
                <option value="fake_profile">Fake Profile</option>
                <option value="scam">Scam</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional details (optional)</label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Tell us more about what happened..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReportUser} disabled={!reportReason}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Album Viewer */}
      {otherUserId && (
        <AlbumViewer
          viewerUserId={currentUserId}
          ownerUserId={otherUserId}
          ownerName={conversation?.otherParticipant.name ?? "User"}
          isOpen={showAlbumViewer}
          onClose={() => setShowAlbumViewer(false)}
          expiresAt={albumSharingStatus?.theirShareExpiresAt}
        />
      )}
    </div>
  )
}

// Component to render different message types
function MessageContent({ 
  message, 
  isOwn 
}: { 
  message: { 
    content: string
    format: string
    storageId?: Id<"_storage">
  }
  isOwn: boolean 
}) {
  // For media messages with storage ID, we'd fetch the URL
  // For now, we'll handle the formats we have
  
  switch (message.format) {
    case "text":
      return (
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
      )
    
    case "gif":
      return (
        <img
          src={message.content}
          alt="GIF"
          className="max-w-full rounded-lg"
          loading="lazy"
        />
      )
    
    case "image":
      if (message.storageId) {
        return <MediaImage storageId={message.storageId} />
      }
      return (
        <div className={cn(
          "text-sm px-4 py-2 rounded-2xl",
          isOwn ? "bg-primary text-primary-foreground" : "bg-card border border-border"
        )}>
          <span className="text-muted-foreground">📷 Photo</span>
        </div>
      )
    
    case "video":
      if (message.storageId) {
        return <MediaVideo storageId={message.storageId} />
      }
      return (
        <div className={cn(
          "text-sm px-4 py-2 rounded-2xl",
          isOwn ? "bg-primary text-primary-foreground" : "bg-card border border-border"
        )}>
          <span className="text-muted-foreground">🎥 Video</span>
        </div>
      )
    
    case "location":
      return (
        <div className={cn(
          "text-sm px-4 py-2 rounded-2xl",
          isOwn ? "bg-primary text-primary-foreground" : "bg-card border border-border"
        )}>
          <span className="text-muted-foreground">📍 Location shared</span>
        </div>
      )
    
    default:
      return (
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
      )
  }
}

// Component to display images from storage
function MediaImage({ storageId }: { storageId: Id<"_storage"> }) {
  const url = useQuery(api.messages.getStorageUrl, { storageId })
  
  if (!url) {
    return (
      <div className="w-48 h-48 bg-muted rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    )
  }
  
  return (
    <img
      src={url}
      alt="Photo"
      className="max-w-full max-h-64 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
      loading="lazy"
      onClick={() => window.open(url, '_blank')}
    />
  )
}

// Component to display videos from storage
function MediaVideo({ storageId }: { storageId: Id<"_storage"> }) {
  const url = useQuery(api.messages.getStorageUrl, { storageId })
  
  if (!url) {
    return (
      <div className="w-48 h-48 bg-muted rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    )
  }
  
  return (
    <video
      src={url}
      controls
      className="max-w-full max-h-64 rounded-lg"
      preload="metadata"
    />
  )
}
