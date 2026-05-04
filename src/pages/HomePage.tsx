import React from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Crown,
  Flame,
  Gem,
  Music2,
  Play,
  Radio,
  Search,
  Sparkles,
  Star,
  Upload,
  Video,
  Zap,
} from 'lucide-react'

import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { VideoCard } from '../components/video/VideoCard'
import { useVideos, useTrendingVideos } from '../hooks/useApi'
import { useAuthAccount } from '../auth/AuthAccountProvider'
import { useMaiWallet } from '../hooks/useMaiWallet'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'

function getCreatorLevel(totalViews: number, subscribers: number) {
  const score = totalViews + subscribers * 100

  if (score >= 1_000_000) return { level: 'Diamond', next: 'Max Level', progress: 100, nextScore: 1_000_000 }
  if (score >= 250_000) return { level: 'Platinum', next: 'Diamond', progress: ((score - 250_000) / 750_000) * 100, nextScore: 1_000_000 }
  if (score >= 75_000) return { level: 'Gold', next: 'Platinum', progress: ((score - 75_000) / 175_000) * 100, nextScore: 250_000 }
  if (score >= 15_000) return { level: 'Silver', next: 'Gold', progress: ((score - 15_000) / 60_000) * 100, nextScore: 75_000 }

  return { level: 'Bronze', next: 'Silver', progress: (score / 15_000) * 100, nextScore: 15_000 }
}

const categories = [
  'Music',
  'Cars',
  'Business',
  'Gaming',
  'Education',
  'Entertainment',
  'Food',
  'Comedy',
]

function filterVideos(videos: any[] | undefined, searchQuery: string) {
  if (!videos) return []
  if (!searchQuery) return videos

  return videos.filter((video) => {
    const haystack = [
      video.title,
      video.description || '',
      video.category || '',
      video.profiles?.username || '',
      video.profiles?.display_name || '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(searchQuery)
  })
}

const mainSidebarItems = [
  { label: 'Home', to: '/home' },
  { label: 'Shorts', to: '/shorts' },
  { label: 'Movies', to: '/movies' },
  { label: 'Music', to: '/music' },
  { label: 'Live', to: '/live' },
  { label: 'MAI Spotlight', to: '/spotlight' },
  { label: 'Following', to: '/following' },
  { label: 'Subscriptions', to: '/subscriptions' },
  { label: 'Watch Later', to: '/watch-later' },
  { label: 'Calendar', to: '/calendar' },
  { label: 'Store', to: '/store' },
  { label: 'History', to: '/history' },
]

const creatorHubSidebarItems = [
  { label: 'Creator Hub', to: '/creator-hub' },
  { label: 'Upload', to: '/creator-hub/uploads' },
  { label: 'Cloud', to: '/creator-hub/cloud' },
  { label: 'Go Live', to: '/creator-hub/live/setup' },
  { label: 'Monetization', to: '/creator-hub/monetization' },
]

function SidebarSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-5 shadow-2xl shadow-yellow-500/5">
      <p className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-yellow-400">{title}</p>
      {children}
    </div>
  )
}

function SidebarLink({
  label,
  to,
  active,
}: {
  label: string
  to: string
  active: boolean
}) {
  return (
    <Link
      to={to}
      className={`block rounded-2xl border px-4 py-3 text-sm font-black transition ${
        active
          ? 'border-yellow-400 bg-yellow-400/10 text-white'
          : 'border-white/10 bg-white/5 text-zinc-300 hover:border-yellow-400/40 hover:bg-yellow-400/5 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )
}

export function HomePage() {
  const { data: trendingVideos, isLoading: trendingLoading } = useTrendingVideos()
  const { data: shorts, isLoading: shortsLoading } = useVideos('short')
  const { data: movies, isLoading: moviesLoading } = useVideos('movie')
  const { data: latestVideos, isLoading: latestLoading } = useVideos()

  const location = useLocation()
  const { account } = useAuthAccount()
  const { wallet } = useMaiWallet()
  const isCreator = Boolean(account?.is_creator)
  const isStaff = account?.role === 'admin' || account?.role === 'moderator'

  // Query for today's earnings
  const { data: todayEarnings } = useQuery({
    queryKey: ['today-earnings', account?.id],
    queryFn: async () => {
      if (!account?.id) return 0

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data, error } = await supabase
        .from('mai_coin_transactions')
        .select('amount')
        .eq('user_id', account.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())

      if (error) throw error

      // Sum positive amounts (earnings)
      return (data || []).reduce((sum, transaction) => {
        return transaction.amount > 0 ? sum + transaction.amount : sum
      }, 0)
    },
    enabled: Boolean(account?.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const [searchParams] = useSearchParams()
  const searchQuery = (searchParams.get('search') || '').trim().toLowerCase()

  const filteredTrending = React.useMemo(
    () => filterVideos(trendingVideos, searchQuery),
    [trendingVideos, searchQuery],
  )

  const filteredShorts = React.useMemo(
    () => filterVideos(shorts, searchQuery),
    [shorts, searchQuery],
  )

  const filteredMovies = React.useMemo(
    () => filterVideos(movies, searchQuery),
    [movies, searchQuery],
  )

  const filteredLatest = React.useMemo(
    () => filterVideos(latestVideos, searchQuery),
    [latestVideos, searchQuery],
  )

  const featuredVideo =
    filteredTrending?.[0] || filteredMovies?.[0] || filteredShorts?.[0] || filteredLatest?.[0]

  const topCreators = React.useMemo(() => {
    const allVideos = [...(trendingVideos ?? []), ...(movies ?? []), ...(shorts ?? [])]
    const seen = new Set<string>()

    return allVideos
      .map((video) => ({
        id: video.creator_id || video.profiles?.id,
        name: video.profiles?.display_name || video.profiles?.username || 'Mai Creator',
        username: video.profiles?.username,
        avatar_url: video.profiles?.avatar_url,
      }))
      .filter((creator) => {
        const key = creator.id || creator.username || creator.name
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 5)
  }, [trendingVideos, movies, shorts])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040000] text-white">
      <BackgroundFX />

      <AppHeader />

      <main className="relative z-10 mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="hidden xl:block">
            <SidebarSection title="Main">
              <div className="space-y-2">
                {mainSidebarItems.map((item) => (
                  <SidebarLink
                    key={item.label}
                    label={item.label}
                    to={item.to}
                    active={
                      location.pathname === item.to ||
                      (item.to === '/home' && location.pathname === '/')
                    }
                  />
                ))}
              </div>
            </SidebarSection>

            {(isCreator || isStaff) && (
              <SidebarSection title="Creator Hub">
                <div className="space-y-2">
                  {creatorHubSidebarItems.map((item) => (
                    <SidebarLink
                      key={item.label}
                      label={item.label}
                      to={item.to}
                      active={location.pathname === item.to}
                    />
                  ))}
                </div>
              </SidebarSection>
            )}

            {isStaff && (
              <SidebarSection title="Staff">
                <SidebarLink
                  label="Admin"
                  to="/admin"
                  active={location.pathname === '/admin'}
                />
              </SidebarSection>
            )}
          </aside>

          <section className="space-y-8">
            <HeroSection featuredVideo={featuredVideo} />

            {searchQuery && (
              <div className="rounded-[1.75rem] border border-yellow-400/20 bg-yellow-400/10 p-5 shadow-2xl shadow-yellow-950/20">
                <div className="flex items-center gap-3">
                  <Search className="h-5 w-5 text-yellow-300" />
                  <div>
                    <h2 className="text-xl font-black">
                      Search results for{' '}
                      <span className="text-yellow-300">"{searchQuery}"</span>
                    </h2>
                    <p className="text-sm text-zinc-400">
                      {filteredLatest.length + filteredMovies.length + filteredShorts.length} matches found
                    </p>
                  </div>
                </div>
              </div>
            )}

            <PremiumStrip />

            <VideoSection
              id="featured-movies"
              title="Featured Movies"
              eyebrow="Cinema Drops"
              icon={Crown}
              accent="gold"
              loading={moviesLoading}
              videos={[...filteredMovies]
                .sort(
                  (a, b) =>
                    (b.boost_score || 0) - (a.boost_score || 0) ||
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                )
                .slice(0, 5)}
              emptyTitle="No premium movies published yet"
              emptyText="Creator movies will appear here once published."
              skeletonCount={5}
            />

            <VideoSection
              id="trending-now"
              title="Trending Now"
              eyebrow="Live Heat"
              icon={Flame}
              accent="red"
              loading={trendingLoading}
              videos={filteredTrending.slice(0, 5)}
              emptyTitle="No trending videos yet"
              emptyText="Upload content, boost it, and claim the first trending spot."
              skeletonCount={5}
            />

            <VideoSection
              id="latest-shorts"
              title="Latest Shorts"
              eyebrow="Fast Discovery"
              icon={Zap}
              accent="gold"
              loading={shortsLoading}
              videos={filteredShorts.slice(0, 5)}
              emptyTitle="No shorts published yet"
              emptyText="Shorts will appear here when creators upload."
              skeletonCount={5}
            />

            <VideoSection
              id="latest-content"
              title="Latest Content"
              eyebrow="New Releases"
              icon={Star}
              accent="red"
              loading={latestLoading}
              videos={filteredLatest.slice(0, 5)}
              emptyTitle="No content published yet"
              emptyText="Once creators publish content, it will appear here."
              skeletonCount={5}
            />

            <Categories />
          </section>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:h-fit">
            {account?.is_creator ? (
              <CreatorEmpireCard account={account} />
            ) : (
              <UserStatsCard account={account} />
            )}
            <EarningsCard wallet={wallet} todayEarnings={todayEarnings || 0} isCreator={isCreator} />
            <TopCreatorsCard creators={topCreators} />
            <QuickJumpCard />
          </aside>
        </div>
      </main>
    </div>
  )
}

function BackgroundFX() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-48 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-red-700/30 blur-[120px]" />
      <div className="absolute top-32 -left-32 h-[520px] w-[520px] rounded-full bg-yellow-500/15 blur-[110px]" />
      <div className="absolute bottom-0 right-0 h-[680px] w-[680px] rounded-full bg-red-950/50 blur-[130px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,230,120,0.12),transparent_32%),linear-gradient(135deg,rgba(120,0,0,0.42),transparent_45%),linear-gradient(180deg,rgba(0,0,0,0.15),#040000_80%)]" />
      <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:44px_44px]" />
    </div>
  )
}

function HeroSection({ featuredVideo }: { featuredVideo?: any }) {
  const thumbnail =
    featuredVideo?.thumbnail_url ||
    featuredVideo?.mux_thumbnail_url ||
    featuredVideo?.cover_url ||
    ''

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-yellow-400/20 bg-black/55 shadow-2xl shadow-red-950/40 backdrop-blur-xl">
      <div className="absolute inset-0">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="h-full w-full object-cover opacity-25 blur-[1px]" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-red-950/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(250,204,21,0.20),transparent_28%)]" />
      </div>

      <div className="relative grid min-h-[520px] gap-8 p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-12">
        <div className="flex flex-col justify-end">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
            <Sparkles className="h-4 w-4" />
            MAI Premium Spotlight
          </div>

          <h1 className="max-w-5xl text-5xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-7xl xl:text-8xl">
            Where Creators Become{' '}
            <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(250,204,21,0.25)]">
              Legends
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
            The glossy creator-powered entertainment network for shorts, movies,
            music, live shows, fan economies, and MAI-powered monetization.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link to={featuredVideo?.id ? `/video/${featuredVideo.id}` : '/shorts'}>
              <Button className="h-13 rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-red-500 px-7 font-black text-black shadow-2xl shadow-yellow-500/25 transition hover:scale-[1.03]">
                <Play className="mr-2 h-5 w-5" fill="black" />
                Watch Now
              </Button>
            </Link>

            <Link to="/creator-hub">
              <Button
                variant="outline"
                className="h-13 rounded-2xl border-white/15 bg-white/5 px-7 font-black text-white backdrop-blur-xl hover:bg-white/10"
              >
                Build Your Empire
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative hidden items-end lg:flex">
          <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-yellow-950/20 backdrop-blur-2xl">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-yellow-400/20 bg-black">
              {thumbnail ? (
                <img src={thumbnail} alt={featuredVideo?.title || 'Featured'} className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-red-950 via-black to-yellow-950">
                  <Play className="h-16 w-16 text-yellow-300" fill="currentColor" />
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-yellow-300/40 bg-black/55 text-yellow-200 shadow-2xl shadow-yellow-500/30 backdrop-blur-md">
                  <Play className="ml-1 h-9 w-9" fill="currentColor" />
                </div>
              </div>
            </div>

            <div className="p-4">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-300">
                Featured Drop
              </p>
              <h3 className="mt-2 line-clamp-1 text-2xl font-black">
                {featuredVideo?.title || 'Creator Spotlight Coming Soon'}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Boosted discovery · Fan-funded momentum · MAI economy
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PremiumStrip() {
  const items = [
    { icon: Video, label: 'Shorts', text: 'Fast discovery' },
    { icon: Crown, label: 'Movies', text: 'Premium releases' },
    { icon: Music2, label: 'Music', text: 'Creator tracks' },
    { icon: Radio, label: 'Live', text: 'Real-time earning' },
  ]

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            className="group rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-1 hover:border-yellow-400/30 hover:bg-yellow-400/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-red-600 text-black shadow-lg shadow-yellow-500/20">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-black">{item.label}</h3>
            <p className="text-sm text-zinc-400">{item.text}</p>
          </div>
        )
      })}
    </section>
  )
}

function VideoSection({
  id,
  title,
  eyebrow,
  icon: Icon,
  accent,
  loading,
  videos,
  emptyTitle,
  emptyText,
  skeletonCount,
}: {
  id: string
  title: string
  eyebrow: string
  icon: React.ElementType
  accent: 'red' | 'gold'
  loading: boolean
  videos: any[]
  emptyTitle: string
  emptyText: string
  skeletonCount: number
}) {
  return (
    <section id={id} className="rounded-[2rem] border border-white/10 bg-black/35 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p
            className={[
              'mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em]',
              accent === 'gold' ? 'text-yellow-300' : 'text-red-300',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            {eyebrow}
          </p>
          <h2 className="text-3xl font-black">{title}</h2>
        </div>

        <Link to="/shorts" className="text-sm font-black text-yellow-300 hover:text-yellow-200">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {loading ? (
          Array(skeletonCount)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="aspect-video animate-pulse rounded-2xl border border-white/10 bg-white/10"
              />
            ))
        ) : videos.length > 0 ? (
          videos.map((video) => <VideoCard key={video.id} video={video} />)
        ) : (
          <div className="col-span-full rounded-[1.75rem] border border-yellow-400/20 bg-gradient-to-br from-black via-red-950/20 to-black p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400/10 text-3xl">
              🔥
            </div>
            <p className="mt-4 text-xl font-black text-white">{emptyTitle}</p>
            <p className="mt-2 text-sm text-zinc-400">{emptyText}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/upload">
                <Button className="rounded-xl bg-yellow-400 font-black text-black hover:bg-yellow-300">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </Link>
              <Link to="/go-live">
                <Button className="rounded-xl bg-red-600 font-black text-white hover:bg-red-500">
                  Go Live
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function Categories() {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-yellow-400">
          Discover
        </p>
        <h2 className="mt-2 text-3xl font-black">Browse by Category</h2>
      </div>

      <div className="flex flex-wrap gap-3">
        {categories.map((cat) => (
          <Link key={cat} to={`/home?category=${cat.toLowerCase()}`}>
            <Button
              variant="outline"
              className="rounded-2xl border-yellow-400/30 bg-black/40 px-5 text-yellow-200 shadow-lg shadow-yellow-950/10 hover:bg-yellow-400/10 hover:text-yellow-100"
            >
              {cat}
            </Button>
          </Link>
        ))}
      </div>
    </section>
  )
}

function CreatorEmpireCard({ account }: { account: any }) {
  return (
    <SidebarCard title="Creator Empire">
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">Build the next media empire</p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <MiniStat value={(account?.subscriber_count || 0).toLocaleString()} label="Subscribers" />
          <MiniStat value={(account?.total_views || 0).toLocaleString()} label="Views" />
          <MiniStat value={(account?.total_views || 0).toLocaleString()} label="Likes" />
          <MiniStat value={(account?.subscriber_count || 0).toLocaleString()} label="Followers" />
        </div>

        <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-black/40 p-4">
          <div className="flex justify-between">
            <p className="font-black">Creator Level</p>
            <p className="font-black text-yellow-300">{getCreatorLevel(account?.total_views || 0, account?.subscriber_count || 0).level}</p>
          </div>
          <div className="mt-4 h-2 rounded-full bg-zinc-800">
            <div className="h-2 w-[65%] rounded-full bg-gradient-to-r from-yellow-400 to-red-500" style={{ width: `${Math.min(getCreatorLevel(account?.total_views || 0, account?.subscriber_count || 0).progress, 100)}%` }} />
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            {(account?.total_views || 0) + (account?.subscriber_count || 0) * 100} / {getCreatorLevel(account?.total_views || 0, account?.subscriber_count || 0).nextScore} XP to {getCreatorLevel(account?.total_views || 0, account?.subscriber_count || 0).next}
          </p>
        </div>
      </div>
    </SidebarCard>
  )
}

function UserStatsCard({ account }: { account: any }) {
  // Query for user's following count
  const { data: followingCount } = useQuery({
    queryKey: ['user-following-count', account?.id],
    queryFn: async () => {
      if (!account?.id) return 0

      const { count, error } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('subscriber_id', account.id)

      if (error) throw error
      return count || 0
    },
    enabled: Boolean(account?.id),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <SidebarCard title="Your Activity">
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">Your MaiPlay journey</p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <MiniStat value={(followingCount || 0).toString()} label="Following" />
          <MiniStat value="0" label="Watched" />
          <MiniStat value="0" label="Liked" />
          <MiniStat value="0" label="Saved" />
        </div>

        <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-black/40 p-4">
          <div className="flex justify-between">
            <p className="font-black">Fan Level</p>
            <p className="font-black text-yellow-300">Supporter</p>
          </div>
          <div className="mt-4 h-2 rounded-full bg-zinc-800">
            <div className="h-2 w-[25%] rounded-full bg-gradient-to-r from-yellow-400 to-red-500" />
          </div>
          <p className="mt-3 text-xs text-zinc-400">Keep supporting creators to level up!</p>
        </div>
      </div>
    </SidebarCard>
  )
}

function EarningsCard({ wallet, todayEarnings, isCreator }: { wallet: any, todayEarnings: number, isCreator?: boolean }) {
  return (
    <SidebarCard title="MAI Money Engine">
      <div className="space-y-4">
        <MoneyRow label="Your Balance" value={`${wallet?.mai_coins || 0} coins`} />
        {isCreator ? (
          <>
            <MoneyRow label="Lifetime Earned" value={`${wallet?.lifetime_earned || 0} coins`} green />
            <MoneyRow label="Lifetime Spent" value={`${wallet?.lifetime_spent || 0} coins`} red />
          </>
        ) : (
          <>
            <MoneyRow label="Total Spent" value={`${wallet?.lifetime_spent || 0} coins`} red />
            <MoneyRow label="Gifts Given" value="0 coins" />
          </>
        )}

        <div className="h-2 rounded-full bg-zinc-800">
          <div className="h-2 w-[0%] rounded-full bg-gradient-to-r from-yellow-400 to-red-500" />
        </div>

        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
          <p className="text-sm font-black text-yellow-200">Today Earnings</p>
          <p className="mt-1 text-3xl font-black text-yellow-300">+{todayEarnings || 0} coins</p>
          <p className="text-xs text-zinc-400">{isCreator ? 'From views and gifts' : 'From rewards and gifts'}</p>
        </div>

        {isCreator && (
          <Link to="/creator-hub/live/setup">
            <Button className="w-full rounded-2xl bg-gradient-to-r from-red-600 to-yellow-400 font-black text-black">
              <Radio className="mr-2 h-4 w-4" />
              Go Live Now
            </Button>
          </Link>
        )}
      </div>
    </SidebarCard>
  )
}

function TopCreatorsCard({ creators }: { creators: any[] }) {
  return (
    <SidebarCard title="Top Creators">
      <div className="space-y-3">
        {creators.length > 0 ? (
          creators.map((creator, index) => (
            <div
              key={`${creator.id}-${creator.username}`}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-black">
                {index + 1}
              </div>

              <div className="h-10 w-10 overflow-hidden rounded-full bg-red-950">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt={creator.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-yellow-400 text-xs font-black text-black">
                    {creator.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate font-black text-white">{creator.name}</p>
                {creator.username && <p className="truncate text-xs text-zinc-400">@{creator.username}</p>}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-400">Creators will appear once content starts trending.</p>
        )}
      </div>
    </SidebarCard>
  )
}

function QuickJumpCard() {
  const links = [
    { label: 'Featured Movies', to: '#featured-movies', icon: Crown },
    { label: 'Trending Now', to: '#trending-now', icon: Flame },
    { label: 'Latest Shorts', to: '#latest-shorts', icon: Zap },
    { label: 'Latest Content', to: '#latest-content', icon: Star },
  ]

  return (
    <SidebarCard title="Quick Jump">
      <div className="space-y-3">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <a
              key={link.to}
              href={link.to}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black transition hover:border-yellow-400/40 hover:bg-yellow-400/10"
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-yellow-300" />
                {link.label}
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-500" />
            </a>
          )
        })}
      </div>
    </SidebarCard>
  )
}

function SidebarCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-2xl shadow-yellow-950/10 backdrop-blur-2xl">
      <h3 className="mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[0.28em] text-yellow-300">
        <Gem className="h-4 w-4" />
        {title}
      </h3>
      {children}
    </section>
  )
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  )
}

function MoneyRow({
  label,
  value,
  green,
  red,
}: {
  label: string
  value: string
  green?: boolean
  red?: boolean
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-zinc-300">{label}</span>
      <span
        className={[
          'font-black',
          green ? 'text-emerald-400' : '',
          red ? 'text-red-300' : '',
          !green && !red ? 'text-yellow-300' : '',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}