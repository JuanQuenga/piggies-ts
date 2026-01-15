import { Checkout } from '@polar-sh/tanstack-start'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/checkout')({
  server: {
    handlers: {
      GET: Checkout({
        accessToken: process.env.POLAR_ACCESS_TOKEN!,
        successUrl: process.env.POLAR_SUCCESS_URL!,
        server: process.env.POLAR_ENV === 'sandbox' ? 'sandbox' : 'production',
        theme: 'dark',
      }),
    },
  },
})



