import { createFileRoute } from '@tanstack/react-router'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Scale,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Ban,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Id } from '../../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_authenticated/admin/appeals')({
  component: AppealsPage,
})

type AppealStatus = 'pending' | 'under_review' | 'accepted' | 'rejected'

function AppealsPage() {
  const { user } = useCurrentUser()
  const [statusFilter, setStatusFilter] = useState<AppealStatus | undefined>('pending')
  const [selectedAppealId, setSelectedAppealId] = useState<Id<'appeals'> | null>(null)
  const [adminResponse, setAdminResponse] = useState('')

  const appeals = useQuery(
    api.admin.getAllAppeals,
    user?._id ? { adminUserId: user._id, status: statusFilter } : 'skip'
  )

  const appealCounts = useQuery(
    api.admin.getAppealCounts,
    user?._id ? { adminUserId: user._id } : 'skip'
  )

  const updateAppealStatus = useMutation(api.admin.updateAppealStatus)

  const statusOptions: { value: AppealStatus | undefined; label: string; icon: typeof Scale }[] = [
    { value: 'pending', label: 'Pending', icon: Clock },
    { value: 'under_review', label: 'Under Review', icon: FileText },
    { value: 'accepted', label: 'Accepted', icon: CheckCircle },
    { value: 'rejected', label: 'Rejected', icon: XCircle },
    { value: undefined, label: 'All', icon: Scale },
  ]

  const handleUpdateStatus = async (appealId: Id<'appeals'>, status: 'under_review' | 'accepted' | 'rejected') => {
    if (!user?._id) return

    try {
      await updateAppealStatus({
        adminUserId: user._id,
        appealId,
        status,
        adminResponse: adminResponse.trim() || undefined,
      })
      toast.success(`Appeal ${status === 'accepted' ? 'accepted' : status === 'rejected' ? 'rejected' : 'marked as under review'}`)
      setSelectedAppealId(null)
      setAdminResponse('')
    } catch (error) {
      toast.error('Failed to update appeal')
    }
  }

  const getStatusBadge = (status: AppealStatus) => {
    const styles = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      under_review: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      accepted: 'bg-green-500/10 text-green-500 border-green-500/20',
      rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    }
    return styles[status]
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAppealTypeLabel = (type: string) => {
    switch (type) {
      case 'ban':
        return { label: 'Ban Appeal', color: 'text-red-500 bg-red-500/10' }
      case 'suspension':
        return { label: 'Suspension Appeal', color: 'text-orange-500 bg-orange-500/10' }
      case 'warning':
        return { label: 'Warning Appeal', color: 'text-yellow-500 bg-yellow-500/10' }
      default:
        return { label: 'Appeal', color: 'text-muted-foreground bg-muted' }
    }
  }

  const isLoading = appeals === undefined

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Appeals</h2>
        <p className="text-muted-foreground">Review and respond to user appeals</p>
      </div>

      {/* Stats Cards */}
      {appealCounts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold">{appealCounts.pending}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Under Review</span>
            </div>
            <p className="text-2xl font-bold">{appealCounts.under_review}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Accepted</span>
            </div>
            <p className="text-2xl font-bold">{appealCounts.accepted}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Rejected</span>
            </div>
            <p className="text-2xl font-bold">{appealCounts.rejected}</p>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {statusOptions.map((option) => (
          <button
            key={option.label}
            onClick={() => setStatusFilter(option.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              statusFilter === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <option.icon className="w-4 h-4" />
            {option.label}
          </button>
        ))}
      </div>

      {/* Appeals List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : appeals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Scale className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No {statusFilter ?? ''} appeals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appeals.map((appeal) => {
            const typeInfo = getAppealTypeLabel(appeal.appealType)
            return (
              <div
                key={appeal._id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Appeal Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={appeal.user?.imageUrl} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {appeal.user?.name ? getInitials(appeal.user.name) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {appeal.profile?.displayName || appeal.user?.name || 'Unknown User'}
                          </span>
                          {appeal.user?.isBanned && (
                            <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-500 rounded-full">
                              Banned
                            </span>
                          )}
                          {appeal.user?.isSuspended && (
                            <span className="px-2 py-0.5 text-xs bg-orange-500/10 text-orange-500 rounded-full">
                              Suspended
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{appeal.user?.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full border ${getStatusBadge(
                          appeal.status as AppealStatus
                        )}`}
                      >
                        {appeal.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Appeal Content */}
                <div className="p-4">
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-1">Reason for Appeal:</div>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {appeal.reason}
                    </p>
                  </div>

                  {appeal.additionalInfo && (
                    <div className="mb-4">
                      <div className="text-sm font-medium mb-1">Additional Information:</div>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {appeal.additionalInfo}
                      </p>
                    </div>
                  )}

                  {/* Original Context */}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
                    <span>Submitted: {formatDate(appeal.submittedAt)}</span>
                    {appeal.originalBannedReason && (
                      <span className="flex items-center gap-1">
                        <Ban className="w-3 h-3" />
                        Original reason: {appeal.originalBannedReason}
                      </span>
                    )}
                    {appeal.originalWarningCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Warnings at time: {appeal.originalWarningCount}
                      </span>
                    )}
                  </div>

                  {/* User History Summary */}
                  <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg mb-4">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span>
                        Current warnings:{' '}
                        <span className="font-medium">{appeal.user?.warningCount ?? 0}</span>
                      </span>
                      <span>
                        Status:{' '}
                        <span className="font-medium">
                          {appeal.user?.isBanned
                            ? 'Banned'
                            : appeal.user?.isSuspended
                              ? 'Suspended'
                              : 'Active'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin Response (if already reviewed) */}
                {appeal.adminResponse && (
                  <div className="p-4 border-t border-border bg-blue-500/5">
                    <div className="text-sm">
                      <span className="font-medium text-blue-500">Admin Response:</span>{' '}
                      {appeal.adminResponse}
                    </div>
                    {appeal.reviewedByUser && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Reviewed by: {appeal.reviewedByUser.name}
                        {appeal.reviewedAt && ` on ${formatDate(appeal.reviewedAt)}`}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Panel */}
                {(appeal.status === 'pending' || appeal.status === 'under_review') && (
                  <div className="p-4 border-t border-border">
                    {selectedAppealId === appeal._id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Response to User</label>
                          <textarea
                            value={adminResponse}
                            onChange={(e) => setAdminResponse(e.target.value)}
                            placeholder="Explain your decision to the user..."
                            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleUpdateStatus(appeal._id, 'accepted')}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept Appeal
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleUpdateStatus(appeal._id, 'rejected')}
                            className="flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject Appeal
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedAppealId(null)
                              setAdminResponse('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {appeal.status === 'pending' && (
                          <Button
                            variant="outline"
                            onClick={() => handleUpdateStatus(appeal._id, 'under_review')}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Mark as Under Review
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => setSelectedAppealId(appeal._id)}
                          className="flex-1"
                        >
                          Review & Respond
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
