import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ReferralCard } from "@/components/referrals/ReferralCard"
import { ReferralHistory } from "@/components/referrals/ReferralHistory"
import { ArrowLeft, Gift, Sparkles, Users, Clock } from "lucide-react"

export const Route = createFileRoute("/_authenticated/referrals")({
  component: ReferralsPage,
})

function ReferralsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/settings" })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg">Invite Friends</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-32 space-y-6">
        {/* Referral Card */}
        <ReferralCard />

        {/* How It Works Section */}
        <section className="rounded-2xl bg-card border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4">How it works</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">1. Share your code</p>
                <p className="text-sm text-muted-foreground">
                  Send your unique referral code or link to friends
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">2. Friends join & stay active</p>
                <p className="text-sm text-muted-foreground">
                  When they sign up and use Piggies for 7 days, your referral counts
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">3. Wait for activation</p>
                <p className="text-sm text-muted-foreground">
                  After 7 days of activity, the referral is activated
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-pink-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium">4. Earn free Ultra!</p>
                <p className="text-sm text-muted-foreground">
                  Every 3 activated referrals = 1 month of Piggies Ultra free. Rewards stack!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Referral History Section */}
        <section className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Your referrals</h3>
          </div>
          <div className="p-4">
            <ReferralHistory />
          </div>
        </section>
      </main>
    </div>
  )
}
