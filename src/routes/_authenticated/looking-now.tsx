import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscription } from '@/hooks/useSubscription'
import { Id } from '../../../convex/_generated/dataModel'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  MapPin,
  MessageCircle,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  Lock,
  Send,
  Home,
  Car,
} from 'lucide-react'

export const Route = createFileRoute('/_authenticated/looking-now')({
  component: LookingNowPage,
})

function LookingNowPage() {
  const navigate = useNavigate()
  const { user: convexUser } = useCurrentUser()
  const { isUltra, checkoutUrl } = useSubscription()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newPostMessage, setNewPostMessage] = useState('')
  const [editPostMessage, setEditPostMessage] = useState('')
  const [locationName, setLocationName] = useState('')
  const [canHost, setCanHost] = useState<boolean | undefined>(undefined)
  const [editCanHost, setEditCanHost] = useState<boolean | undefined>(undefined)

  // Queries
  const activePosts = useQuery(
    api.lookingNow.getActivePosts,
    convexUser?._id ? { currentUserId: convexUser._id } : 'skip'
  )

  const myActivePost = useQuery(
    api.lookingNow.getMyActivePost,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  )

  const postingStatus = useQuery(
    api.lookingNow.getPostingStatus,
    convexUser?._id ? { userId: convexUser._id } : 'skip'
  )

  // Mutations
  const createPost = useMutation(api.lookingNow.createPost)
  const deletePost = useMutation(api.lookingNow.deletePost)
  const updatePost = useMutation(api.lookingNow.updatePost)
  const startConversation = useMutation(api.messages.startConversation)

  const handleCreatePost = async () => {
    if (!convexUser?._id) return
    if (!newPostMessage.trim()) {
      toast.error('Please enter a message')
      return
    }

    try {
      await createPost({
        userId: convexUser._id,
        message: newPostMessage.trim(),
        locationName: locationName.trim() || undefined,
        canHost,
      })
      setNewPostMessage('')
      setLocationName('')
      setCanHost(undefined)
      setCreateDialogOpen(false)
      toast.success('Your post is now live!')
    } catch (error) {
      console.error('Failed to create post:', error)
      toast.error('Failed to create post')
    }
  }

  const handleUpdatePost = async () => {
    if (!convexUser?._id || !myActivePost) return
    if (!editPostMessage.trim()) {
      toast.error('Please enter a message')
      return
    }

    try {
      await updatePost({
        postId: myActivePost._id,
        userId: convexUser._id,
        message: editPostMessage.trim(),
        locationName: locationName.trim() || undefined,
        canHost: editCanHost,
      })
      setEditDialogOpen(false)
      toast.success('Post updated!')
    } catch (error) {
      console.error('Failed to update post:', error)
      toast.error('Failed to update post')
    }
  }

  const handleDeletePost = async () => {
    if (!convexUser?._id || !myActivePost) return

    try {
      await deletePost({
        postId: myActivePost._id,
        userId: convexUser._id,
      })
      toast.success('Post deleted')
    } catch (error) {
      console.error('Failed to delete post:', error)
      toast.error('Failed to delete post')
    }
  }

  const handleMessageUser = async (userId: Id<'users'>) => {
    if (!convexUser?._id) return
    try {
      const result = await startConversation({
        currentUserId: convexUser._id,
        otherUserId: userId,
      })
      navigate({
        to: '/messages',
        search: { conversation: result.conversationId },
      })
    } catch (error) {
      console.error('Failed to start conversation:', error)
      toast.error('Failed to start conversation')
    }
  }

  const handleUpgrade = () => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl
    }
  }

  const openEditDialog = () => {
    if (myActivePost) {
      setEditPostMessage(myActivePost.message)
      setLocationName(myActivePost.locationName || '')
      setEditCanHost(myActivePost.canHost)
      setEditDialogOpen(true)
    }
  }

  const formatTimeRemaining = (expiresAt: number) => {
    const now = Date.now()
    const remaining = expiresAt - now
    if (remaining <= 0) return 'Expired'

    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    }
    return `${minutes}m left`
  }

  const formatTimeAgo = (createdAt: number) => {
    const now = Date.now()
    const diff = now - createdAt
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const otherPosts = activePosts?.filter((post) => !post.isOwn) || []

  return (
    <div className="min-h-screen bg-background">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Page Title */}
        <h1 className="font-bold text-2xl flex items-center gap-2 mb-6">
          <MapPin className="w-6 h-6 text-primary" />
          Looking Now
        </h1>

        {/* Your Active Post Section */}
        <section className="mb-6">
          {myActivePost ? (
            <div className="p-5 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-2xl">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    <span className="w-2 h-2 bg-primary rounded-full mr-1.5 animate-pulse" />
                    Your Post
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTimeRemaining(myActivePost.expiresAt)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={openEditDialog}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={handleDeletePost}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-foreground text-lg font-medium">
                {myActivePost.message}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {myActivePost.locationName && (
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {myActivePost.locationName}
                  </span>
                )}
                {myActivePost.canHost === true && (
                  <Badge variant="outline" className="text-xs">
                    <Home className="w-3 h-3 mr-1" />
                    Can Host
                  </Badge>
                )}
                {myActivePost.canHost === false && (
                  <Badge variant="outline" className="text-xs">
                    <Car className="w-3 h-3 mr-1" />
                    Can Travel
                  </Badge>
                )}
              </div>
            </div>
          ) : postingStatus && !postingStatus.canPost ? (
            // Free user has reached daily limit
            <div className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-lg mb-1">Daily Limit Reached</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Free users can create 1 post per day. Upgrade to Piggies Ultra for unlimited posts and 4-hour visibility!
                  </p>
                  <Button
                    onClick={handleUpgrade}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Upgrade to Ultra
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <button className="w-full p-6 bg-card border-2 border-dashed border-border rounded-2xl hover:border-primary/50 hover:bg-card/80 transition-all group">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Plus className="w-7 h-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-foreground">
                        Post What You're Looking For
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Let nearby users know you're available right now
                      </p>
                      {postingStatus && !postingStatus.isUltra && (
                        <p className="text-xs text-amber-500 mt-2">
                          {postingStatus.dailyLimit - postingStatus.postsUsedToday} post remaining today
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Create a Looking Now Post
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      What are you looking for right now?
                    </label>
                    <Textarea
                      placeholder="e.g., Looking for someone to grab drinks with tonight..."
                      value={newPostMessage}
                      onChange={(e) => setNewPostMessage(e.target.value)}
                      className="min-h-[100px] resize-none"
                      maxLength={280}
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {newPostMessage.length}/280
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Location (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Downtown, West Side, etc."
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Hosting
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCanHost(canHost === true ? undefined : true)}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                          canHost === true
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:border-primary/50'
                        }`}
                      >
                        <Home className="w-4 h-4" />
                        Can Host
                      </button>
                      <button
                        type="button"
                        onClick={() => setCanHost(canHost === false ? undefined : false)}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                          canHost === false
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:border-primary/50'
                        }`}
                      >
                        <Car className="w-4 h-4" />
                        Can Travel
                      </button>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Your post will be visible for {postingStatus?.postDurationHours || 1} hour{(postingStatus?.postDurationHours || 1) > 1 ? 's' : ''} and then automatically expire.
                    </p>
                    {postingStatus && !postingStatus.isUltra && (
                      <p className="text-xs text-amber-500 mt-2">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        Upgrade to Ultra for 4-hour visibility and unlimited posts!
                      </p>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreatePost}
                    disabled={!newPostMessage.trim()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Post Now
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </section>

        {/* Edit Post Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary" />
                Edit Your Post
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  What are you looking for right now?
                </label>
                <Textarea
                  placeholder="e.g., Looking for someone to grab drinks with tonight..."
                  value={editPostMessage}
                  onChange={(e) => setEditPostMessage(e.target.value)}
                  className="min-h-[100px] resize-none"
                  maxLength={280}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {editPostMessage.length}/280
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Location (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Downtown, West Side, etc."
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Hosting
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCanHost(editCanHost === true ? undefined : true)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      editCanHost === true
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    Can Host
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCanHost(editCanHost === false ? undefined : false)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      editCanHost === false
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    <Car className="w-4 h-4" />
                    Can Travel
                  </button>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleUpdatePost}
                disabled={!editPostMessage.trim()}
              >
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Premium Gate for non-Ultra users */}
        {!isUltra && otherPosts.length > 3 && (
          <section className="mb-6 p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg mb-1">See All Posts</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade to Piggies Ultra to see all Looking Now posts and connect with more people.
                </p>
                <Button
                  onClick={handleUpgrade}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upgrade to Ultra
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Active Posts Feed */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            People Looking Now ({otherPosts.length})
          </h2>

          {activePosts === undefined ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : otherPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No one is looking right now</h3>
              <p className="text-muted-foreground max-w-xs">
                Be the first to post! Let others know what you're looking for.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {otherPosts.map((post, index) => {
                const isLocked = !isUltra && index >= 3

                return (
                  <div
                    key={post._id}
                    className={`bg-card rounded-2xl border border-border overflow-hidden transition-all ${
                      isLocked ? 'relative' : ''
                    }`}
                  >
                    <div className={`p-4 ${isLocked ? 'blur-sm' : ''}`}>
                      <div className="flex items-start gap-4">
                        {/* User Avatar */}
                        <div className="relative shrink-0">
                          <Avatar size="lg" className="w-14 h-14 border-2 border-primary/20">
                            {post.user.profile?.profilePhotoUrl ? (
                              <AvatarImage
                                src={post.user.profile.profilePhotoUrl}
                                alt={post.user.profile?.displayName || post.user.name}
                              />
                            ) : post.user.imageUrl ? (
                              <AvatarImage
                                src={post.user.imageUrl}
                                alt={post.user.name}
                              />
                            ) : (
                              <AvatarFallback className="bg-primary/20 text-primary text-lg">
                                {(post.user.profile?.displayName || post.user.name).charAt(0)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          {post.user.isOnline && (
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-foreground">
                              {post.user.profile?.displayName || post.user.name}
                              {post.user.profile?.age && `, ${post.user.profile.age}`}
                            </p>
                            {post.user.isOnline && (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                Online
                              </Badge>
                            )}
                          </div>
                          <p className="text-foreground mb-2">{post.message}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(post.createdAt)}
                            </span>
                            {post.locationName && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {post.locationName}
                              </span>
                            )}
                            {post.canHost === true && (
                              <Badge variant="outline" className="text-xs py-0">
                                <Home className="w-3 h-3 mr-1" />
                                Can Host
                              </Badge>
                            )}
                            {post.canHost === false && (
                              <Badge variant="outline" className="text-xs py-0">
                                <Car className="w-3 h-3 mr-1" />
                                Can Travel
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Message Button */}
                        <Button
                          size="icon"
                          className="shrink-0 rounded-full bg-primary hover:bg-primary/90"
                          onClick={() => handleMessageUser(post.user._id)}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Lock overlay for non-Ultra users */}
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-[2px]">
                        <div className="text-center">
                          <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm font-medium text-muted-foreground">
                            Upgrade to see
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Ultra CTA at bottom */}
        {!isUltra && otherPosts.length > 3 && (
          <div className="mt-8 p-6 bg-card rounded-2xl border border-border text-center">
            <Sparkles className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-2">See All Looking Now Posts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {otherPosts.length - 3} more people are looking right now. Upgrade to Ultra to see them all.
            </p>
            <Button
              onClick={handleUpgrade}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
