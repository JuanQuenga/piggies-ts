import { Sparkles } from 'lucide-react'
import { useSubscription } from '../hooks/useSubscription'
import { Button } from './ui/button'

export function UpgradeToUltra() {
  const { isUltra, checkoutUrl, portalUrl, isLoading } = useSubscription()

  if (isLoading) return null

  if (isUltra) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-sm font-medium text-white">
          <Sparkles className="h-3.5 w-3.5" />
          Ultra
        </span>
        {portalUrl && (
          <a href={portalUrl}>
            <Button variant="ghost" size="sm">
              Manage
            </Button>
          </a>
        )}
      </div>
    )
  }

  return (
    <a href={checkoutUrl ?? '#'}>
      <Button
        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
        size="sm"
      >
        <Sparkles className="mr-1.5 h-4 w-4" />
        Upgrade to Ultra
      </Button>
    </a>
  )
}

