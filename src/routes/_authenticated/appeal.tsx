import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Scale,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Loader2,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/appeal')({
  component: AppealPage,
})

function AppealPage() {
  const navigate = useNavigate()
  const { user: convexUser, isLoading: userLoading } = useCurrentUser()

  const [reason, setReason] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if user can submit an appeal
  const canSubmitResult = useQuery(
    api.moderation.canSubmitAppeal,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  )

  // Get user's appeal history
  const appeals = useQuery(
    api.moderation.getUserAppeals,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  )

  const submitAppeal = useMutation(api.moderation.submitAppeal)

  // Determine appeal type based on user's current status
  const getAppealType = (): 'ban' | 'suspension' | 'warning' | null => {
    if (!convexUser) return null
    if (convexUser.isBanned) return 'ban'
    if (convexUser.isSuspended && convexUser.suspendedUntil && convexUser.suspendedUntil > Date.now()) {
      return 'suspension'
    }
    if ((convexUser.warningCount ?? 0) > 0) return 'warning'
    return null
  }

  const appealType = getAppealType()

  const handleSubmit = async () => {
    if (!convexUser?._id || !appealType || !reason.trim()) {
      toast.error('Please provide a reason for your appeal')
      return
    }

    setIsSubmitting(true)
    try {
      await submitAppeal({
        userId: convexUser._id,
        appealType,
        reason: reason.trim(),
        additionalInfo: additionalInfo.trim() || undefined,
      })
      toast.success('Appeal submitted successfully')
      setReason('')
      setAdditionalInfo('')
    } catch (error: unknown) {
      const err = error as { message?: string }
      toast.error(err.message || 'Failed to submit appeal')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
          label: 'Pending Review',
        }
      case 'under_review':
        return {
          icon: FileText,
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          label: 'Under Review',
        }
      case 'accepted':
        return {
          icon: CheckCircle,
          color: 'bg-green-500/10 text-green-500 border-green-500/20',
          label: 'Accepted',
        }
      case 'rejected':
        return {
          icon: XCircle,
          color: 'bg-red-500/10 text-red-500 border-red-500/20',
          label: 'Rejected',
        }
      default:
        return {
          icon: Clock,
          color: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
          label: status,
        }
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getAppealTypeLabel = (type: string) => {
    switch (type) {
      case 'ban':
        return 'Ban Appeal'
      case 'suspension':
        return 'Suspension Appeal'
      case 'warning':
        return 'Warning Appeal'
      default:
        return 'Appeal'
    }
  }

  if (userLoading || canSubmitResult === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/members' })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Scale className="w-4 h-4 text-primary" />
              </div>
              <h1 className="font-bold text-lg">Submit Appeal</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* No active moderation - can't appeal */}
        {!appealType && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Active Restrictions</h2>
            <p className="text-muted-foreground mb-6">
              Your account is in good standing. There's nothing to appeal at this time.
            </p>
            <Button onClick={() => navigate({ to: '/members' })}>Back to App</Button>
          </div>
        )}

        {/* Can submit appeal */}
        {appealType && canSubmitResult?.canSubmit && (
          <>
            {/* Info Card */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-500">
                    {appealType === 'ban'
                      ? 'Your account is banned'
                      : appealType === 'suspension'
                        ? 'Your account is suspended'
                        : 'You have active warnings'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    If you believe this action was taken in error, you can submit an appeal for review.
                    Please provide a clear explanation of why you believe the decision should be
                    reconsidered.
                  </p>
                </div>
              </div>
            </div>

            {/* Appeal Form */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6">
              <h3 className="font-semibold mb-4">Submit Your Appeal</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Appeal Type</label>
                  <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm">
                    {getAppealTypeLabel(appealType)}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Reason for Appeal <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why you believe this decision should be reconsidered..."
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] resize-none"
                    maxLength={1000}
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {reason.length}/1000
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Additional Information (Optional)</label>
                  <textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="Any additional context or evidence you'd like to provide..."
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                    maxLength={500}
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {additionalInfo.length}/500
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !reason.trim()}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Appeal
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Cannot submit - has pending/under_review appeal */}
        {appealType && !canSubmitResult?.canSubmit && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-500">Appeal Already Submitted</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {canSubmitResult?.reason}. You'll be notified when a decision is made.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Appeal History */}
        {appeals && appeals.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold mb-4">Appeal History</h3>
            <div className="space-y-4">
              {appeals.map((appeal) => {
                const status = getStatusBadge(appeal.status)
                const StatusIcon = status.icon
                return (
                  <div
                    key={appeal._id}
                    className="bg-card border border-border rounded-xl overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <span className="text-sm font-medium">
                            {getAppealTypeLabel(appeal.appealType)}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Submitted {formatDate(appeal.submittedAt)}
                          </p>
                        </div>
                        <span
                          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${status.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>

                      <div className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium text-foreground">Your reason:</span>{' '}
                        {appeal.reason}
                      </div>

                      {appeal.additionalInfo && (
                        <div className="text-sm text-muted-foreground mb-2">
                          <span className="font-medium text-foreground">Additional info:</span>{' '}
                          {appeal.additionalInfo}
                        </div>
                      )}

                      {appeal.adminResponse && (
                        <div
                          className={`mt-3 p-3 rounded-lg ${
                            appeal.status === 'accepted'
                              ? 'bg-green-500/10 border border-green-500/20'
                              : appeal.status === 'rejected'
                                ? 'bg-red-500/10 border border-red-500/20'
                                : 'bg-muted'
                          }`}
                        >
                          <span className="text-xs font-medium">Admin Response:</span>
                          <p className="text-sm mt-1">{appeal.adminResponse}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
