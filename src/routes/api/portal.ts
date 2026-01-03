import { CustomerPortal } from '@polar-sh/tanstack-start'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/portal')({
  server: {
    handlers: {
      GET: CustomerPortal({
        accessToken: process.env.POLAR_ACCESS_TOKEN!,
        getCustomerId: async (request: Request) => {
          // Get customerId from query params (passed from client)
          const url = new URL(request.url)
          const customerId = url.searchParams.get('customerId')
          return customerId ?? ''
        },
        server: process.env.POLAR_ENV === 'sandbox' ? 'sandbox' : 'production',
      }),
    },
  },
})

