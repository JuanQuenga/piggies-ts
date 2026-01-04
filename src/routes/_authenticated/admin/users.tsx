import { createFileRoute } from '@tanstack/react-router'
import { useAdminUsers, useAdminUserDetails } from '@/hooks/useAdmin'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Users,
  Search,
  Ban,
  Clock,
  AlertTriangle,
  Shield,
  X,
  UserX,
  CheckCircle,
  Eye,
  Flag,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Id } from '../../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_authenticated/admin/users')({
  component: UsersPage,
})

type UserFilter = "all" | "banned" | "suspended" | "warned" | "admin"

function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<UserFilter>("all")
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null)
  const [showBanDialog, setShowBanDialog] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [banReason, setBanReason] = useState("")
  const [suspensionDays, setSuspensionDays] = useState(7)

  const { users, total, isLoading, banUser, unbanUser, suspendUser, unsuspendUser, warnUser, clearWarnings, toggleAdmin } = useAdminUsers({
    search: searchQuery || undefined,
    filter: filter,
  })

  const { user: selectedUserDetails, isLoading: detailsLoading } = useAdminUserDetails(
    selectedUserId ?? undefined
  )

  const filterOptions: { value: UserFilter; label: string; icon: typeof Users }[] = [
    { value: "all", label: "All Users", icon: Users },
    { value: "banned", label: "Banned", icon: UserX },
    { value: "suspended", label: "Suspended", icon: Clock },
    { value: "warned", label: "Warned", icon: AlertTriangle },
    { value: "admin", label: "Admins", icon: Shield },
  ]

  const handleBan = async () => {
    if (!selectedUserId || !banReason) return
    try {
      await banUser(selectedUserId, banReason)
      toast.success("User banned successfully")
      setShowBanDialog(false)
      setBanReason("")
    } catch (error) {
      toast.error("Failed to ban user")
    }
  }

  const handleUnban = async (userId: Id<"users">) => {
    try {
      await unbanUser(userId)
      toast.success("User unbanned successfully")
    } catch (error) {
      toast.error("Failed to unban user")
    }
  }

  const handleSuspend = async () => {
    if (!selectedUserId) return
    try {
      await suspendUser(selectedUserId, suspensionDays)
      toast.success(`User suspended for ${suspensionDays} days`)
      setShowSuspendDialog(false)
    } catch (error) {
      toast.error("Failed to suspend user")
    }
  }

  const handleUnsuspend = async (userId: Id<"users">) => {
    try {
      await unsuspendUser(userId)
      toast.success("User suspension lifted")
    } catch (error) {
      toast.error("Failed to unsuspend user")
    }
  }

  const handleWarn = async (userId: Id<"users">) => {
    try {
      const result = await warnUser(userId)
      toast.success(`Warning issued (${result?.newCount} total)`)
    } catch (error) {
      toast.error("Failed to issue warning")
    }
  }

  const handleClearWarnings = async (userId: Id<"users">) => {
    try {
      await clearWarnings(userId)
      toast.success("Warnings cleared")
    } catch (error) {
      toast.error("Failed to clear warnings")
    }
  }

  const handleToggleAdmin = async (userId: Id<"users">, makeAdmin: boolean) => {
    try {
      await toggleAdmin(userId, makeAdmin)
      toast.success(makeAdmin ? "Admin access granted" : "Admin access revoked")
    } catch (error) {
      toast.error("Failed to update admin status")
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
        <p className="text-muted-foreground">Search, review, and moderate user accounts</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <option.icon className="w-4 h-4" />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        {total} user{total !== 1 ? "s" : ""} found
      </p>

      {/* Users Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Users List */}
        <div className="space-y-3">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-muted rounded mb-1" />
                    <div className="h-4 w-48 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No users found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try a different search term" : "No users match the selected filter"}
              </p>
            </div>
          ) : (
            users.map((user) => (
              <button
                key={user._id}
                onClick={() => setSelectedUserId(user._id as Id<"users">)}
                className={`w-full bg-card rounded-xl border p-4 text-left transition-all hover:border-primary/50 ${
                  selectedUserId === user._id ? "border-primary ring-2 ring-primary/20" : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.imageUrl ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    {user.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">
                        {user.displayName || user.name}
                      </span>
                      {user.isAdmin && (
                        <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                      {user.subscriptionTier === "ultra" && (
                        <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {user.isBanned && (
                      <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-500 rounded-full">
                        Banned
                      </span>
                    )}
                    {user.isSuspended && (
                      <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-500 rounded-full">
                        Suspended
                      </span>
                    )}
                    {user.warningCount > 0 && !user.isBanned && !user.isSuspended && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 rounded-full">
                        {user.warningCount} warn
                      </span>
                    )}
                    {user.reportCount > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-orange-500/10 text-orange-500 rounded-full flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        {user.reportCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* User Details Panel */}
        <div className="lg:sticky lg:top-32 h-fit">
          {selectedUserId ? (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {detailsLoading || !selectedUserDetails ? (
                <div className="p-6 animate-pulse">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 bg-muted rounded-full" />
                    <div>
                      <div className="h-6 w-40 bg-muted rounded mb-2" />
                      <div className="h-4 w-56 bg-muted rounded" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* User Header */}
                  <div className="p-6 border-b border-border">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={selectedUserDetails.imageUrl ?? undefined} />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                          {selectedUserDetails.name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold">
                            {selectedUserDetails.profile?.displayName || selectedUserDetails.name}
                          </h3>
                          {selectedUserDetails.isAdmin && (
                            <Shield className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <p className="text-muted-foreground">{selectedUserDetails.email}</p>
                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <span className="text-muted-foreground">Joined:</span>
                          <span>{formatDate(selectedUserDetails.createdAt)}</span>
                        </div>
                        {selectedUserDetails.lastActive && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Last active:</span>
                            <span>{formatRelativeTime(selectedUserDetails.lastActive)}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedUserId(null)}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {selectedUserDetails.isBanned && (
                        <div className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-sm">
                          <UserX className="w-4 h-4 inline mr-1" />
                          Banned: {selectedUserDetails.bannedReason}
                        </div>
                      )}
                      {selectedUserDetails.isSuspended && selectedUserDetails.suspendedUntil && (
                        <div className="px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-lg text-sm">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Suspended until {formatDate(selectedUserDetails.suspendedUntil)}
                        </div>
                      )}
                      {selectedUserDetails.warningCount > 0 && (
                        <div className="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg text-sm">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          {selectedUserDetails.warningCount} warning{selectedUserDetails.warningCount !== 1 ? "s" : ""}
                        </div>
                      )}
                      {selectedUserDetails.subscriptionTier && (
                        <div className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm capitalize">
                          <Sparkles className="w-4 h-4 inline mr-1" />
                          {selectedUserDetails.subscriptionTier}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Info */}
                  {selectedUserDetails.profile && (
                    <div className="p-6 border-b border-border">
                      <h4 className="font-semibold mb-3">Profile</h4>
                      <div className="space-y-2 text-sm">
                        {selectedUserDetails.profile.age && (
                          <p>
                            <span className="text-muted-foreground">Age:</span>{" "}
                            {selectedUserDetails.profile.age}
                          </p>
                        )}
                        {selectedUserDetails.profile.bio && (
                          <p>
                            <span className="text-muted-foreground">Bio:</span>{" "}
                            {selectedUserDetails.profile.bio}
                          </p>
                        )}
                        {selectedUserDetails.profile.lookingFor && (
                          <p>
                            <span className="text-muted-foreground">Looking for:</span>{" "}
                            {selectedUserDetails.profile.lookingFor}
                          </p>
                        )}
                        {selectedUserDetails.profile.interests && selectedUserDetails.profile.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selectedUserDetails.profile.interests.map((interest) => (
                              <span key={interest} className="px-2 py-0.5 bg-muted rounded text-xs">
                                {interest}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Profile Photos */}
                      {selectedUserDetails.profile.profilePhotoUrls && selectedUserDetails.profile.profilePhotoUrls.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground mb-2">Photos:</p>
                          <div className="flex gap-2 overflow-x-auto">
                            {selectedUserDetails.profile.profilePhotoUrls.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`Profile ${i + 1}`}
                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Report Stats */}
                  <div className="p-6 border-b border-border">
                    <h4 className="font-semibold mb-3">Report History</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{selectedUserDetails.reportsAgainstCount}</p>
                        <p className="text-muted-foreground">Reports received</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{selectedUserDetails.reportsMadeCount}</p>
                        <p className="text-muted-foreground">Reports made</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-6">
                    <h4 className="font-semibold mb-3">Actions</h4>
                    <div className="space-y-2">
                      {/* Warning Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleWarn(selectedUserId)}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
                          Issue Warning
                        </Button>
                        {selectedUserDetails.warningCount > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleClearWarnings(selectedUserId)}
                          >
                            Clear Warnings
                          </Button>
                        )}
                      </div>

                      {/* Suspension Actions */}
                      {selectedUserDetails.isSuspended ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleUnsuspend(selectedUserId)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                          Lift Suspension
                        </Button>
                      ) : !selectedUserDetails.isBanned && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setShowSuspendDialog(true)
                          }}
                        >
                          <Clock className="w-4 h-4 mr-2 text-amber-500" />
                          Suspend User
                        </Button>
                      )}

                      {/* Ban Actions */}
                      {selectedUserDetails.isBanned ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleUnban(selectedUserId)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                          Unban User
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => setShowBanDialog(true)}
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Ban User
                        </Button>
                      )}

                      {/* Admin Toggle */}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleToggleAdmin(selectedUserId, !selectedUserDetails.isAdmin)}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {selectedUserDetails.isAdmin ? "Remove Admin" : "Make Admin"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Select a user</h3>
              <p className="text-muted-foreground">
                Click on a user to view details and take moderation actions
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ban Dialog */}
      {showBanDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Ban User</h3>
            <p className="text-muted-foreground mb-4">
              This will permanently ban the user from accessing the platform.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Ban Reason</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter the reason for banning..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowBanDialog(false)
                  setBanReason("")
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600"
                onClick={handleBan}
                disabled={!banReason.trim()}
              >
                <Ban className="w-4 h-4 mr-2" />
                Ban User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Dialog */}
      {showSuspendDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Suspend User</h3>
            <p className="text-muted-foreground mb-4">
              This will temporarily suspend the user's account.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Suspension Duration</label>
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
                <option value={90}>90 days</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSuspendDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600"
                onClick={handleSuspend}
              >
                <Clock className="w-4 h-4 mr-2" />
                Suspend User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
