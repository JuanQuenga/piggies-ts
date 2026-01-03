API Routes
Route Purpose
/api/checkout Redirects to Polar checkout with the Ultra product
/api/portal Customer portal for managing subscriptions
/api/webhook/polar Handles subscription lifecycle events

Schema Updates
Added to users table:
polarCustomerId - Links user to Polar customer
polarSubscriptionId - Active subscription ID
subscriptionTier - "free" | "pro" | "ultra"
subscriptionStatus - "active" | "canceled" | "revoked"

New Hooks & Components
useSubscription() - Check subscription status, get checkout/portal URLs
<UpgradeToUltra /> - Ready-to-use upgrade button with Ultra badge

Required .env.local
POLAR_ACCESS_TOKEN=your_access_tokenPOLAR_SUCCESS_URL=http://localhost:3000/homePOLAR_WEBHOOK_SECRET=your_webhook_secretPOLAR_ENV=sandboxVITE_PUBLIC_POLAR_ULTRA_PRODUCT_ID=your_ultra_product_idVITE_PUBLIC_POLAR_PRO_PRODUCT_ID=your_pro_product_idVITE_CONVEX_URL=your_convex_url

Usage
import { UpgradeToUltra } from '@/components/UpgradeToUltra'// In your nav/profile:<UpgradeToUltra />// Or use the hook directly:const { isUltra, checkoutUrl } = useSubscription()

Next steps:
Add your env variables to .env.local
Run bunx convex dev to regenerate types
Set up the Polar webhook endpoint pointing to /api/webhook/polar
