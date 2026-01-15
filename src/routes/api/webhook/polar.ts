import { Webhooks } from '@polar-sh/tanstack-start'
import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!)

export const Route = createFileRoute('/api/webhook/polar')({
  server: {
    handlers: {
      POST: Webhooks({
        webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

        onSubscriptionActive: async (payload) => {
          const { customer, product } = payload.data
          const ultraProductId = process.env.VITE_PUBLIC_POLAR_ULTRA_PRODUCT_ID

          if (product.id === ultraProductId) {
            await convex.mutation(api.users.updateSubscription, {
              polarCustomerId: customer.id,
              customerEmail: customer.email,
              subscriptionTier: 'ultra',
              subscriptionStatus: 'active',
              polarSubscriptionId: payload.data.id,
            })
          }
        },

        onSubscriptionCanceled: async (payload) => {
          const { customer } = payload.data
          await convex.mutation(api.users.updateSubscription, {
            polarCustomerId: customer.id,
            customerEmail: customer.email,
            subscriptionTier: 'free',
            subscriptionStatus: 'canceled',
            polarSubscriptionId: payload.data.id,
          })
        },

        onSubscriptionRevoked: async (payload) => {
          const { customer } = payload.data
          await convex.mutation(api.users.updateSubscription, {
            polarCustomerId: customer.id,
            customerEmail: customer.email,
            subscriptionTier: 'free',
            subscriptionStatus: 'revoked',
            polarSubscriptionId: undefined,
          })
        },

        onCustomerCreated: async (payload) => {
          const { email, id: polarCustomerId } = payload.data
          // Link Polar customer to existing user by email
          await convex.mutation(api.users.linkPolarCustomer, {
            email,
            polarCustomerId,
          })
        },
      }),
    },
  },
})



