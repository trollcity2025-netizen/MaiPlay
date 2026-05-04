import { useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Award,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  Gift,
  Loader2,
  Lock,
  Mail,
  Medal,
  Music,
  PlayCircle,
  Radio,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Video as VideoIcon,
  X,
  Zap,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { VideoCard } from '../components/video/VideoCard'
import { AppHeader } from '../components/layout/AppHeader'
import { useAuthAccount } from '../auth/AuthAccountProvider'
import { getCurrentCashoutTier, getNextCashoutTier, getProgressToNextTier, getCoinsRemainingToNextTier, CASHOUT_TIERS } from '../utils/creatorProgression'
import type { Video, Profile, SubscriptionTier, Short, Movie, Track } from '../types'

const AVATAR_BUCKET = 'avatars'



type CreatorCalendarEvent = {
  id: string
  creator_id: string
  title: string
  description?: string | null
  starts_at: string
  ends_at?: string | null
  event_type?: string | null
  visibility?: string | null
}

type MaiAccount = Profile & {
  id: string
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  subscriber_count: number | null
  total_views: number | null
  short_views?: number | null
  is_creator: boolean | null
  creator_level: string | null
  role: string | null
  moderation_status?: string | null
  created_at?: string | null
}

function getInitials(profile?: Partial<MaiAccount> | null) {
  const value = profile?.display_name || profile?.username || 'MAI'
  return value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getRoleBadge(role?: string | null) {
  if (role === 'ceo') {
    return {
      label: 'CEO',
      icon: Crown,
      className: 'border-yellow-400 bg-yellow-500 text-black',
    }
  }

  if (role === 'admin') {
    return {
      label: 'ADMIN',
      icon: Shield,
      className: 'border-amber-400 bg-amber-500 text-black',
    }
  }

  if (role === 'creator') {
    return {
      label: 'CREATOR',
      icon: Sparkles,
      className: 'border-red-400 bg-red-500 text-white',
    }
  }

  if (role === 'moderator') {
    return {
      label: 'MODERATOR',
      icon: Shield,
      className: 'border-blue-400 bg-blue-500 text-white',
    }
  }

  return null
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function getCreatorLevel(totalViews: number, subscribers: number) {
  const score = totalViews + subscribers * 100

  if (score >= 1_000_000) return { level: 'Diamond', next: 'Max Level', progress: 100, nextScore: 1_000_000 }
  if (score >= 250_000) return { level: 'Platinum', next: 'Diamond', progress: ((score - 250_000) / 750_000) * 100, nextScore: 1_000_000 }
  if (score >= 75_000) return { level: 'Gold', next: 'Platinum', progress: ((score - 75_000) / 175_000) * 100, nextScore: 250_000 }
  if (score >= 15_000) return { level: 'Silver', next: 'Gold', progress: ((score - 15_000) / 60_000) * 100, nextScore: 75_000 }

  return { level: 'Bronze', next: 'Silver', progress: (score / 15_000) * 100, nextScore: 15_000 }
}

function getBadges(profile: MaiAccount, videos: Video[], events: CreatorCalendarEvent[]) {
  const subscribers = profile.subscriber_count ?? 0
  const views = profile.total_views ?? 0
  const uploads = videos.length

  return [
    {
      id: 'founder',
      name: 'MAI Founder Energy',
      description: 'Reserved for elite platform identity and leadership.',
      icon: Crown,
      unlocked: profile.role === 'ceo',
      progress: profile.role === 'ceo' ? 100 : 0,
      requirement: 'CEO role required',
      color: 'text-yellow-300',
    },
    {
      id: 'verified_creator',
      name: 'Verified Creator',
      description: 'Creator account recognized by MaiPlay.',
      icon: CheckCircle2,
      unlocked: Boolean(profile.is_creator),
      progress: profile.is_creator ? 100 : 0,
      requirement: 'Become a creator',
      color: 'text-red-300',
    },
    {
      id: 'first_upload',
      name: 'First Drop',
      description: 'Publish your first approved public upload.',
      icon: PlayCircle,
      unlocked: uploads >= 1,
      progress: Math.min((uploads / 1) * 100, 100),
      requirement: '1 approved video',
      color: 'text-green-300',
    },
    {
      id: 'rising_star',
      name: 'Rising Star',
      description: 'Start building real audience traction.',
      icon: Star,
      unlocked: subscribers >= 100,
      progress: Math.min((subscribers / 100) * 100, 100),
      requirement: '100 subscribers',
      color: 'text-yellow-300',
    },
    {
      id: 'viral_spark',
      name: 'Viral Spark',
      description: 'Reach serious watch momentum.',
      icon: Flame,
      unlocked: views >= 10_000,
      progress: Math.min((views / 10_000) * 100, 100),
      requirement: '10,000 total views',
      color: 'text-orange-300',
    },
    {
      id: 'calendar_builder',
      name: 'Event Builder',
      description: 'Schedule a creator event, live, premiere, or drop.',
      icon: CalendarDays,
      unlocked: events.length >= 1,
      progress: Math.min((events.length / 1) * 100, 100),
      requirement: '1 upcoming event',
      color: 'text-blue-300',
    },
    {
      id: 'movie_ready',
      name: 'Cinema Ready',
      description: 'Unlock long-form creator power.',
      icon: VideoIcon,
      unlocked: videos.some((video) => video.video_type === 'movie'),
      progress: videos.some((video) => video.video_type === 'movie') ? 100 : Math.min((views / 100_000) * 100, 100),
      requirement: 'Publish movie or reach 100k views',
      color: 'text-purple-300',
    },
    {
      id: 'mai_legend',
      name: 'MAI Legend',
      description: 'The highest public profile flex.',
      icon: Trophy,
      unlocked: subscribers >= 1_000 && views >= 100_000,
      progress: Math.min(((subscribers / 1_000) * 50) + ((views / 100_000) * 50), 100),
      requirement: '1,000 subscribers + 100k views',
      color: 'text-yellow-200',
    },
  ]
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user } = useAuthAccount()
  const queryClient = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  const [showTierSelect, setShowTierSelect] = useState(false)
  const [showMessageError, setShowMessageError] = useState(false)
  const [showBadges, setShowBadges] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'shorts' | 'movies' | 'music'>('all')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const profileQuery = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          [
            'id',
            'user_id',
            'username',
            'display_name',
            'avatar_url',
            'bio',
            'subscriber_count',
            'total_views',
            'short_views',
            'is_creator',
            'creator_level',
            'role',
            'moderation_status',
            'created_at',
          ].join(', ')
        )
        .eq('username', username)
        .single()

      if (error) throw error
      return data as MaiAccount
    },
    enabled: Boolean(username),
  })

  const profile = profileQuery.data

  const currentAccountQuery = useQuery({
    queryKey: ['current-profile-account', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, username, role')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      return data
    },
    enabled: Boolean(user?.id),
  })

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('mai_wallets')
        .select('mai_coins')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: Boolean(user?.id),
  })

  const currentAccount = currentAccountQuery.data
  const isOwnProfile = Boolean(user?.id && profile?.user_id === user.id)
  const roleBadge = getRoleBadge(profile?.role)
  const RoleIcon = roleBadge?.icon

  // Query to load creator's subscription plans
  const creatorPlansQuery = useQuery({
    queryKey: ['creator-plans', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('mai_circle_plans')
        .select('id, name, price_coins, features')
        .eq('creator_id', profile.id)
        .eq('is_active', true)
        .order('price_coins', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: Boolean(profile?.id && !isOwnProfile),
  })

   // Query creator's shorts
   const shortsQuery = useQuery({
     queryKey: ['profile-shorts', profile?.id],
     queryFn: async () => {
       if (!profile?.id) return []
const { data, error } = await supabase
          .from('shorts')
          .select('*, profiles:creator_id(*)')
          .eq('creator_id', profile.id)
         .eq('visibility', 'public')
         .eq('upload_status', 'ready')
         .eq('moderation_status', 'approved')
         .order('created_at', { ascending: false })

if (error) throw error
        return (data as Short[]).map(s => ({ ...s, video_type: 'short' as const }))
      },
      enabled: Boolean(profile?.id),
    })

    // Query creator's movies
   const moviesQuery = useQuery({
     queryKey: ['profile-movies', profile?.id],
     queryFn: async () => {
       if (!profile?.id) return []
const { data, error } = await supabase
          .from('movies')
          .select('*, profiles:creator_id(*)')
          .eq('creator_id', profile.id)
         .eq('visibility', 'public')
         .eq('upload_status', 'ready')
         .eq('moderation_status', 'approved')
         .order('created_at', { ascending: false })

if (error) throw error
        return (data as Movie[]).map(m => ({ ...m, video_type: 'movie' as const }))
      },
      enabled: Boolean(profile?.id),
    })

   // Query creator's music tracks
   const tracksQuery = useQuery({
     queryKey: ['profile-tracks', profile?.id],
     queryFn: async () => {
       if (!profile?.id) return []
const { data, error } = await supabase
          .from('tracks')
          .select('*')
          .eq('creator_id', profile.id)
         .eq('visibility', 'public')
         .eq('upload_status', 'ready')
         .eq('moderation_status', 'approved')
         .order('created_at', { ascending: false })

       if (error) throw error
       return data as Track[]
     },
     enabled: Boolean(profile?.id),
   })

   const calendarQuery = useQuery({
    queryKey: ['creator-calendar', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return []

      // First get the profile id from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', profile.user_id)
        .single()

      if (profileError) {
        console.error('Profile lookup error:', profileError)
        return []
      }

      const { data, error } = await supabase
        .from('creator_calendar_events')
        .select('id, creator_id, title, description, starts_at, ends_at, event_type, visibility')
        .eq('creator_id', profileData.id)
        .eq('visibility', 'public')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(6)

      if (error?.code === '42P01' || error?.code === 'PGRST205') return []
      if (error) throw error

      return data as CreatorCalendarEvent[]
    },
    enabled: Boolean(profile?.user_id && profile?.is_creator),
  })

  const isFollowingQuery = useQuery({
    queryKey: ['is-following', profile?.id, currentAccount?.id],
    queryFn: async () => {
      if (!profile?.id || !currentAccount?.id) return false

      const { data, error } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('subscriber_id', currentAccount.id)
        .eq('creator_id', profile.id)
        .maybeSingle()

      if (error) throw error
      return Boolean(data)
    },
    enabled: Boolean(profile?.id && currentAccount?.id && !isOwnProfile),
  })

  const activeSubscriptionQuery = useQuery({
    queryKey: ['has-subscription', profile?.id, currentAccount?.id],
    queryFn: async () => {
      if (!profile?.id || !currentAccount?.id) return false

      const { data, error } = await supabase
        .from('mai_circle_subscriptions')
        .select('id')
        .eq('subscriber_id', currentAccount.id)
        .eq('creator_id', profile.id)
        .eq('status', 'active')
        .maybeSingle()

      if (error) throw error
      return Boolean(data)
    },
    enabled: Boolean(profile?.id && currentAccount?.id && !isOwnProfile),
  })

   const isFollowing = Boolean(isFollowingQuery.data)
   const hasActiveSubscription = Boolean(activeSubscriptionQuery.data)
   const isAdmin = currentAccount?.role === 'admin' || currentAccount?.role === 'ceo'

    const shorts = shortsQuery.data ?? []
    const movies = moviesQuery.data ?? []
    const tracks = tracksQuery.data ?? []

    // Map tracks to Video-like objects for unified rendering in Music tab
    const musicVideos: Video[] = useMemo(() => tracks.map(track => ({
     id: track.id,
     creator_id: track.creator_id,
     title: track.title,
     description: track.description,
     category: track.category as any,
     video_type: 'music' as const,
     visibility: track.visibility as any,
     moderation_status: track.moderation_status as any,
     upload_status: track.upload_status as any,
     mux_upload_id: null,
     mux_asset_id: null,
     mux_playback_id: null,
     mux_status: null,
     mux_duration_seconds: null,
     mux_aspect_ratio: null,
     mux_thumbnail_url: null,
     mux_preview_url: null,
     mux_stream_url: null,
     audio_url: track.audio_url,
     file_url: null,
     cover_url: track.cover_art_url,
     album_cover_url: null,
     thumbnail_url: track.cover_art_url,
     view_count: track.view_count,
     like_count: track.like_count,
     comment_count: track.comment_count,
     gift_count: track.gift_count,
     boost_score: track.boost_score,
     created_at: track.created_at,
     updated_at: track.updated_at,
     published_at: null,
     deleted_at: null,
   })), [tracks])

   const filteredVideos = activeTab === 'shorts' ? shorts : activeTab === 'movies' ? movies : activeTab === 'music' ? musicVideos : [...shorts, ...movies, ...musicVideos]

   const totalApprovedCount = shorts.length + movies.length + tracks.length

   const level = useMemo(() => {
     return getCreatorLevel(profile?.total_views ?? 0, profile?.subscriber_count ?? 0)
   }, [profile?.total_views, profile?.subscriber_count])

    const badges = useMemo(() => {
      if (!profile) return []
      // For badges, we need videos array that includes all types; create a combined array of Video-like items
      const allVideos = [...shorts, ...movies, ...musicVideos]
      return getBadges(profile, allVideos, calendarQuery.data ?? [])
    }, [profile, shorts, movies, musicVideos, calendarQuery.data])

  const unlockedBadges = badges.filter((badge) => badge.unlocked)
   const nextBadge = badges.find((badge) => !badge.unlocked)

   const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id || !profile?.id) throw new Error('You must be signed in.')

      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        throw new Error('Upload a JPG, PNG, or WEBP image.')
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Profile image must be under 5MB.')
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/avatar-${Date.now()}.${ext}`

      const { error: uploadErrorResult } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadErrorResult) throw uploadErrorResult

      const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

const { error: updateError } = await supabase
         .from('profiles')
         .update({ avatar_url: publicUrlData.publicUrl })
         .eq('id', profile.id)
         .eq('user_id', user.id)

      if (updateError) throw updateError

      return publicUrlData.publicUrl
    },
    onMutate: () => setUploadError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
    },
    onError: (error) => {
      setUploadError(error instanceof Error ? error.message : 'Profile image upload failed.')
    },
  })

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentAccount?.id || !profile?.id) throw new Error('Not authenticated')

      const { error } = await supabase.from('subscriptions').insert({
        subscriber_id: currentAccount.id,
        creator_id: profile.id,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', profile?.id, currentAccount?.id] })
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
    },
  })

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!currentAccount?.id || !profile?.id) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('subscriber_id', currentAccount.id)
        .eq('creator_id', profile.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', profile?.id, currentAccount?.id] })
      queryClient.invalidateQueries({ queryKey: ['profile', username] })
    },
  })

  const subscribeMutation = useMutation({
    mutationFn: async (plan: any) => {
      if (!currentAccount?.id || !profile?.id) throw new Error('Not authenticated')

      const now = new Date()
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const { error } = await supabase.from('mai_circle_subscriptions').insert({
        subscriber_id: currentAccount.id,
        plan_id: plan.id,
        creator_id: profile.id,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
      })

      if (error) throw error
    },
    onSuccess: () => {
      setShowTierSelect(false)
      queryClient.invalidateQueries({ queryKey: ['has-subscription', profile?.id, currentAccount?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions', currentAccount?.id] })
    },
  })

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    uploadAvatarMutation.mutate(file)
    event.target.value = ''
  }

  const handleMessage = () => {
    if (!profile) return

    if (!hasActiveSubscription) {
      setShowMessageError(true)
      return
    }

    navigate(`/messages/${profile.username}`)
  }

  const handleGoLive = () => {
    if (!profile?.is_creator && !isAdmin) return
    navigate('/creator-hub/live/setup')
  }

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <AppHeader />
        <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
          <div className="flex items-center gap-3 text-zinc-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading profile...
          </div>
        </main>
      </div>
    )
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <AppHeader />
        <main className="mx-auto max-w-4xl px-4 py-12">
          <Card className="border-red-500/30 bg-red-950/30 p-6">
            <h1 className="text-2xl font-bold">Profile not found</h1>
            <p className="mt-2 text-sm text-red-100/80">
              This creator profile does not exist or is not available.
            </p>
            <Button className="mt-5" onClick={() => navigate('/')}>
              Back Home
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#7f1d1d_0%,#18181b_42%,#09090b_100%)] text-white">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur">
          <div className="relative h-36 bg-gradient-to-r from-red-900 via-red-950 to-black">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.20),transparent_35%)]" />
          </div>

          <div className="px-5 pb-6 md:px-8">
            <div className="-mt-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-5 md:flex-row md:items-end">
                <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-zinc-950 bg-zinc-900 shadow-2xl ring-2 ring-yellow-400/30">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-700 to-yellow-600 text-4xl font-black text-black">
                      {getInitials(profile)}
                    </div>
                  )}

                  {isOwnProfile && (
                    <>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadAvatarMutation.isPending}
                        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/70 py-2 text-xs font-semibold text-white transition hover:bg-black/85 disabled:opacity-60"
                      >
                        {uploadAvatarMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Camera className="h-3.5 w-3.5" />
                        )}
                        Upload
                      </button>
                    </>
                  )}
                </div>

                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                      {profile.display_name || profile.username}
                    </h1>

                    {roleBadge && RoleIcon && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${roleBadge.className}`}
                      >
                        <RoleIcon className="h-3.5 w-3.5" />
                        {roleBadge.label}
                      </span>
                    )}

                    {profile.is_creator && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-400 bg-red-500 px-2.5 py-1 text-xs font-black text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verified Creator
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowBadges(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1 text-xs font-bold text-yellow-200 transition hover:bg-yellow-400/20"
                    >
                      <Award className="h-3.5 w-3.5" />
                      {unlockedBadges.length} Badges
                    </button>
                  </div>

                  <p className="mt-1 text-sm font-medium text-zinc-300">@{profile.username}</p>

                  {profile.bio ? (
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-100">{profile.bio}</p>
                  ) : (
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
                      No bio yet.
                    </p>
                  )}

                  {uploadError && (
                    <p className="mt-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
                      {uploadError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {isOwnProfile ? (
                  <>
                    <Button variant="outline" onClick={() => navigate('/edit-profile')}>
                      Edit Profile
                    </Button>

                    {(profile.is_creator || isAdmin) && (
                      <Button onClick={handleGoLive}>
                        <Radio className="mr-2 h-4 w-4" />
                        Go Live
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      disabled={followMutation.isPending || unfollowMutation.isPending}
                      onClick={() => {
                        if (isFollowing) {
                          unfollowMutation.mutate()
                        } else {
                          followMutation.mutate()
                        }
                      }}
                    >
                      {isFollowing ? (
                        'Following'
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Follow
                        </>
                      )}
                    </Button>

                    <Button variant="outline" onClick={() => setShowTierSelect((value) => !value)}>
                      <Crown className="mr-2 h-4 w-4" />
                      {hasActiveSubscription ? 'Subscribed' : 'Subscribe'}
                    </Button>

                    <Button variant="outline" onClick={handleMessage}>
                      <Mail className="mr-2 h-4 w-4" />
                      Message
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
              <InteractiveStatCard icon={Users} label="Subscribers" value={(profile.subscriber_count ?? 0).toLocaleString()} hint="Audience growth" />
              <InteractiveStatCard icon={VideoIcon} label="Total Views" value={(profile.total_views ?? 0).toLocaleString()} hint="Watch momentum" />

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">Creator Progression</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">"Earn coins. Hit milestones. Cash out."</p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-300">Current Balance</span>
                    <span className="font-bold text-yellow-300">{(walletQuery.data?.mai_coins || 0).toLocaleString()} coins</span>
                  </div>
                  {(() => {
                    const coins = walletQuery.data?.mai_coins || 0
                    const currentTier = getCurrentCashoutTier(coins)
                    const nextTier = getNextCashoutTier(coins)
                    const progress = getProgressToNextTier(coins)
                    const remaining = getCoinsRemainingToNextTier(coins)
                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-300">Unlocked Tier</span>
                          <span className="font-bold text-green-300">
                            {currentTier ? `${currentTier.name} → $${currentTier.payoutUsd}` : 'None'}
                          </span>
                        </div>
                        {nextTier && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-300">Next Tier</span>
                              <span className="font-bold text-yellow-300">
                                {nextTier.name} → ${nextTier.payoutUsd}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-300">Remaining</span>
                              <span className="font-bold text-red-300">{remaining.toLocaleString()} coins</span>
                            </div>
                            <Progress value={progress} className="mt-2 h-2" />
                            <p className="mt-1 text-xs text-zinc-400 text-center">{progress.toFixed(1)}% to next tier</p>
                          </>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>

               <InteractiveStatCard icon={CalendarDays} label="Upcoming" value={(calendarQuery.data?.length ?? 0).toLocaleString()} hint="Creator events" />
            </div>

            {nextBadge && (
              <button
                type="button"
                onClick={() => setShowBadges(true)}
                className="mt-5 flex w-full items-center justify-between gap-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-left transition hover:bg-yellow-400/15"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-black/40 p-3 text-yellow-300">
                    <nextBadge.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-white">Next Badge: {nextBadge.name}</p>
                    <p className="text-sm text-zinc-400">{nextBadge.requirement}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-yellow-300" />
              </button>
            )}
          </div>
        </section>

        {showMessageError && (
          <Card className="mt-6 border-red-500/30 bg-red-950/40 p-4 text-red-100">
            Subscribe to any tier before messaging this creator.
          </Card>
        )}

        {showTierSelect && !isOwnProfile && (
          <Card className="mt-6 border-white/10 bg-black/45 p-5 backdrop-blur">
            <h2 className="text-xl font-black">Choose Subscription Plan</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Unlock creator support perks, messaging access, and exclusive content.
            </p>

            {creatorPlansQuery.isLoading ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
                ))}
              </div>
            ) : creatorPlansQuery.data && creatorPlansQuery.data.length > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {creatorPlansQuery.data.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    disabled={subscribeMutation.isPending}
                    onClick={() => subscribeMutation.mutate(plan)}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-yellow-400/50 hover:bg-yellow-500/10 disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">{plan.name}</p>
                      <Crown className="h-4 w-4 text-yellow-300" />
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">{plan.price_coins} MAI coins/month</p>
                    <p className="mt-3 text-xs text-zinc-400">
                      {plan.features?.length ? plan.features.join(', ') : 'Creator support and perks'}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-400">
                This creator hasn't set up any subscription plans yet.
              </p>
            )}
          </Card>
        )}

        {profile.is_creator && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">Creator Calendar</h2>
                <p className="text-sm text-zinc-400">
                  Upcoming lives, premieres, drops, and creator events.
                </p>
              </div>

              {isOwnProfile && (
                <Button variant="outline" onClick={() => navigate('/creator-hub')}>
                  Manage Calendar
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {calendarQuery.isLoading ? (
                <Card className="border-white/10 bg-black/40 p-5 text-zinc-300">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Loading calendar...
                </Card>
               ) : (calendarQuery.data ?? []).length > 0 ? (
                 (calendarQuery.data ?? []).map((event) => (
                  <button
                    type="button"
                    key={event.id}
                    className="rounded-xl border border-white/10 bg-black/45 p-5 text-left backdrop-blur transition hover:border-yellow-400/40 hover:bg-yellow-400/10"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-red-500/20 p-3 text-red-100">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-yellow-200">
                          {formatEventTime(event.starts_at)}
                        </p>
                        <h3 className="mt-1 text-lg font-black">{event.title}</h3>
                        {event.description && (
                          <p className="mt-2 line-clamp-3 text-sm text-zinc-300">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <Card className="border-white/10 bg-black/40 p-5 text-zinc-300">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>No public creator events scheduled yet.</span>
                    {isOwnProfile && (
                      <Button size="sm" onClick={() => navigate('/creator-hub/live/setup')}>
                        Schedule Live
                      </Button>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">Mai Content</h2>
              <p className="text-sm text-zinc-400">
                {totalApprovedCount.toLocaleString()} public approved uploads
              </p>
            </div>

            <div className="flex rounded-xl border border-white/10 bg-black/40 p-1">
              {[
                { key: 'all', label: 'All', icon: VideoIcon },
                { key: 'shorts', label: 'Shorts', icon: PlayCircle },
                { key: 'movies', label: 'Movies', icon: VideoIcon },
                { key: 'music', label: 'Music', icon: Music },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                    activeTab === key ? 'bg-yellow-400 text-black' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {shortsQuery.isLoading || moviesQuery.isLoading || tracksQuery.isLoading ? (
            <Card className="border-white/10 bg-black/40 p-6 text-zinc-300">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Loading content...
            </Card>
          ) : filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <Card className="border-white/10 bg-black/40 p-8 text-center">
              <VideoIcon className="mx-auto h-10 w-10 text-zinc-500" />
              <h3 className="mt-3 text-lg font-black">No videos yet</h3>
              <p className="mt-1 text-sm text-zinc-400">
                This creator has not published approved public videos.
              </p>

              {isOwnProfile && (
                <Button className="mt-5" onClick={() => navigate('/upload')}>
                  Upload First Video
                </Button>
              )}
            </Card>
          )}
        </section>
      </main>

      {showBadges && (
        <BadgesModal
          badges={badges}
          level={level}
          onClose={() => setShowBadges(false)}
        />
      )}
    </div>
  )
}

function InteractiveStatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users
  label: string
  value: string
  hint: string
}) {
  return (
    <Card className="group border-white/10 bg-white/5 p-4 transition hover:border-yellow-400/40 hover:bg-yellow-400/10">
      <div className="flex items-center gap-2 text-zinc-300">
        <Icon className="h-4 w-4 transition group-hover:text-yellow-300" />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </Card>
  )
}

function BadgesModal({
  badges,
  level,
  onClose,
}: {
  badges: ReturnType<typeof getBadges>
  level: ReturnType<typeof getCreatorLevel>
  onClose: () => void
}) {
  const unlocked = badges.filter((badge) => badge.unlocked).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-yellow-400/20 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-yellow-400">
              Creator System
            </p>
            <h2 className="mt-2 text-3xl font-black">Badges & Level Progress</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {unlocked} / {badges.length} badges unlocked.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Card className="mb-5 border-yellow-400/20 bg-yellow-400/10 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-yellow-200">Creator Level</p>
              <h3 className="text-3xl font-black">{level.level}</h3>
              <p className="mt-1 text-sm text-zinc-400">Next level: {level.next}</p>
            </div>
            <div className="w-full md:max-w-md">
              <Progress value={Math.min(level.progress, 100)} className="h-3" />
              <p className="mt-2 text-right text-xs text-zinc-400">
                {Math.round(Math.min(level.progress, 100))}% to next level
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {badges.map((badge) => {
            const Icon = badge.icon

            return (
              <Card
                key={badge.id}
                className={`border p-5 ${
                  badge.unlocked
                    ? 'border-yellow-400/30 bg-yellow-400/10'
                    : 'border-white/10 bg-black/30'
                }`}
              >
                <div className="flex gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                      badge.unlocked
                        ? 'border-yellow-400/40 bg-yellow-400/20'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    {badge.unlocked ? (
                      <Icon className={`h-7 w-7 ${badge.color}`} />
                    ) : (
                      <Lock className="h-6 w-6 text-zinc-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-black text-white">{badge.name}</h3>
                      {badge.unlocked && <Medal className="h-4 w-4 text-yellow-300" />}
                    </div>

                    <p className="mt-1 text-sm text-zinc-400">{badge.description}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-yellow-200">
                      {badge.requirement}
                    </p>

                    <Progress value={Math.min(badge.progress, 100)} className="mt-3 h-2" />

                    <p className="mt-2 text-right text-xs text-zinc-500">
                      {Math.round(Math.min(badge.progress, 100))}%
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
