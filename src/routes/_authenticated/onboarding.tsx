import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  User,
  Heart,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Trash2,
  Loader2,
} from 'lucide-react'
import { INTEREST_CATEGORIES, type InterestCategory } from '@/lib/interests'
import { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_authenticated/onboarding')({
  component: OnboardingPage,
})

const LOOKING_FOR_OPTIONS = [
  { id: 'chat', label: 'Chat & Friends', icon: '💬', description: 'Looking to meet new people' },
  { id: 'dates', label: 'Dates', icon: '❤️', description: 'Looking for something romantic' },
  { id: 'network', label: 'Networking', icon: '🤝', description: 'Professional connections' },
  { id: 'open', label: 'Open to Anything', icon: '✨', description: 'See where things go' },
]

const MAX_PHOTOS = 6
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function OnboardingPage() {
  const navigate = useNavigate()
  const { user: convexUser } = useCurrentUser()
  const updateProfile = useMutation(api.users.updateProfile)
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl)
  const addProfilePhoto = useMutation(api.users.addProfilePhoto)
  const removeProfilePhoto = useMutation(api.users.removeProfilePhoto)
  const profilePhotos = useQuery(
    api.users.getProfilePhotos,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  )

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<Id<"_storage"> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [age, setAge] = useState('')
  const [bio, setBio] = useState('')
  const [lookingFor, setLookingFor] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<InterestCategory>>(new Set(['hobbies']))

  const totalSteps = 5
  const photoCount = profilePhotos?.length ?? 0

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 6 ? [...prev, interest] : prev
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !convexUser?._id) return

    // Reset input so the same file can be selected again
    e.target.value = ''

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Max size is 5MB.')
      return
    }

    setIsUploadingPhoto(true)
    try {
      const uploadUrl = await generateUploadUrl()
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!response.ok) throw new Error('Upload failed')

      const { storageId } = await response.json()
      await addProfilePhoto({ userId: convexUser._id, storageId })
      toast.success('Photo added!')
    } catch {
      toast.error('Failed to upload photo')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleDeletePhoto = async (storageId: Id<"_storage">) => {
    if (!convexUser?._id) return

    setIsDeletingPhoto(storageId)
    try {
      await removeProfilePhoto({ userId: convexUser._id, storageId })
      toast.success('Photo removed')
    } catch {
      toast.error('Failed to remove photo')
    } finally {
      setIsDeletingPhoto(null)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1: return true // Photos are optional, can always skip
      case 2: {
        const ageNum = parseInt(age, 10)
        return displayName.trim().length >= 2 && age.trim() !== '' && !isNaN(ageNum) && ageNum >= 18
      }
      case 3: return lookingFor !== ''
      case 4: return selectedInterests.length >= 3
      case 5: return bio.trim().length >= 10
      default: return false
    }
  }

  const handleNext = () => {
    if (step < totalSteps && canProceed()) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleComplete = async () => {
    if (!convexUser?._id || !canProceed()) return

    setIsSubmitting(true)
    try {
      await updateProfile({
        userId: convexUser._id,
        displayName: displayName.trim(),
        age: parseInt(age),
        bio: bio.trim(),
        lookingFor,
        interests: selectedInterests,
        onboardingComplete: true,
      })
      toast.success('Welcome to Piggies!')
      navigate({ to: '/home' })
    } catch {
      toast.error('Failed to complete setup. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <img src="/pig-snout.svg" alt="Piggies" className="w-6 h-6 brightness-0 invert" />
          </div>
          <span className="text-xl font-bold">Piggies</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="relative z-10 px-6 mb-8">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i < step ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Step {step} of {totalSteps}
        </p>
      </div>

      {/* Content */}
      <main className="relative z-10 flex-1 px-6 pb-32">
        {/* Hidden file input for photo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Step 1: Photos */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-black mb-2">Add your photos</h1>
              <p className="text-muted-foreground">
                Show off your best self! You can skip this and add photos later.
              </p>
            </div>

            {/* Photo grid */}
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: MAX_PHOTOS }).map((_, index) => {
                const photo = profilePhotos?.[index]
                return (
                  <div
                    key={index}
                    className={`relative aspect-square rounded-xl overflow-hidden ${
                      photo ? 'bg-muted' : 'border-2 border-dashed border-border'
                    }`}
                  >
                    {photo ? (
                      <>
                        <img
                          src={photo.url ?? ''}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-medium">
                            Primary
                          </div>
                        )}
                        <button
                          onClick={() => handleDeletePhoto(photo.storageId)}
                          disabled={isDeletingPhoto === photo.storageId}
                          className="absolute top-2 right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                        >
                          {isDeletingPhoto === photo.storageId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto || photoCount >= MAX_PHOTOS}
                        className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors disabled:opacity-50"
                      >
                        {isUploadingPhoto && index === photoCount ? (
                          <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                          <>
                            <ImagePlus className="w-8 h-8" />
                            <span className="text-xs">Add Photo</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-sm text-muted-foreground mt-4 text-center">
              {photoCount} / {MAX_PHOTOS} photos • First photo is your profile picture
            </p>
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-black mb-2">Let's get started</h1>
              <p className="text-muted-foreground">Tell us a bit about yourself</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Display Name</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  className="h-14 text-lg rounded-xl"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This is how others will see you
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Your Age</label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="18+"
                  className="h-14 text-lg rounded-xl"
                  min={18}
                  max={99}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You must be 18 or older to use Piggies
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Looking For */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-black mb-2">What are you looking for?</h1>
              <p className="text-muted-foreground">Help us personalize your experience</p>
            </div>

            <div className="space-y-3">
              {LOOKING_FOR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setLookingFor(option.id)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-center gap-4 ${
                    lookingFor === option.id
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <span className="text-3xl">{option.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  {lookingFor === option.id && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Interests */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-black mb-2">Pick your interests</h1>
              <p className="text-muted-foreground">
                Select 3-6 interests to find your people
              </p>
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

            <p className="text-sm text-muted-foreground mt-4">
              {selectedInterests.length}/6 selected
              {selectedInterests.length < 3 && ` (${3 - selectedInterests.length} more required)`}
            </p>
          </div>
        )}

        {/* Step 5: Bio */}
        {step === 5 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-black mb-2">Write your bio</h1>
              <p className="text-muted-foreground">
                Let people know what makes you unique
              </p>
            </div>

            <div>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="I'm into fitness, good vibes, and spontaneous adventures..."
                className="min-h-32 text-lg"
                maxLength={250}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {bio.length}/250 characters
                {bio.length < 10 && ` (${10 - bio.length} more required)`}
              </p>
            </div>

            {/* Preview card */}
            <div className="mt-8 p-4 bg-card rounded-2xl border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Profile Preview</p>
              <div className="flex items-start gap-3">
                {profilePhotos && profilePhotos.length > 0 ? (
                  <img
                    src={profilePhotos[0].url ?? ''}
                    alt="Profile"
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                    <User className="w-7 h-7 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold">{displayName || 'Your Name'}, {age || '??'}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {bio || 'Your bio will appear here...'}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedInterests.slice(0, 3).map((interest) => (
                      <span key={interest} className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent z-50">
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleBack}
              className="h-14 px-6 rounded-xl border-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          
          {step < totalSteps ? (
            <Button
              size="lg"
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 h-14 rounded-xl font-bold text-lg glow-red disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleComplete}
              disabled={!canProceed() || isSubmitting}
              className="flex-1 h-14 rounded-xl font-bold text-lg glow-red disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Setting up...' : 'Complete Setup'}
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

