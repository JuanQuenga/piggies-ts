import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Send, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ConversationPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: Id<"users">
  storageId: Id<"_storage"> | null
  mediaFormat: "image" | "video"
  onSuccess: () => void
}

export function ConversationPickerDialog({
  open,
  onOpenChange,
  userId,
  storageId,
  mediaFormat,
  onSuccess,
}: ConversationPickerDialogProps) {
  const [selectedConversation, setSelectedConversation] = useState<Id<"conversations"> | null>(null)
  const [isSending, setIsSending] = useState(false)

  const conversations = useQuery(
    api.messages.listConversations,
    open ? { userId, paginationOpts: { numItems: 20, cursor: null } } : "skip"
  )
  const sendMessage = useMutation(api.messages.sendMessageToConversation)

  const handleSend = async () => {
    if (!selectedConversation || !storageId) return

    setIsSending(true)
    try {
      await sendMessage({
        conversationId: selectedConversation,
        senderId: userId,
        content: "",
        format: mediaFormat,
        storageId,
      })
      onSuccess()
      setSelectedConversation(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send media")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Send to Conversation</DialogTitle>
          <DialogDescription>
            Select a conversation to send this media to
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          {conversations === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.page.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.page.map((conversation) => (
                <button
                  key={conversation._id}
                  onClick={() => setSelectedConversation(conversation._id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                    selectedConversation === conversation._id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted"
                  )}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={conversation.otherParticipant.imageUrl} />
                    <AvatarFallback>
                      {conversation.otherParticipant.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{conversation.otherParticipant.name}</p>
                    {conversation.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage.format !== "text"
                          ? `Sent ${conversation.lastMessage.format}`
                          : conversation.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conversation.otherParticipant.isOnline && (
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!selectedConversation || isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
