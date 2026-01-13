import { createFileRoute, Outlet, useNavigate, Link, useLocation } from '@tanstack/react-router'
import { useAdmin } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Flag,
  Users,
  ArrowLeft,
  Shield,
} from 'lucide-react'
import { useEffect } from 'react'

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, isLoading } = useAdmin()

  // Redirect non-admins
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate({ to: '/nearby' })
    }
  }, [isAdmin, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center animate-pulse">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/reports', icon: Flag, label: 'Reports' },
    { to: '/admin/users', icon: Users, label: 'Users' },
  ]

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/nearby' })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-red-500" />
              </div>
              <h1 className="font-bold text-lg">Admin Panel</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Navigation */}
      <nav className="sticky top-14 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive(item.to)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
