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
  CheckCheck,
  Paperclip,
  ImagePlus,
  Camera,
} from "lucide-react"
import { useState, useRef, useEffect, useLayoutEffect } from "react"
import { cn } from "@/lib/utils"
import { formatTime, formatDateDivider } from "@/lib/date-utils"
import { GifPicker } from "./GifPicker"
import { MediaUpload } from "./MediaUpload"
import { AlbumShareButton } from "../albums/AlbumShareButton"
import { AlbumViewButton } from "../albums/AlbumViewButton"
import { AlbumShareMessage } from "./AlbumShareMessage"
import { CameraCapture } from "./CameraCapture"
import { SnapViewer } from "./SnapViewer"
import { SnapMessage } from "./SnapMessage"
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
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [showReportMessageDialog, setShowReportMessageDialog] = useState(false)
  const [selectedMessageId, setSelectedMessageId] = useState<Id<"messages"> | null>(null)
  const [reportReason, setReportReason] = useState("")
  const [reportDetails, setReportDetails] = useState("")
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [showCameraCapture, setShowCameraCapture] = useState(false)
  const [viewingSnapId, setViewingSnapId] = useState<Id<"messages"> | null>(null)
  const [isUploadingSnap, setIsUploadingSnap] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasScrolledInitially = useRef(false)

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
  const reportMessage = useMutation(api.messages.reportMessage)
  const sendSnap = useMutation(api.messages.sendSnap)
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl)

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversationId && currentUserId) {
      markRead({ conversationId, userId: currentUserId })
    }
  }, [conversationId, currentUserId, markRead])

  // Helper to scroll to bottom using scrollIntoView for proper fixed UI handling
  const scrollToBottom = (smooth = false) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'instant',
      block: 'end'
    })
  }

  // Reset scroll state when conversation changes
  useEffect(() => {
    hasScrolledInitially.current = false
  }, [conversationId])

  // Initial scroll - wait for first page to load, then multiple attempts to handle async rendering
  useLayoutEffect(() => {
    if (status !== "LoadingFirstPage" && messages && messages.length > 0 && !hasScrolledInitially.current) {
      hasScrolledInitially.current = true

      // Multiple scroll attempts as content renders
      scrollToBottom(false)
      const t1 = setTimeout(() => scrollToBottom(false), 0)
      const t2 = setTimeout(() => scrollToBottom(false), 50)
      const t3 = setTimeout(() => scrollToBottom(false), 150)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    }
  }, [messages, status])

  // Smooth scroll for new messages after initial load
  const lastMessageId = messages?.[0]?._id
  const prevLastMessageId = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!hasScrolledInitially.current) return

    // Only smooth scroll when a new message is added
    if (lastMessageId && prevLastMessageId.current && lastMessageId !== prevLastMessageId.current) {
      scrollToBottom(true)
    }
    prevLastMessageId.current = lastMessageId
  }, [lastMessageId])

  // Close GIF picker and attach menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showGifPicker && !(e.target as Element).closest('.gif-picker-container')) {
        setShowGifPicker(false)
      }
      if (showAttachMenu && !(e.target as Element).closest('.attach-menu-container')) {
        setShowAttachMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showGifPicker, showAttachMenu])

  // Detect keyboard open/close using visualViewport API
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const handleResize = () => {
      // If visual viewport is significantly smaller than window height, keyboard is likely open
      const keyboardOpen = viewport.height < window.innerHeight * 0.75
      setIsKeyboardOpen(keyboardOpen)
      if (keyboardOpen) {
        // Scroll to bottom when keyboard opens
        setTimeout(() => scrollToBottom(true), 50)
      }
    }

    viewport.addEventListener('resize', handleResize)
    return () => viewport.removeEventListener('resize', handleResize)
  }, [])

  // Scroll to bottom when input is focused (keyboard opens on mobile)
  const handleInputFocus = () => {
    // Small delay to let keyboard animation start
    setTimeout(() => scrollToBottom(true), 100)
    setTimeout(() => scrollToBottom(true), 300)
  }

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

  const handleSendSnap = async (blob: Blob, viewMode: "view_once" | "timed", duration?: number) => {
    setIsUploadingSnap(true)
    try {
      // Upload the image to Convex storage
      const uploadUrl = await generateUploadUrl()
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      })

      if (!response.ok) throw new Error("Upload failed")

      const { storageId } = await response.json()

      // Send the snap
      await sendSnap({
        conversationId,
        senderId: currentUserId,
        storageId,
        viewMode,
        duration,
      })

      setShowCameraCapture(false)
      toast.success("Snap sent!")
    } catch {
      toast.error("Failed to send snap")
    } finally {
      setIsUploadingSnap(false)
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

  const handleReportMessage = async () => {
    if (!selectedMessageId || !reportReason) return
    try {
      await reportMessage({
        reporterId: currentUserId,
        messageId: selectedMessageId,
        reason: reportReason,
        details: reportDetails || undefined,
      })
      setShowReportMessageDialog(false)
      setSelectedMessageId(null)
      setReportReason("")
      setReportDetails("")
      toast.success("Message reported successfully")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to report message"
      toast.error(message)
    }
  }

  const openReportMessageDialog = (messageId: Id<"messages">) => {
    setSelectedMessageId(messageId)
    setShowReportMessageDialog(true)
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
      {/* Header - fixed on mobile to stay visible with the app nav */}
      <div className="fixed top-14 left-0 right-0 z-10 flex items-center gap-3 p-3 border-b border-border bg-card/95 backdrop-blur-sm lg:sticky lg:top-0">
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
          {/* View their shared albums */}
          {albumSharingStatus?.theirSharedAlbums && albumSharingStatus.theirSharedAlbums.length > 0 && otherUserId && (
            <AlbumViewButton
              viewerUserId={currentUserId}
              ownerUserId={otherUserId}
              ownerName={conversation?.otherParticipant.name ?? "User"}
              sharedAlbums={albumSharingStatus.theirSharedAlbums}
            />
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

      {/* Spacer for fixed header on mobile */}
      <div className="h-[60px] shrink-0 lg:hidden" />

      {/* Spacer for fixed input on mobile (at bottom, will be added after ScrollArea) */}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" viewportRef={scrollContainerRef}>
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

                        {/* Message bubble with context menu for other's messages */}
                        {!isOwn ? (
                          <div className="max-w-[70%]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <div
                                className={cn(
                                  "cursor-pointer text-left",
                                  message.format === "gif" || message.format === "image" || message.format === "video"
                                    ? "rounded-xl overflow-hidden"
                                    : message.format === "album_share"
                                      ? "px-4 py-3 rounded-2xl bg-card border border-border rounded-bl-md"
                                      : "px-4 py-2 rounded-2xl bg-card border border-border rounded-bl-md"
                                )}
                              >
                                <MessageContent message={message} isOwn={isOwn} currentUserId={currentUserId} onSnapClick={setViewingSnapId} />
                                {showTime && (
                                  <div className={cn(
                                    "flex items-center gap-1 text-[10px] mt-1",
                                    message.format === "gif" || message.format === "image" || message.format === "video"
                                      ? "text-muted-foreground px-1"
                                      : "text-muted-foreground"
                                  )}>
                                    <span>{formatTime(message.sentAt)}</span>
                                  </div>
                                )}
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40">
                              <DropdownMenuItem
                                onClick={() => openReportMessageDialog(message._id)}
                                className="text-amber-600 focus:text-amber-600"
                              >
                                <Flag className="w-4 h-4 mr-2" />
                                Report message
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "max-w-[70%]",
                              message.format === "gif" || message.format === "image" || message.format === "video"
                                ? "rounded-xl overflow-hidden"
                                : message.format === "album_share"
                                  ? "px-4 py-3 rounded-2xl bg-card border border-border rounded-br-md"
                                  : "px-4 py-2 rounded-2xl bg-primary text-primary-foreground rounded-br-md"
                            )}
                          >
                            <MessageContent message={message} isOwn={isOwn} currentUserId={currentUserId} onSnapClick={setViewingSnapId} />
                            {(showTime || (isUltra && otherUserId && message.readAt?.[otherUserId])) && (
                              <div className={cn(
                                "flex items-center gap-1 text-[10px] mt-1",
                                message.format === "gif" || message.format === "image" || message.format === "video"
                                  ? "text-muted-foreground px-1"
                                  : "text-primary-foreground/70"
                              )}>
                                <span>{formatTime(message.sentAt)}</span>
                                {isUltra && otherUserId && message.readAt?.[otherUserId] && (
                                  <span className="flex items-center gap-0.5 text-blue-400">
                                    <CheckCheck className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spacer for fixed input and bottom nav on mobile - smaller when keyboard is open */}
        <div className={cn(
          "shrink-0 transition-all duration-200 lg:h-4",
          isKeyboardOpen ? "h-16" : "h-36"
        )} />
        {/* Scroll anchor for scrollIntoView */}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Message Input - fixed at bottom on mobile */}
      <form
        onSubmit={handleSendMessage}
        className="fixed bottom-16 left-0 right-0 z-10 flex items-center gap-2 p-3 border-t border-border bg-card/95 backdrop-blur-sm lg:sticky lg:bottom-0 lg:p-4"
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

        {/* Mobile: Combined paperclip button with attachment menu */}
        <div className="relative lg:hidden attach-menu-container">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={cn(
              "shrink-0 text-muted-foreground hover:text-primary",
              showAttachMenu && "text-primary bg-primary/10"
            )}
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          {/* Attachment menu popup */}
          {showAttachMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[140px]">
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false)
                  setShowCameraCapture(true)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
              >
                <Camera className="w-5 h-5 text-primary" />
                <span>Snap</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false)
                  // Trigger MediaUpload's picker
                  document.getElementById('mobile-media-upload')?.click()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors border-t border-border"
              >
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
                <span>Photo/Video</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAttachMenu(false)
                  setShowGifPicker(true)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors border-t border-border"
              >
                <Smile className="w-5 h-5 text-muted-foreground" />
                <span>GIF</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile MediaUpload - modal uses fixed positioning */}
        <div className="lg:hidden">
          <MediaUpload
            conversationId={conversationId}
            senderId={currentUserId}
            isUltra={isUltra}
            triggerId="mobile-media-upload"
            hideTrigger
          />
        </div>

        {/* Desktop: Camera/Snap button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowCameraCapture(true)}
          className="shrink-0 text-muted-foreground hover:text-primary hidden lg:flex"
          title="Send a disappearing photo"
        >
          <Camera className="w-5 h-5" />
        </Button>

        {/* Desktop: Separate Media Upload button */}
        <div className="hidden lg:block">
          <MediaUpload
            conversationId={conversationId}
            senderId={currentUserId}
            isUltra={isUltra}
          />
        </div>

        {/* Desktop: GIF Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowGifPicker(!showGifPicker)}
          className={cn(
            "shrink-0 text-muted-foreground hover:text-primary hidden lg:flex",
            showGifPicker && "text-primary bg-primary/10"
          )}
        >
          <Smile className="w-5 h-5" />
        </Button>

        <Input
          ref={inputRef}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onFocus={handleInputFocus}
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

      {/* Report Message Dialog */}
      <Dialog open={showReportMessageDialog} onOpenChange={(open) => {
        setShowReportMessageDialog(open)
        if (!open) {
          setSelectedMessageId(null)
          setReportReason("")
          setReportDetails("")
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Message</DialogTitle>
            <DialogDescription>
              Help us understand what's wrong with this message. Your report will be reviewed by our team.
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
                <option value="threats">Threats or Violence</option>
                <option value="hate_speech">Hate Speech</option>
                <option value="scam">Scam or Fraud</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional details (optional)</label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Tell us more about what's wrong with this message..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportMessageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReportMessage} disabled={!reportReason}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Capture for Snaps */}
      {showCameraCapture && (
        <CameraCapture
          onCapture={handleSendSnap}
          onClose={() => setShowCameraCapture(false)}
          isUploading={isUploadingSnap}
        />
      )}

      {/* Snap Viewer */}
      {viewingSnapId && (
        <SnapViewer
          messageId={viewingSnapId}
          viewerId={currentUserId}
          onClose={() => setViewingSnapId(null)}
        />
      )}

    </div>
  )
}

// Component to render different message types
function MessageContent({
  message,
  isOwn,
  currentUserId,
  onSnapClick,
}: {
  message: {
    _id: Id<"messages">
    content: string
    format: string
    storageId?: Id<"_storage">
    senderId: Id<"users">
    sender: { name: string }
    snapViewMode?: "view_once" | "timed"
    snapDuration?: number
    snapExpired?: boolean
    snapViewedAt?: number
  }
  isOwn: boolean
  currentUserId: Id<"users">
  onSnapClick?: (messageId: Id<"messages">) => void
}) {
  // For media messages with storage ID, we'd fetch the URL
  // For now, we'll handle the formats we have
  
  switch (message.format) {
    case "text":
      return (
        <p className="text-sm whitespace-pre-wrap break-words [word-break:break-word]">
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

    case "album_share":
      return (
        <AlbumShareMessage
          content={message.content}
          isOwn={isOwn}
          senderId={message.senderId}
          currentUserId={currentUserId}
          senderName={message.sender.name}
        />
      )

    case "snap":
      return (
        <SnapMessage
          messageId={message._id}
          viewerId={currentUserId}
          isOwn={isOwn}
          snapViewMode={message.snapViewMode}
          snapDuration={message.snapDuration}
          snapExpired={message.snapExpired}
          snapViewedAt={message.snapViewedAt}
          onClick={() => onSnapClick?.(message._id)}
        />
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
