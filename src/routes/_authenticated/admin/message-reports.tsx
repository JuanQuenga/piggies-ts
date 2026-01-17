import { createFileRoute } from '@tanstack/react-router'
import { useAdminMessageReports } from '@/hooks/useAdmin'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { Id } from '../../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_authenticated/admin/message-reports')({
  component: MessageReportsPage,
})

type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed"
type ActionType = "none" | "message_hidden" | "user_warning" | "user_suspension" | "user_ban"

function MessageReportsPage() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>("pending")
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [actionNotes, setActionNotes] = useState("")
  const [selectedAction, setSelectedAction] = useState<ActionType>("none")
  const [suspensionDays, setSuspensionDays] = useState(7)

  const { reports, total, isLoading, updateReport, hideMessage, unhideMessage } = useAdminMessageReports(statusFilter)

  const statusOptions: { value: ReportStatus | undefined; label: string; icon: typeof MessageSquare }[] = [
    { value: "pending", label: "Pending", icon: Clock },
    { value: "reviewed", label: "Reviewed", icon: Eye },
    { value: "resolved", label: "Resolved", icon: CheckCircle },
    { value: "dismissed", label: "Dismissed", icon: XCircle },
    { value: undefined, label: "All", icon: MessageSquare },
  ]

  const handleUpdateReport = async (
    reportId: Id<"reportedMessages">,
    newStatus: ReportStatus
  ) => {
    try {
      await updateReport(reportId, newStatus, {
        adminNotes: actionNotes || undefined,
        actionTaken: selectedAction !== "none" ? selectedAction : undefined,
        suspensionDays: selectedAction === "user_suspension" ? suspensionDays : undefined,
      })
      toast.success(`Report ${newStatus}`)
      setSelectedReport(null)
      setActionNotes("")
      setSelectedAction("none")
    } catch (error) {
      toast.error("Failed to update report")
    }
  }

  const handleHideMessage = async (messageId: Id<"messages">) => {
    try {
      await hideMessage(messageId, "Hidden by admin")
      toast.success("Message hidden")
    } catch (error) {
      toast.error("Failed to hide message")
    }
  }

  const handleUnhideMessage = async (messageId: Id<"messages">) => {
    try {
      await unhideMessage(messageId)
      toast.success("Message unhidden")
    } catch (error) {
      toast.error("Failed to unhide message")
    }
  }

  const getStatusBadge = (status: ReportStatus) => {
    const styles = {
      pending: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      reviewed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      resolved: "bg-green-500/10 text-green-500 border-green-500/20",
      dismissed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    }
    return styles[status]
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Message Reports</h2>
        <p className="text-muted-foreground">Review and manage reported messages</p>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {statusOptions.map((option) => (
          <button
            key={option.label}
            onClick={() => setStatusFilter(option.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              statusFilter === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <option.icon className="w-4 h-4" />
            {option.label}
          </button>
        ))}
        <div className="ml-auto text-sm text-muted-foreground">
          {total} report{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No {statusFilter ?? ""} message reports</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report._id}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              {/* Report Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={report.messageSender?.imageUrl} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {report.messageSender?.name ? getInitials(report.messageSender.name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {report.messageSender?.displayName || report.messageSender?.name || "Unknown User"}
                        </span>
                        {report.messageSender?.isBanned && (
                          <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-500 rounded-full">
                            Banned
                          </span>
                        )}
                        {report.messageSender?.isSuspended && (
                          <span className="px-2 py-0.5 text-xs bg-orange-500/10 text-orange-500 rounded-full">
                            Suspended
                          </span>
                        )}
                        {(report.messageSender?.warningCount ?? 0) > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 rounded-full">
                            {report.messageSender?.warningCount} warning{report.messageSender?.warningCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Message sender
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full border ${getStatusBadge(
                        report.status as ReportStatus
                      )}`}
                    >
                      {report.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(report.reportedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reported Message Content */}
              <div className="p-4 bg-muted/30">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Reported Message:
                    </div>
                    {report.message ? (
                      <div className="relative">
                        <div className={`p-3 rounded-lg border ${report.message.isHidden ? 'bg-red-500/5 border-red-500/20' : 'bg-card border-border'}`}>
                          {report.message.isHidden && (
                            <div className="flex items-center gap-1 text-xs text-red-500 mb-2">
                              <EyeOff className="w-3 h-3" />
                              <span>Message hidden</span>
                            </div>
                          )}
                          {report.message.format === "text" ? (
                            <p className="text-sm whitespace-pre-wrap">{report.message.content}</p>
                          ) : report.message.format === "image" ? (
                            <span className="text-sm text-muted-foreground">[Image]</span>
                          ) : report.message.format === "video" ? (
                            <span className="text-sm text-muted-foreground">[Video]</span>
                          ) : report.message.format === "gif" ? (
                            <img src={report.message.content} alt="GIF" className="max-w-xs rounded" />
                          ) : (
                            <p className="text-sm">{report.message.content}</p>
                          )}
                        </div>
                        <div className="mt-2 flex gap-2">
                          {report.message.isHidden ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnhideMessage(report.message!._id)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Unhide
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleHideMessage(report.message!._id)}
                            >
                              <EyeOff className="w-3 h-3 mr-1" />
                              Hide Message
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Message deleted</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Report Reason */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">
                    Reason: <span className="text-orange-500">{report.reason}</span>
                  </span>
                </div>
                {report.details && (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    {report.details}
                  </p>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  Reported by: {report.reporter?.name || "Unknown"}
                </div>
              </div>

              {/* Admin Notes & Actions */}
              {report.adminNotes && (
                <div className="p-4 border-t border-border bg-blue-500/5">
                  <div className="text-sm">
                    <span className="font-medium text-blue-500">Admin Notes:</span>{" "}
                    {report.adminNotes}
                  </div>
                  {report.actionTaken && report.actionTaken !== "none" && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Action taken: {report.actionTaken.replace(/_/g, " ")}
                    </div>
                  )}
                </div>
              )}

              {/* Action Panel */}
              {report.status === "pending" && (
                <div className="p-4 border-t border-border">
                  {selectedReport === report._id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Take Action</label>
                        <select
                          value={selectedAction}
                          onChange={(e) => setSelectedAction(e.target.value as ActionType)}
                          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="none">No action on user</option>
                          <option value="message_hidden">Hide message only</option>
                          <option value="user_warning">Issue warning</option>
                          <option value="user_suspension">Suspend user</option>
                          <option value="user_ban">Ban user</option>
                        </select>
                      </div>

                      {selectedAction === "user_suspension" && (
                        <div>
                          <label className="text-sm font-medium">Suspension Duration</label>
                          <select
                            value={suspensionDays}
                            onChange={(e) => setSuspensionDays(Number(e.target.value))}
                            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value={1}>1 day</option>
                            <option value={3}>3 days</option>
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                            <option value={90}>90 days</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium">Admin Notes</label>
                        <textarea
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          placeholder="Add notes about your decision..."
                          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdateReport(report._id, "resolved")}
                          className="flex-1"
                        >
                          Resolve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleUpdateReport(report._id, "dismissed")}
                          className="flex-1"
                        >
                          Dismiss
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSelectedReport(null)
                            setActionNotes("")
                            setSelectedAction("none")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setSelectedReport(report._id)}
                      className="w-full"
                    >
                      Review Report
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
