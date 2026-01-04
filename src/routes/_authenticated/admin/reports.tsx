import { createFileRoute } from '@tanstack/react-router'
import { useAdminReports } from '@/hooks/useAdmin'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Flag,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Id } from '../../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_authenticated/admin/reports')({
  component: ReportsPage,
})

type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed"
type ActionType = "none" | "warning" | "suspension" | "ban"

function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>("pending")
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [actionNotes, setActionNotes] = useState("")
  const [selectedAction, setSelectedAction] = useState<ActionType>("none")
  const [suspensionDays, setSuspensionDays] = useState(7)

  const { reports, total, isLoading, updateReport } = useAdminReports(statusFilter)

  const statusOptions: { value: ReportStatus | undefined; label: string; icon: typeof Flag }[] = [
    { value: "pending", label: "Pending", icon: Clock },
    { value: "reviewed", label: "Reviewed", icon: Eye },
    { value: "resolved", label: "Resolved", icon: CheckCircle },
    { value: "dismissed", label: "Dismissed", icon: XCircle },
    { value: undefined, label: "All", icon: Flag },
  ]

  const handleUpdateReport = async (
    reportId: Id<"reportedUsers">,
    newStatus: ReportStatus
  ) => {
    try {
      await updateReport(reportId, newStatus, {
        adminNotes: actionNotes || undefined,
        actionTaken: selectedAction !== "none" ? selectedAction : undefined,
        suspensionDays: selectedAction === "suspension" ? suspensionDays : undefined,
      })
      toast.success(`Report ${newStatus}`)
      setSelectedReport(null)
      setActionNotes("")
      setSelectedAction("none")
    } catch (error) {
      toast.error("Failed to update report")
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-muted-foreground">Review and manage user reports</p>
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
        <span className="ml-auto text-sm text-muted-foreground">
          {total} report{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-5 w-48 bg-muted rounded mb-2" />
                  <div className="h-4 w-full bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
            <Flag className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No reports found</h3>
          <p className="text-muted-foreground">
            {statusFilter ? `No ${statusFilter} reports` : "No reports to display"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report._id}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              {/* Report Header */}
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Reported User */}
                  <Avatar className="w-12 h-12 border-2 border-red-500/20">
                    <AvatarImage src={report.reported?.imageUrl ?? undefined} />
                    <AvatarFallback className="bg-red-500/10 text-red-500">
                      {report.reported?.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {report.reported?.displayName || report.reported?.name || "Unknown User"}
                      </span>
                      {report.reported?.isBanned && (
                        <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-500 rounded-full">
                          Banned
                        </span>
                      )}
                      {report.reported?.isSuspended && (
                        <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-500 rounded-full">
                          Suspended
                        </span>
                      )}
                      {(report.reported?.warningCount ?? 0) > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 rounded-full">
                          {report.reported?.warningCount} warning{(report.reported?.warningCount ?? 0) !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{report.reported?.email}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusBadge(report.status)}`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(report.reportedAt)}
                    </span>
                  </div>
                </div>

                {/* Report Details */}
                <div className="mt-4 p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">Reason: {report.reason}</span>
                  </div>
                  {report.details && (
                    <p className="text-sm text-muted-foreground">{report.details}</p>
                  )}
                </div>

                {/* Reporter Info */}
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Reported by:</span>
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={report.reporter?.imageUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {report.reporter?.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{report.reporter?.name ?? "Unknown"}</span>
                </div>

                {/* Admin Notes (if reviewed) */}
                {report.adminNotes && (
                  <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                    <p className="text-sm">
                      <span className="font-medium">Admin Notes:</span> {report.adminNotes}
                    </p>
                    {report.actionTaken && report.actionTaken !== "none" && (
                      <p className="text-sm mt-1">
                        <span className="font-medium">Action:</span>{" "}
                        <span className="capitalize">{report.actionTaken}</span>
                      </p>
                    )}
                    {report.reviewer && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Reviewed by {report.reviewer.name} on {formatDate(report.reviewedAt!)}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {report.status === "pending" && (
                  <div className="mt-4">
                    {selectedReport === report._id ? (
                      <div className="space-y-4">
                        {/* Action Selection */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">Take Action</label>
                          <div className="flex flex-wrap gap-2">
                            {(["none", "warning", "suspension", "ban"] as ActionType[]).map((action) => (
                              <button
                                key={action}
                                onClick={() => setSelectedAction(action)}
                                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                  selectedAction === action
                                    ? action === "ban"
                                      ? "bg-red-500 text-white border-red-500"
                                      : action === "suspension"
                                      ? "bg-amber-500 text-white border-amber-500"
                                      : action === "warning"
                                      ? "bg-yellow-500 text-white border-yellow-500"
                                      : "bg-primary text-primary-foreground border-primary"
                                    : "bg-card border-border hover:border-primary/50"
                                }`}
                              >
                                {action === "none" ? "No Action" : action.charAt(0).toUpperCase() + action.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Suspension Days */}
                        {selectedAction === "suspension" && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Suspension Duration
                            </label>
                            <select
                              value={suspensionDays}
                              onChange={(e) => setSuspensionDays(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                            >
                              <option value={1}>1 day</option>
                              <option value={3}>3 days</option>
                              <option value={7}>7 days</option>
                              <option value={14}>14 days</option>
                              <option value={30}>30 days</option>
                            </select>
                          </div>
                        )}

                        {/* Notes */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">Admin Notes</label>
                          <textarea
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                            placeholder="Add notes about this decision..."
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg resize-none"
                            rows={2}
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedReport(null)
                              setActionNotes("")
                              setSelectedAction("none")
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleUpdateReport(report._id as Id<"reportedUsers">, "dismissed")}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Dismiss
                          </Button>
                          <Button
                            onClick={() => handleUpdateReport(report._id as Id<"reportedUsers">, "resolved")}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Resolve
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedReport(report._id)}
                        className="w-full"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review Report
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
