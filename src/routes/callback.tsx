import { createFileRoute } from '@tanstack/react-router'
import { handleCallbackRoute } from '@workos/authkit-tanstack-react-start'

export const Route = createFileRoute('/callback')({
  component: () => null,
  server: {
    handlers: {
      GET: handleCallbackRoute(),
    },
  },
})
