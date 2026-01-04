import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAdmin } from '@/hooks/useAdmin'
import {
  Users,
  Flag,
  UserX,
  Clock,
  AlertTriangle,
  TrendingUp,
  UserPlus,
} from 'lucide-react'

export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const navigate = useNavigate()
  const { stats, isLoading } = useAdmin()

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      label: 'Active (7d)',
      value: stats?.activeUsers ?? 0,
      icon: TrendingUp,
      color: 'bg-green-500/10 text-green-500',
    },
    {
      label: 'New Today',
      value: stats?.newUsersToday ?? 0,
      icon: UserPlus,
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      label: 'Pending Reports',
      value: stats?.pendingReports ?? 0,
      icon: Flag,
      color: 'bg-orange-500/10 text-orange-500',
      action: () => navigate({ to: '/admin/reports' }),
      urgent: (stats?.pendingReports ?? 0) > 0,
    },
    {
      label: 'Reports Today',
      value: stats?.reportsToday ?? 0,
      icon: AlertTriangle,
      color: 'bg-yellow-500/10 text-yellow-500',
    },
    {
      label: 'Total Reports',
      value: stats?.totalReports ?? 0,
      icon: Flag,
      color: 'bg-gray-500/10 text-gray-500',
    },
    {
      label: 'Banned Users',
      value: stats?.bannedUsers ?? 0,
      icon: UserX,
      color: 'bg-red-500/10 text-red-500',
    },
    {
      label: 'Suspended',
      value: stats?.suspendedUsers ?? 0,
      icon: Clock,
      color: 'bg-amber-500/10 text-amber-500',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your platform's moderation status</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 animate-pulse">
              <div className="h-10 w-10 bg-muted rounded-xl mb-3" />
              <div className="h-8 w-16 bg-muted rounded mb-1" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <button
              key={stat.label}
              onClick={stat.action}
              disabled={!stat.action}
              className={`bg-card rounded-2xl border border-border p-4 text-left transition-all ${
                stat.action ? 'hover:border-primary/50 hover:shadow-lg cursor-pointer' : ''
              } ${stat.urgent ? 'ring-2 ring-orange-500/50' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate({ to: '/admin/reports' })}
            className="bg-card rounded-2xl border border-border p-6 text-left hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  Review Reports
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats?.pendingReports ?? 0} pending reports need your attention
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <Flag className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate({ to: '/admin/users' })}
            className="bg-card rounded-2xl border border-border p-6 text-left hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  Manage Users
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Search, review, and moderate user accounts
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">System Status</h3>
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm">All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  )
}
