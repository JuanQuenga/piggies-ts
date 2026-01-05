import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { AuthKitProvider } from '@workos/authkit-tanstack-react-start/client'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import { storeReferralCode } from '@/hooks/useCurrentUser'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Piggies',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
    ],
  }),

  shellComponent: RootDocument,
  component: RootComponent,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  // Capture referral code from URL and store in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const ref = urlParams.get('ref')
      if (ref) {
        storeReferralCode(ref)
      }
    }
  }, [])

  return (
    <AuthKitProvider>
      <Outlet />
      <Toaster
        position="top-center"
        richColors
        closeButton
        gap={8}
        toastOptions={{
          className: 'font-sans',
          style: {
            background: 'oklch(0.14 0 0)',
            border: '1px solid oklch(0.25 0 0)',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          },
          classNames: {
            toast: 'group',
            title: 'text-sm font-semibold text-foreground',
            description: 'text-sm text-muted-foreground',
            success: 'border-l-4 !border-l-green-500',
            error: 'border-l-4 !border-l-red-500',
            info: 'border-l-4 !border-l-blue-500',
            warning: 'border-l-4 !border-l-amber-500',
            closeButton: 'bg-transparent hover:bg-white/10 border-0 text-muted-foreground hover:text-foreground',
          },
        }}
      />
    </AuthKitProvider>
  )
}
