import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Ban, Clock, CheckCircle, XCircle } from "lucide-react"
import { useModerationNotifications } from "@/hooks/useModerationNotifications"
import { Id } from "../../../convex/_generated/dataModel"

interface ModerationNoticeProps {
  userId: Id<"users">
}

export function ModerationNotice({ userId }: ModerationNoticeProps) {
  const { notifications, markRead } = useModerationNotifications(userId)

  // Get the most important notification (ban > suspension > warning)
  const currentNotification = notifications[0]

  if (!currentNotification) {
    return null
  }

  const handleAcknowledge = async () => {
    await markRead(currentNotification._id)
  }

  const getIcon = () => {
    switch (currentNotification.type) {
      case "ban":
        return <Ban className="w-12 h-12 text-red-500" />
      case "suspension":
        return <Clock className="w-12 h-12 text-orange-500" />
      case "warning":
        return <AlertTriangle className="w-12 h-12 text-yellow-500" />
      case "appeal_accepted":
        return <CheckCircle className="w-12 h-12 text-green-500" />
      case "appeal_rejected":
        return <XCircle className="w-12 h-12 text-red-500" />
      default:
        return <AlertTriangle className="w-12 h-12 text-yellow-500" />
    }
  }

  const getTitle = () => {
    switch (currentNotification.type) {
      case "ban":
        return "Account Banned"
      case "suspension":
        return "Account Suspended"
      case "warning":
        return `Warning ${currentNotification.warningNumber ?? ""}`
      case "appeal_accepted":
        return "Appeal Accepted"
      case "appeal_rejected":
        return "Appeal Rejected"
      default:
        return "Account Notice"
    }
  }

  const getDescription = () => {
    switch (currentNotification.type) {
      case "ban":
        return "Your account has been permanently banned from the platform."
      case "suspension":
        const suspendedUntil = currentNotification.suspendedUntil
          ? new Date(currentNotification.suspendedUntil).toLocaleDateString()
          : "soon"
        return `Your account has been suspended until ${suspendedUntil}.`
      case "warning":
        return "You have received a warning for violating our community guidelines."
      case "appeal_accepted":
        return "Your appeal has been accepted. Your account restrictions have been lifted."
      case "appeal_rejected":
        return "Your appeal has been reviewed and rejected."
      default:
        return "There is an important notice about your account."
    }
  }

  const getBgColor = () => {
    switch (currentNotification.type) {
      case "ban":
        return "bg-red-500/10"
      case "suspension":
        return "bg-orange-500/10"
      case "warning":
        return "bg-yellow-500/10"
      case "appeal_accepted":
        return "bg-green-500/10"
      case "appeal_rejected":
        return "bg-red-500/10"
      default:
        return "bg-yellow-500/10"
    }
  }

  // Don't show dialog for bans/suspensions - those are handled by the main authenticated layout
  if (currentNotification.type === "ban" || currentNotification.type === "suspension") {
    return null
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className={`mx-auto p-4 rounded-full ${getBgColor()} mb-4`}>
            {getIcon()}
          </div>
          <DialogTitle className="text-xl">{getTitle()}</DialogTitle>
          <DialogDescription className="text-center">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        {currentNotification.reason && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground mb-1">Reason:</p>
            <p className="text-sm">{currentNotification.reason}</p>
          </div>
        )}

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleAcknowledge} className="w-full sm:w-auto">
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
