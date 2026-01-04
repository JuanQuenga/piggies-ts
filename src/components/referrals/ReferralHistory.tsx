import { Clock, Check, X, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useReferrals } from "@/hooks/useReferrals"

export function ReferralHistory() {
  const { referralHistory, isLoading } = useReferrals()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (referralHistory.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No referrals yet</p>
        <p className="text-sm">Share your code to start earning rewards!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {referralHistory.map((referral) => (
        <div
          key={referral._id}
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
        >
          {/* Avatar placeholder */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{referral.referredUserName}</p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(referral.createdAt)}
            </p>
          </div>

          {/* Status Badge */}
          {referral.status === "activated" && (
            <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
              <Check className="w-3 h-3 mr-1" />
              Activated
            </Badge>
          )}
          {referral.status === "pending" && (
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              <Clock className="w-3 h-3 mr-1" />
              {referral.daysUntilActivation
                ? `${referral.daysUntilActivation}d left`
                : "Pending"}
            </Badge>
          )}
          {referral.status === "expired" && (
            <Badge variant="outline" className="text-muted-foreground">
              <X className="w-3 h-3 mr-1" />
              Expired
            </Badge>
          )}
        </div>
      ))}
    </div>
  )
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""} ago`
  }
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
  }
  return "Just now"
}
