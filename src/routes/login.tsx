import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAuth, getSignInUrl } from '@workos/authkit-tanstack-react-start'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/login')({
  loader: async () => {
    const { user } = await getAuth()

    // If already logged in, redirect to home
    if (user) {
      throw redirect({ to: '/' })
    }

    const signInUrl = await getSignInUrl()
    return { signInUrl }
  },
  component: LoginPage,
})

function LoginPage() {
  const { signInUrl } = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex flex-col items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full">
        {/* Logo and branding */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-pink-400 rounded-3xl flex items-center justify-center shadow-xl shadow-primary/25 rotate-3 hover:rotate-0 transition-transform duration-300">
              <img
                src="/pig-snout.svg"
                alt="Piggies"
                className="w-14 h-14 brightness-0 invert"
              />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
              Piggies
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              Where connections come naturally
            </p>
          </div>
        </div>

        {/* Login card */}
        <Card className="w-full border-0 shadow-2xl shadow-primary/10 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-base">
              Sign in to connect with your community
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-8 px-8">
            <a href={signInUrl} className="block">
              <Button
                size="lg"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                Continue with AuthKit
              </Button>
            </a>
            <p className="text-center text-muted-foreground text-sm mt-6">
              New here?{' '}
              <a href={signInUrl} className="text-primary font-medium hover:underline">
                Create an account
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-muted-foreground text-sm">
          By signing in, you agree to our{' '}
          <a href="#" className="text-primary hover:underline">Terms</a>
          {' '}and{' '}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}


