import { createFileRoute, Outlet, redirect, useNavigate, useLocation } from '@tanstack/react-router'
import { getAuth, getSignInUrl, signOut } from '@workos/authkit-tanstack-react-start'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useEffect } from 'react'
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav'
import { Ban, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated')({
  loader: async ({ location }) => {
    const { user } = await getAuth()

    if (!user) {
      const signInUrl = await getSignInUrl({
        data: { returnPathname: location.pathname || '/' },
      })
      throw redirect({ href: signInUrl })
    }

    return { user }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { user } = Route.useLoaderData()
  const { user: convexUser, isLoading } = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()

  // Fetch user profile to check onboarding status
  const profile = useQuery(
    api.users.getProfile,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  )

  // Redirect to onboarding if not complete
  useEffect(() => {
    if (isLoading || !convexUser || profile === undefined) return

    // Skip onboarding redirect if user is banned or suspended
    if (convexUser.isBanned || (convexUser.isSuspended && convexUser.suspendedUntil && convexUser.suspendedUntil > Date.now())) {
      return
    }

    const isOnboardingPage = location.pathname === '/onboarding'
    const needsOnboarding = profile && !profile.onboardingComplete

    if (needsOnboarding && !isOnboardingPage) {
      navigate({ to: '/onboarding' })
    } else if (!needsOnboarding && isOnboardingPage) {
      navigate({ to: '/home' })
    }
  }, [profile, convexUser, isLoading, location.pathname, navigate])

  // Show loading state while checking onboarding
  if (isLoading || profile === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center animate-pulse">
            <img src="/pig-snout.svg" alt="Loading" className="w-7 h-7 brightness-0 invert" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Check if user is banned
  if (convexUser?.isBanned) {
    return <BannedScreen reason={convexUser.bannedReason} bannedAt={convexUser.bannedAt} />
  }

  // Check if user is suspended (and suspension hasn't expired)
  if (convexUser?.isSuspended && convexUser.suspendedUntil && convexUser.suspendedUntil > Date.now()) {
    return <SuspendedScreen suspendedUntil={convexUser.suspendedUntil} />
  }

  // Hide bottom nav on certain pages
  const hideBottomNav = location.pathname === '/onboarding' || location.pathname.startsWith('/admin')

  return (
    <>
      <Outlet context={{ user }} />
      {!hideBottomNav && <MobileBottomNav />}
    </>
  )
}

// Banned user screen
function BannedScreen({ reason, bannedAt }: { reason?: string; bannedAt?: number }) {
  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ban className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Account Banned</h1>
        <p className="text-muted-foreground mb-6">
          Your account has been permanently banned from Piggies.
        </p>

        {reason && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-medium text-red-500 mb-1">Reason:</p>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>
        )}

        {bannedAt && (
          <p className="text-xs text-muted-foreground mb-6">
            Banned on {new Date(bannedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric"
            })}
          </p>
        )}

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            If you believe this was a mistake, please contact support.
          </p>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}

// Suspended user screen
function SuspendedScreen({ suspendedUntil }: { suspendedUntil: number }) {
  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  const formatDuration = (timestamp: number) => {
    const now = Date.now()
    const diff = timestamp - now
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} and ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Account Suspended</h1>
        <p className="text-muted-foreground mb-6">
          Your account has been temporarily suspended.
        </p>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-amber-500 mb-1">Suspension ends in:</p>
          <p className="text-lg font-semibold">{formatDuration(suspendedUntil)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(suspendedUntil).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit"
            })}
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">Why was I suspended?</p>
              <p className="text-xs text-muted-foreground">
                Suspensions are typically issued for violating community guidelines.
                Please review our terms of service before your suspension ends.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            If you believe this was a mistake, please contact support.
          </p>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}

