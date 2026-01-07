import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { ProfilePhotoGrid } from '@/components/profile/ProfilePhotoGrid'
import { toast } from 'sonner'
import {
  User,
  ArrowLeft,
  Check,
  Sparkles,
  Heart,
  Save,
  Camera,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { INTEREST_CATEGORIES, type InterestCategory } from '@/lib/interests'

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
})

const LOOKING_FOR_OPTIONS = [
  { id: 'chat', label: 'Chat & Friends', icon: '💬', description: 'Looking to meet new people' },
  { id: 'dates', label: 'Dates', icon: '❤️', description: 'Looking for something romantic' },
  { id: 'network', label: 'Networking', icon: '🤝', description: 'Professional connections' },
  { id: 'open', label: 'Open to Anything', icon: '✨', description: 'See where things go' },
]

function ProfilePage() {
  const navigate = useNavigate()
  const { user: workosUser } = useAuth()
  const { user: convexUser } = useCurrentUser()
  const { isUltra } = useSubscription()
  const updateProfile = useMutation(api.users.updateProfile)

  // Fetch current profile
  const profile = useQuery(
    api.users.getProfile,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  )

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [age, setAge] = useState('')
  const [bio, setBio] = useState('')
  const [lookingFor, setLookingFor] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<InterestCategory>>(new Set(['hobbies']))

  // Load existing profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '')
      setAge(profile.age?.toString() || '')
      setBio(profile.bio || '')
      setLookingFor(profile.lookingFor || '')
      setSelectedInterests(profile.interests || [])
    }
  }, [profile])

  // Track changes
  useEffect(() => {
    if (!profile) return
    const changed =
      displayName !== (profile.displayName || '') ||
      age !== (profile.age?.toString() || '') ||
      bio !== (profile.bio || '') ||
      lookingFor !== (profile.lookingFor || '') ||
      JSON.stringify(selectedInterests) !== JSON.stringify(profile.interests || [])
    setHasChanges(changed)
  }, [displayName, age, bio, lookingFor, selectedInterests, profile])

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 6
          ? [...prev, interest]
          : prev
    )
  }

  const toggleCategory = (category: InterestCategory) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const isValid = () => {
    const ageNum = parseInt(age, 10)
    return (
      displayName.trim().length >= 2 &&
      age.trim() !== '' &&
      !isNaN(ageNum) &&
      ageNum >= 18 &&
      lookingFor !== '' &&
      selectedInterests.length >= 3 &&
      bio.trim().length >= 10
    )
  }

  const handleSave = async () => {
    if (!convexUser?._id || !isValid()) return

    setIsSubmitting(true)
    try {
      await updateProfile({
        userId: convexUser._id,
        displayName: displayName.trim(),
        age: parseInt(age),
        bio: bio.trim(),
        lookingFor,
        interests: selectedInterests,
      })
      toast.success('Profile updated successfully')
      navigate({ to: '/home' })
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
  }

  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/home' })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg">Edit Profile</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || !isValid() || isSubmitting}
            className="text-primary font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-32 space-y-8">
        {/* Profile Photos Section */}
        <section className="bg-card rounded-2xl border border-border p-4">
          {convexUser?._id && (
            <ProfilePhotoGrid userId={convexUser._id} isUltra={isUltra} />
          )}
        </section>

        {/* Basic Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Basic Info</h2>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-muted-foreground">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
              className="h-12 text-base rounded-xl bg-card border-border"
              maxLength={20}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-muted-foreground">Age</label>
            <Input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="18+"
              className="h-12 text-base rounded-xl bg-card border-border"
              min={18}
              max={99}
            />
          </div>
        </section>

        {/* Looking For */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Looking For</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {LOOKING_FOR_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setLookingFor(option.id)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  lookingFor === option.id
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <span className="text-2xl block mb-2">{option.icon}</span>
                <p className="font-semibold text-sm">{option.label}</p>
                {lookingFor === option.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Interests */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Interests</h2>
              <p className="text-sm text-muted-foreground">{selectedInterests.length}/6 selected</p>
            </div>
          </div>

          <div className="space-y-3">
            {(Object.entries(INTEREST_CATEGORIES) as [InterestCategory, typeof INTEREST_CATEGORIES[InterestCategory]][]).map(([categoryKey, category]) => {
              const isExpanded = expandedCategories.has(categoryKey)
              const selectedInCategory = category.interests.filter((i) => selectedInterests.includes(i))

              return (
                <div key={categoryKey} className="bg-card rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => toggleCategory(categoryKey)}
                    className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.emoji}</span>
                      <span className="font-semibold">{category.label}</span>
                      {selectedInCategory.length > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                          {selectedInCategory.length} selected
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 flex flex-wrap gap-2">
                      {category.interests.map((interest) => (
                        <button
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          disabled={!selectedInterests.includes(interest) && selectedInterests.length >= 6}
                          className={`px-3 py-1.5 rounded-full border-2 transition-all duration-200 font-medium text-sm ${
                            selectedInterests.includes(interest)
                              ? 'border-primary bg-primary text-white shadow-lg shadow-primary/30'
                              : 'border-border bg-background hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {selectedInterests.length < 3 && (
            <p className="text-sm text-amber-500">Select at least 3 interests</p>
          )}
        </section>

        {/* Bio */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Bio</h2>
          </div>

          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself..."
            className="min-h-32 text-base rounded-xl bg-card border-border resize-none"
            maxLength={250}
          />
          <p className="text-xs text-muted-foreground">
            {bio.length}/250 characters
            {bio.length < 10 && ` (${10 - bio.length} more needed)`}
          </p>
        </section>

        {/* Preview Card */}
        <section className="p-5 bg-card rounded-2xl border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4 font-semibold">
            Profile Preview
          </p>
          <div className="flex items-start gap-4">
            <Avatar size="lg" className="w-16 h-16 border-2 border-primary/20 shrink-0">
              <AvatarImage
                src={profile?.profilePhotos?.[0] || workosUser?.profilePictureUrl || undefined}
                alt={displayName || 'Profile'}
              />
              <AvatarFallback className="bg-primary/20 text-primary">
                {getInitials(workosUser?.firstName, workosUser?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-lg">
                {displayName || 'Your Name'}
                {age && `, ${age}`}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {bio || 'Your bio will appear here...'}
              </p>
              {selectedInterests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedInterests.slice(0, 4).map((interest) => (
                    <span
                      key={interest}
                      className="text-xs px-2.5 py-1 bg-primary/20 text-primary rounded-full font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                  {selectedInterests.length > 4 && (
                    <span className="text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-full">
                      +{selectedInterests.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Floating Save Button (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-50 lg:hidden">
        <Button
          size="lg"
          onClick={handleSave}
          disabled={!hasChanges || !isValid() || isSubmitting}
          className="w-full h-14 rounded-xl font-bold text-lg glow-red disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5 mr-2" />
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}


