import { createFileRoute } from '@tanstack/react-router'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Gavel,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Ban,
  Settings,
  ToggleLeft,
  ToggleRight,
  Edit,
  X,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Id } from '../../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_authenticated/admin/rules')({
  component: RulesPage,
})

type TriggerType = "warning_count" | "report_count"
type ActionType = "warning" | "suspension" | "ban"

interface ModerationRule {
  _id: Id<"moderationRules">
  name: string
  description?: string
  enabled: boolean
  triggerType: TriggerType
  threshold: number
  action: ActionType
  suspensionDays?: number
  createdAt: number
  updatedAt: number
}

function RulesPage() {
  const { user } = useCurrentUser()
  const [isCreating, setIsCreating] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<Id<"moderationRules"> | null>(null)

  // Form state for new/edit rule
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formEnabled, setFormEnabled] = useState(true)
  const [formTriggerType, setFormTriggerType] = useState<TriggerType>("warning_count")
  const [formThreshold, setFormThreshold] = useState(3)
  const [formAction, setFormAction] = useState<ActionType>("suspension")
  const [formSuspensionDays, setFormSuspensionDays] = useState(7)

  // Queries and mutations
  const rules = useQuery(
    api.admin.getModerationRules,
    user?._id ? { adminUserId: user._id } : "skip"
  ) as ModerationRule[] | undefined

  const createRule = useMutation(api.admin.createModerationRule)
  const updateRule = useMutation(api.admin.updateModerationRule)
  const deleteRule = useMutation(api.admin.deleteModerationRule)
  const seedRules = useMutation(api.admin.seedDefaultModerationRules)

  const resetForm = () => {
    setFormName("")
    setFormDescription("")
    setFormEnabled(true)
    setFormTriggerType("warning_count")
    setFormThreshold(3)
    setFormAction("suspension")
    setFormSuspensionDays(7)
    setIsCreating(false)
    setEditingRuleId(null)
  }

  const startEditing = (rule: ModerationRule) => {
    setEditingRuleId(rule._id)
    setFormName(rule.name)
    setFormDescription(rule.description || "")
    setFormEnabled(rule.enabled)
    setFormTriggerType(rule.triggerType)
    setFormThreshold(rule.threshold)
    setFormAction(rule.action)
    setFormSuspensionDays(rule.suspensionDays || 7)
    setIsCreating(false)
  }

  const handleCreate = async () => {
    if (!user?._id || !formName.trim()) {
      toast.error("Please enter a rule name")
      return
    }

    try {
      await createRule({
        adminUserId: user._id,
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        enabled: formEnabled,
        triggerType: formTriggerType,
        threshold: formThreshold,
        action: formAction,
        suspensionDays: formAction === "suspension" ? formSuspensionDays : undefined,
      })
      toast.success("Rule created")
      resetForm()
    } catch (error) {
      toast.error("Failed to create rule")
    }
  }

  const handleUpdate = async () => {
    if (!user?._id || !editingRuleId || !formName.trim()) {
      toast.error("Please enter a rule name")
      return
    }

    try {
      await updateRule({
        adminUserId: user._id,
        ruleId: editingRuleId,
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        enabled: formEnabled,
        triggerType: formTriggerType,
        threshold: formThreshold,
        action: formAction,
        suspensionDays: formAction === "suspension" ? formSuspensionDays : undefined,
      })
      toast.success("Rule updated")
      resetForm()
    } catch (error) {
      toast.error("Failed to update rule")
    }
  }

  const handleDelete = async (ruleId: Id<"moderationRules">) => {
    if (!user?._id) return

    try {
      await deleteRule({
        adminUserId: user._id,
        ruleId,
      })
      toast.success("Rule deleted")
    } catch (error) {
      toast.error("Failed to delete rule")
    }
  }

  const handleToggleEnabled = async (rule: ModerationRule) => {
    if (!user?._id) return

    try {
      await updateRule({
        adminUserId: user._id,
        ruleId: rule._id,
        enabled: !rule.enabled,
      })
      toast.success(rule.enabled ? "Rule disabled" : "Rule enabled")
    } catch (error) {
      toast.error("Failed to toggle rule")
    }
  }

  const handleSeedDefaults = async () => {
    if (!user?._id) return

    try {
      const result = await seedRules({ adminUserId: user._id })
      if (result.rulesCreated > 0) {
        toast.success(`${result.rulesCreated} default rules created`)
      } else {
        toast.info("Default rules already exist")
      }
    } catch (error) {
      toast.error("Failed to seed default rules")
    }
  }

  const getTriggerLabel = (type: TriggerType) => {
    return type === "warning_count" ? "Warning Count" : "Report Count"
  }

  const getActionIcon = (action: ActionType) => {
    switch (action) {
      case "warning":
        return AlertTriangle
      case "suspension":
        return Clock
      case "ban":
        return Ban
    }
  }

  const getActionLabel = (action: ActionType) => {
    switch (action) {
      case "warning":
        return "Issue Warning"
      case "suspension":
        return "Suspend User"
      case "ban":
        return "Ban User"
    }
  }

  const getActionColor = (action: ActionType) => {
    switch (action) {
      case "warning":
        return "text-yellow-500 bg-yellow-500/10"
      case "suspension":
        return "text-orange-500 bg-orange-500/10"
      case "ban":
        return "text-red-500 bg-red-500/10"
    }
  }

  const isLoading = rules === undefined

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Auto-Escalation Rules</h2>
          <p className="text-muted-foreground">
            Configure automatic moderation actions based on user behavior
          </p>
        </div>
        <div className="flex gap-2">
          {(!rules || rules.length === 0) && (
            <Button variant="outline" onClick={handleSeedDefaults}>
              <Settings className="w-4 h-4 mr-2" />
              Add Defaults
            </Button>
          )}
          <Button onClick={() => setIsCreating(true)} disabled={isCreating || editingRuleId !== null}>
            <Plus className="w-4 h-4 mr-2" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Gavel className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-500">How Auto-Escalation Works</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Rules are automatically checked when a user receives a warning. If the user's
              warning count matches a rule's threshold, the configured action is applied.
              Rules are processed in order of threshold (lowest first).
            </p>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingRuleId) && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              {editingRuleId ? "Edit Rule" : "Create New Rule"}
            </h3>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rule Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., 3 Warnings = 7-day Suspension"
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of what this rule does"
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Trigger Type</label>
                <select
                  value={formTriggerType}
                  onChange={(e) => setFormTriggerType(e.target.value as TriggerType)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="warning_count">Warning Count</option>
                  <option value="report_count">Report Count</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Threshold</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={formThreshold}
                  onChange={(e) => setFormThreshold(parseInt(e.target.value) || 1)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Action</label>
                <select
                  value={formAction}
                  onChange={(e) => setFormAction(e.target.value as ActionType)}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="warning">Issue Warning</option>
                  <option value="suspension">Suspend User</option>
                  <option value="ban">Ban User</option>
                </select>
              </div>

              {formAction === "suspension" && (
                <div>
                  <label className="text-sm font-medium">Suspension Duration</label>
                  <select
                    value={formSuspensionDays}
                    onChange={(e) => setFormSuspensionDays(parseInt(e.target.value))}
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
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormEnabled(!formEnabled)}
                className="flex items-center gap-2"
              >
                {formEnabled ? (
                  <ToggleRight className="w-6 h-6 text-primary" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {formEnabled ? "Rule Enabled" : "Rule Disabled"}
                </span>
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={editingRuleId ? handleUpdate : handleCreate} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                {editingRuleId ? "Save Changes" : "Create Rule"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Gavel className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No auto-escalation rules configured</p>
          <p className="text-sm mt-1">Click "Add Defaults" to create standard rules</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules
            .sort((a, b) => a.threshold - b.threshold)
            .map((rule) => {
              const ActionIcon = getActionIcon(rule.action)
              return (
                <div
                  key={rule._id}
                  className={`bg-card border rounded-xl overflow-hidden ${
                    rule.enabled ? "border-border" : "border-border/50 opacity-60"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getActionColor(rule.action)}`}>
                          <ActionIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{rule.name}</h4>
                            {!rule.enabled && (
                              <span className="px-2 py-0.5 text-xs bg-muted rounded-full">
                                Disabled
                              </span>
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {rule.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>
                              When <span className="font-medium text-foreground">{getTriggerLabel(rule.triggerType)}</span>{" "}
                              reaches <span className="font-medium text-foreground">{rule.threshold}</span>
                            </span>
                            <span>→</span>
                            <span className="font-medium text-foreground">
                              {getActionLabel(rule.action)}
                              {rule.action === "suspension" && rule.suspensionDays && (
                                <span className="text-muted-foreground"> ({rule.suspensionDays} days)</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleEnabled(rule)}
                          title={rule.enabled ? "Disable rule" : "Enable rule"}
                        >
                          {rule.enabled ? (
                            <ToggleRight className="w-5 h-5 text-primary" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(rule)}
                          disabled={isCreating || editingRuleId !== null}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rule._id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
