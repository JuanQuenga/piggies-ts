import { createFileRoute, Outlet, redirect, useNavigate, useLocation } from '@tanstack/react-router'
import { getAuth, getSignInUrl } from '@workos/authkit-tanstack-react-start'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useEffect } from 'react'

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
  
  return <Outlet context={{ user }} />
}

