import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getAuth, getSignInUrl } from '@workos/authkit-tanstack-react-start'

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
  
  return <Outlet context={{ user }} />
}

