import { useState } from "react"
import { Copy, Check, Share2, Gift, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useReferrals } from "@/hooks/useReferrals"
import { toast } from "sonner"

export function ReferralCard() {
  const {
    referralCode,
    referralLink,
    totalReferrals,
    pendingReferrals,
    activatedReferrals,
    creditsToNextReward,
    progressToNextReward,
    hasReferralUltra,
    referralUltraDaysRemaining,
    isLoading,
    generateCode,
  } = useReferrals()

  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleCopyCode = async () => {
    if (!referralCode) return
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      toast.success("Referral code copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy code")
    }
  }

  const handleCopyLink = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      toast.success("Referral link copied!")
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const handleShare = async () => {
    if (!referralLink) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Piggies!",
          text: "Join me on Piggies using my referral link!",
          url: referralLink,
        })
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== "AbortError") {
          handleCopyLink()
        }
      }
    } else {
      handleCopyLink()
    }
  }

  const handleGenerateCode = async () => {
    setIsGenerating(true)
    try {
      await generateCode()
      toast.success("Referral code generated!")
    } catch {
      toast.error("Failed to generate code")
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card border border-border p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4" />
        <div className="h-12 bg-muted rounded mb-4" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* Header with Ultra badge if earned */}
      <div className="bg-gradient-to-r from-primary/10 to-pink-500/10 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Invite Friends</h3>
          </div>
          {hasReferralUltra && referralUltraDaysRemaining && (
            <Badge variant="default" className="bg-gradient-to-r from-primary to-pink-500">
              <Clock className="w-3 h-3 mr-1" />
              {referralUltraDaysRemaining}d Ultra
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Refer 3 friends who stay active for 7 days to earn 1 month of Ultra free!
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Referral Code Section */}
        {referralCode ? (
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Your referral code</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/50 rounded-xl px-4 py-3 font-mono text-lg tracking-wider text-center font-bold">
                {referralCode}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Share Button */}
            <Button
              variant="default"
              className="w-full"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Invite Link
            </Button>
          </div>
        ) : (
          <Button
            variant="default"
            className="w-full"
            onClick={handleGenerateCode}
            disabled={isGenerating}
          >
            <Gift className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Get Your Referral Code"}
          </Button>
        )}

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress to next reward</span>
            <span className="font-medium">{progressToNextReward}/3</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-pink-500 transition-all duration-500"
              style={{ width: `${(progressToNextReward / 3) * 100}%` }}
            />
          </div>
          {creditsToNextReward > 0 && (
            <p className="text-xs text-muted-foreground">
              {creditsToNextReward} more referral{creditsToNextReward !== 1 ? "s" : ""} until your next free month!
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="flex items-center justify-center gap-1 text-lg font-bold">
              <Users className="w-4 h-4 text-primary" />
              {totalReferrals}
            </div>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="flex items-center justify-center gap-1 text-lg font-bold">
              <Clock className="w-4 h-4 text-yellow-500" />
              {pendingReferrals}
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <div className="flex items-center justify-center gap-1 text-lg font-bold">
              <Check className="w-4 h-4 text-green-500" />
              {activatedReferrals}
            </div>
            <p className="text-xs text-muted-foreground">Activated</p>
          </div>
        </div>
      </div>
    </div>
  )
}
