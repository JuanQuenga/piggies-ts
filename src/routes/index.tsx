import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAuth, getSignInUrl } from '@workos/authkit-tanstack-react-start'
import { Button } from '@/components/ui/button'
import { MapPin, Zap, Shield, MessageCircle, Users, ChevronRight } from 'lucide-react'

export const Route = createFileRoute('/')({
  loader: async () => {
    const { user } = await getAuth()
    
    // If authenticated, redirect to home feed
    if (user) {
      throw redirect({ to: '/members' })
    }

    const signInUrl = await getSignInUrl()
    return { signInUrl }
  },
  component: LandingPage,
})

// Sample nearby users for hero grid
const NEARBY_USERS = [
  { id: 1, name: 'Marcus', age: 28, distance: '0.2 mi', online: true, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=400&fit=crop' },
  { id: 2, name: 'Tyler', age: 24, distance: '0.5 mi', online: true, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop' },
  { id: 3, name: 'Jordan', age: 31, distance: '0.8 mi', online: false, image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=400&fit=crop' },
  { id: 4, name: 'Chris', age: 26, distance: '1.1 mi', online: true, image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&h=400&fit=crop' },
  { id: 5, name: 'Alex', age: 29, distance: '1.4 mi', online: false, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=400&fit=crop' },
  { id: 6, name: 'Sam', age: 27, distance: '1.8 mi', online: true, image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=400&fit=crop' },
  { id: 7, name: 'Drew', age: 32, distance: '2.1 mi', online: true, image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&h=400&fit=crop' },
  { id: 8, name: 'Riley', age: 25, distance: '2.5 mi', online: false, image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300&h=400&fit=crop' },
]

function LandingPage() {
  const { signInUrl } = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle grid pattern overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]" 
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} 
      />

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <img src="/pig-snout.svg" alt="Piggies" className="w-6 h-6 brightness-0 invert" />
              </div>
              <span className="text-2xl font-bold text-foreground tracking-tight">
                Piggies
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a href={signInUrl}>
                <Button variant="ghost" className="font-medium text-muted-foreground hover:text-foreground">
                  Log In
                </Button>
              </a>
              <a href={signInUrl}>
                <Button className="bg-primary hover:bg-primary/90 font-semibold glow-red">
                  Get Started
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Copy */}
            <div className="relative z-10 text-center lg:text-left">
              {/* Live indicator */}
              <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 mb-8">
                <span className="w-2 h-2 bg-online rounded-full online-indicator" />
                <span className="text-sm font-medium text-muted-foreground">
                  <span className="text-online font-bold">2,847</span> people online now
                </span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
                Connect.
                <br />
                <span className="text-primary">Right Now.</span>
              </h1>

              <p className="mt-6 text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Find people near you. Chat instantly. Meet in minutes. 
                Piggies is the fastest way to connect with real people around you.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a href={signInUrl}>
                  <Button 
                    size="lg" 
                    className="h-14 px-8 text-lg font-bold bg-primary hover:bg-primary/90 glow-red w-full sm:w-auto"
                  >
                    Join Free
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </a>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="h-14 px-8 text-lg font-semibold border-2 border-border hover:border-primary hover:text-primary"
                >
                  <MapPin className="w-5 h-5 mr-2" />
                  See Who's Near
                </Button>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0">
                {[
                  { value: '50K+', label: 'Active Users' },
                  { value: '10K+', label: 'Daily Matches' },
                  { value: '< 1mi', label: 'Avg Distance' },
                ].map((stat, i) => (
                  <div key={i} className="text-center lg:text-left">
                    <p className="text-2xl sm:text-3xl font-black text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Profile Grid Preview */}
            <div className="relative">
              {/* Glow effect behind grid */}
              <div className="absolute -inset-10 bg-primary/20 blur-[100px] rounded-full" />
              
              <div className="relative grid grid-cols-4 gap-2 sm:gap-3">
                {NEARBY_USERS.map((user, i) => (
                  <div 
                    key={user.id}
                    className="profile-card aspect-[3/4] rounded-lg sm:rounded-xl overflow-hidden cursor-pointer group"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <img 
                      src={user.image} 
                      alt={user.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Overlay info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 sm:p-3">
                      <div className="flex items-center gap-1.5">
                        {user.online && <span className="w-2 h-2 bg-online rounded-full online-indicator" />}
                        <p className="font-bold text-sm text-white truncate">{user.name}, {user.age}</p>
                      </div>
                      <p className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {user.distance}
                      </p>
                    </div>
                    {/* Online indicator (always visible) */}
                    {user.online && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-online rounded-full border-2 border-black online-indicator" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black">
              Why <span className="text-primary">Piggies</span>?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for real connections, not endless swiping.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MapPin,
                title: 'Location-First',
                description: 'See who\'s actually nearby. No more matching with people 100 miles away.',
              },
              {
                icon: Zap,
                title: 'Instant Chat',
                description: 'No waiting for matches. Message anyone, anytime. Real conversations, fast.',
              },
              {
                icon: Shield,
                title: 'Privacy Controls',
                description: 'You control who sees you. Go invisible, block freely, stay anonymous.',
              },
            ].map((feature, i) => (
              <div 
                key={i} 
                className="group p-8 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl p-8 sm:p-12 border border-primary/20">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex -space-x-3">
                    {NEARBY_USERS.slice(0, 5).map((user, i) => (
                      <img 
                        key={i}
                        src={user.image} 
                        alt=""
                        className="w-12 h-12 rounded-full border-2 border-background object-cover"
                      />
                    ))}
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-foreground">Join 50,000+ members</p>
                    <p className="text-muted-foreground">Already connecting</p>
                  </div>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                  Stop scrolling.
                  <br />
                  <span className="text-primary">Start meeting.</span>
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Real people. Real locations. Real connections. 
                  Download now and see who's around you.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 lg:justify-end">
                <a href={signInUrl} className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    className="h-16 px-10 text-lg font-bold bg-primary hover:bg-primary/90 glow-red w-full"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Join Piggies Free
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <img src="/pig-snout.svg" alt="Piggies" className="w-4 h-4 brightness-0 invert" />
              </div>
              <span className="font-bold text-muted-foreground">Piggies © 2024</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Safety</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
