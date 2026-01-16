import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { toast } from 'sonner'
import {
  Bell,
  Shield,
  Eye,
  MapPin,
  Moon,
  Smartphone,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Sparkles,
  CreditCard,
  Trash2,
  Lock,
  Globe,
  ImageIcon,
  Users,
  Gift,
  User,
} from 'lucide-react'
import { useReferrals } from '@/hooks/useReferrals'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})

type SettingItem = {
  icon: React.ReactNode
  label: string
  description?: string
  action?: () => void
  rightElement?: React.ReactNode
  danger?: boolean
}

type SettingSection = {
  title: string
  items: SettingItem[]
}

function SettingsPage() {
  const navigate = useNavigate()
  const { user: workosUser, signOut } = useAuth()
  const { user: convexUser } = useCurrentUser()
  const { isUltra, portalUrl, checkoutUrl } = useSubscription()
  const { activatedReferrals, hasReferralUltra, referralUltraDaysRemaining } = useReferrals()
  const updatePreferences = useMutation(api.users.updateUserPreferences)

  // Push notifications hook
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
  } = usePushNotifications(convexUser?._id)

  // Use values from database with defaults
  const pushNotifications = convexUser?.pushNotificationsEnabled ?? false
  const emailNotifications = convexUser?.emailNotificationsEnabled ?? true
  const locationSharing = convexUser?.locationSharingEnabled ?? true
  const showOnlineStatus = convexUser?.showOnlineStatus ?? true
  const hideFromDiscovery = convexUser?.hideFromDiscovery ?? false

  const handleTogglePushNotifications = async () => {
    if (!convexUser?._id || pushLoading) return

    try {
      if (pushNotifications) {
        // Disabling - just update preference
        await updatePreferences({
          userId: convexUser._id,
          pushNotificationsEnabled: false,
        })
        toast.success('Push notifications disabled')
      } else {
        // Enabling - subscribe if needed, then update preference
        if (!pushSubscribed && pushSupported) {
          const success = await subscribeToPush()
          if (!success) {
            toast.error('Failed to enable push notifications. Please allow notifications in your browser settings.')
            return
          }
        }
        await updatePreferences({
          userId: convexUser._id,
          pushNotificationsEnabled: true,
        })
        toast.success('Push notifications enabled')
      }
    } catch {
      toast.error('Failed to update notification settings')
    }
  }

  const handleToggleEmailNotifications = async () => {
    if (!convexUser?._id) return
    const newValue = !emailNotifications
    try {
      await updatePreferences({
        userId: convexUser._id,
        emailNotificationsEnabled: newValue,
      })
      toast.success(newValue ? 'Email notifications enabled' : 'Email notifications disabled')
    } catch {
      toast.error('Failed to update notification settings')
    }
  }

  const handleToggleLocationSharing = async () => {
    if (!convexUser?._id) return
    const newValue = !locationSharing
    try {
      await updatePreferences({
        userId: convexUser._id,
        locationSharingEnabled: newValue,
      })
      toast.success(newValue ? 'Location sharing enabled' : 'Location sharing disabled')
    } catch {
      toast.error('Failed to update privacy settings')
    }
  }

  const handleToggleOnlineStatus = async () => {
    if (!convexUser?._id) return
    const newValue = !showOnlineStatus
    try {
      await updatePreferences({
        userId: convexUser._id,
        showOnlineStatus: newValue,
      })
      toast.success(newValue ? 'Online status visible' : 'Online status hidden')
    } catch {
      toast.error('Failed to update privacy settings')
    }
  }

  const handleToggleHideFromDiscovery = async () => {
    if (!convexUser?._id) return
    const newValue = !hideFromDiscovery
    try {
      await updatePreferences({
        userId: convexUser._id,
        hideFromDiscovery: newValue,
      })
      toast.success(newValue ? 'You are now hidden from discovery' : 'You are now visible in discovery')
    } catch {
      toast.error('Failed to update privacy settings')
    }
  }

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
  }

  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
        enabled ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <div
        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )

  const sections: SettingSection[] = [
    {
      title: 'Account',
      items: [
        {
          icon: <User className="w-5 h-5" />,
          label: 'Edit Profile',
          description: 'Update your profile information',
          action: () => navigate({ to: '/profile' }),
          rightElement: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
        },
        {
          icon: <CreditCard className="w-5 h-5" />,
          label: isUltra ? 'Manage Subscription' : 'Upgrade to Ultra',
          description: isUltra ? 'Piggies Ultra member' : 'Get unlimited features',
          action: () => {
            const url = isUltra ? portalUrl : checkoutUrl
            if (url) window.location.href = url
          },
          rightElement: isUltra ? (
            <Sparkles className="w-5 h-5 text-amber-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          ),
        },
        {
          icon: <ImageIcon className="w-5 h-5" />,
          label: 'Private Album',
          description: 'Manage your private photo album',
          action: () => navigate({ to: '/album' }),
          rightElement: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
        },
        {
          icon: <Lock className="w-5 h-5" />,
          label: 'Password & Security',
          description: 'Manage your password and security settings',
          rightElement: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
        },
      ],
    },
    {
      title: 'Referrals',
      items: [
        {
          icon: <Gift className="w-5 h-5" />,
          label: 'Invite Friends',
          description: hasReferralUltra
            ? `${referralUltraDaysRemaining}d of free Ultra remaining`
            : `${activatedReferrals}/3 referrals to free Ultra`,
          action: () => navigate({ to: '/referrals' }),
          rightElement: hasReferralUltra ? (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          ),
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: <Users className="w-5 h-5" />,
          label: 'Hide from Discovery',
          description: 'Don\'t show me in the discovery grid',
          rightElement: <ToggleSwitch enabled={hideFromDiscovery} onToggle={handleToggleHideFromDiscovery} />,
        },
        {
          icon: <Eye className="w-5 h-5" />,
          label: 'Show Online Status',
          description: 'Let others see when you\'re online',
          rightElement: <ToggleSwitch enabled={showOnlineStatus} onToggle={handleToggleOnlineStatus} />,
        },
        {
          icon: <MapPin className="w-5 h-5" />,
          label: 'Location Sharing',
          description: 'Share your location with nearby users',
          rightElement: <ToggleSwitch enabled={locationSharing} onToggle={handleToggleLocationSharing} />,
        },
        {
          icon: <Shield className="w-5 h-5" />,
          label: 'Blocked Users',
          description: 'Manage users you\'ve blocked',
          rightElement: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: <Bell className="w-5 h-5" />,
          label: 'Push Notifications',
          description: 'Receive alerts for messages and activity',
          rightElement: <ToggleSwitch enabled={pushNotifications} onToggle={handleTogglePushNotifications} />,
        },
        {
          icon: <Smartphone className="w-5 h-5" />,
          label: 'Email Notifications',
          description: 'Receive email updates',
          rightElement: <ToggleSwitch enabled={emailNotifications} onToggle={handleToggleEmailNotifications} />,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: <Globe className="w-5 h-5" />,
          label: 'Language',
          description: 'English',
          rightElement: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
        },
        {
          icon: <Moon className="w-5 h-5" />,
          label: 'Dark Mode',
          description: 'System default',
          rightElement: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: <HelpCircle className="w-5 h-5" />,
          label: 'Help Center',
          description: 'Get help and support',
          rightElement: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
        },
        {
          icon: <FileText className="w-5 h-5" />,
          label: 'Terms of Service',
          rightElement: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
        },
        {
          icon: <Shield className="w-5 h-5" />,
          label: 'Privacy Policy',
          rightElement: <ChevronRight className="w-5 h-5 text-muted-foreground" />,
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          icon: <LogOut className="w-5 h-5" />,
          label: 'Sign Out',
          action: () => signOut(),
          danger: true,
        },
        {
          icon: <Trash2 className="w-5 h-5" />,
          label: 'Delete Account',
          description: 'Permanently delete your account and data',
          danger: true,
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Page Title */}
        <h1 className="font-bold text-2xl mb-6">Settings</h1>
        {/* Profile Card */}
        <section className="mb-8 p-4 bg-card rounded-2xl border border-border">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="w-16 h-16 border-2 border-primary/20">
              <AvatarImage
                src={workosUser?.profilePictureUrl || undefined}
                alt={workosUser?.firstName || 'User'}
              />
              <AvatarFallback className="bg-primary/20 text-primary text-lg">
                {getInitials(workosUser?.firstName, workosUser?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg truncate">
                {workosUser?.firstName} {workosUser?.lastName}
              </p>
              <p className="text-sm text-muted-foreground truncate">{workosUser?.email}</p>
              {isUltra && (
                <div className="flex items-center gap-1 mt-1">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                    Ultra Member
                  </span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/profile' })}
              className="shrink-0"
            >
              Edit
            </Button>
          </div>
        </section>

        {/* Settings Sections */}
        {sections.map((section) => (
          <section key={section.title} className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              {section.title}
            </h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
              {section.items.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className={`w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors text-left ${
                    item.danger ? 'text-destructive' : ''
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      item.danger ? 'bg-destructive/10' : 'bg-primary/10'
                    }`}
                  >
                    <span className={item.danger ? 'text-destructive' : 'text-primary'}>
                      {item.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.label}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                    )}
                  </div>
                  {item.rightElement}
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* App Version */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Piggies v1.0.0
        </p>
      </main>
    </div>
  )
}
