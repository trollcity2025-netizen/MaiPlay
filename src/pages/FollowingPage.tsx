import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Crown,
  Flame,
  Gift,
  Radio,
  Search,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react'

import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import { useAuthAccount } from '../auth/AuthAccountProvider'

const tabs = ['All', 'Active', 'Expired'] as const

type Tab = (typeof tabs)[number]

type FollowingCreator = {
  id: string
  status: string
  created_at: string
  creator: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

export function FollowingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const { account } = useAuthAccount()

  const followingQuery = useQuery<FollowingCreator[]>({
    queryKey: ['following-creators', account?.id],
    queryFn: async () => {
      if (!account?.id) return []

      const { data, error } = await supabase
        .from('subscriptions')
        .select(
          'id, status, created_at, creator:creator_id(id, username, display_name, avatar_url)'
        )
        .eq('subscriber_id', account.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const results = (data || []).map((item: any) => ({
        id: item.id,
        status: item.status,
        created_at: item.created_at,
        creator: Array.isArray(item.creator) ? item.creator[0] ?? null : item.creator ?? null,
      })) as FollowingCreator[]

      return results
    },
    enabled: Boolean(account?.id),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  const followingCreators = followingQuery.data || []
  const activeCount = followingCreators.filter((item) => item.status === 'active').length
  const expiredCount = followingCreators.filter((item) => item.status !== 'active').length

  const filteredCreators = useMemo(() => {
    return followingCreators.filter((item) => {
      const matchesTab =
        activeTab === 'All' ||
        (activeTab === 'Active' && item.status === 'active') ||
        (activeTab === 'Expired' && item.status !== 'active')

      const name = item.creator?.display_name || item.creator?.username || 'Creator'
      const username = item.creator?.username || ''
      const matchesSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        username.toLowerCase().includes(search.toLowerCase())

      return matchesTab && matchesSearch
    })
  }, [activeTab, followingCreators, search])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050000] text-white">
      <BackgroundFX />
      <AppHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[2.5rem] border border-yellow-400/20 bg-black/50 p-6 shadow-2xl shadow-red-950/40 backdrop-blur-xl md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
                <Sparkles className="h-4 w-4" />
                Your Inner Circle
              </div>

              <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-[-0.04em] md:text-7xl">
                Following{' '}
                <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                  Feed
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
                Stay locked in with creators you follow. Catch live rooms, new
                drops, VIP posts, boosts, gifts, and spotlight moments first.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[430px]">
              <StatCard icon={Users} label="Following" value={followingCreators.length.toString()} />
              <StatCard icon={Radio} label="Active" value={activeCount.toString()} />
              <StatCard icon={Gift} label="Expired" value={expiredCount.toString()} />
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-yellow-300/70" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search followed creators..."
                className="h-14 rounded-2xl border-yellow-400/20 bg-black/60 pl-12 text-white placeholder:text-zinc-500 focus-visible:ring-yellow-400/40"
              />
            </div>

            <Button className="h-14 rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-red-500 font-black text-black shadow-2xl shadow-yellow-500/20 hover:scale-[1.02]">
              <Bell className="mr-2 h-5 w-5" />
              Manage Alerts
            </Button>
          </div>
        </section>

        <section className="mt-6 flex gap-3 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'shrink-0 rounded-full border px-5 py-3 text-sm font-black transition-all',
                activeTab === tab
                  ? 'border-yellow-300 bg-gradient-to-r from-yellow-300 to-red-500 text-black shadow-xl shadow-yellow-500/20'
                  : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-200',
              )}
            >
              {tab}
            </button>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            {followingQuery.isLoading ? (
              Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-[2rem] border border-white/10 bg-white/10"
                />
              ))
            ) : filteredCreators.length > 0 ? (
              filteredCreators.map((creator) => (
                <CreatorFeedCard key={creator.id} creator={creator} />
              ))
            ) : (
              <EmptyState />
            )}
          </div>

          <aside className="space-y-5">
            <GlossyPanel title="Priority Alerts">
              <div className="space-y-3">
                <AlertRow icon={Radio} title="Live notifications" text="Get alerted when followed creators go live." />
                <AlertRow icon={Crown} title="VIP drops" text="Never miss exclusive creator releases." />
                <AlertRow icon={Flame} title="Trending jumps" text="See when your followed creators heat up." />
              </div>
            </GlossyPanel>

            <GlossyPanel title="Top Followed">
              <div className="space-y-3">
                {followingCreators.slice(0, 3).map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-black">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">
                        {item.creator?.display_name || item.creator?.username || 'Creator'}
                      </p>
                      <p className="truncate text-xs text-zinc-400">
                        {item.status === 'active' ? 'Active membership' : 'Subscription expired'}
                      </p>
                    </div>
                    <Star className="h-4 w-4 text-yellow-300" />
                  </div>
                ))}
                {followingCreators.length === 0 && (
                  <p className="text-sm text-zinc-400">
                    Follow creators to populate the leaderboard here.
                  </p>
                )}
              </div>
            </GlossyPanel>
          </aside>
        </section>
      </main>
    </div>
  )
}

function CreatorFeedCard({ creator }: { creator: FollowingCreator }) {
  const name = creator.creator?.display_name || creator.creator?.username || 'Creator'
  const handle = creator.creator?.username ? `@${creator.creator.username}` : ''
  const statusLabel = creator.status === 'active' ? 'Active' : 'Expired'
  const profileLink = creator.creator?.username ? `/profile/${creator.creator.username}` : '#'
  const joinedAt = new Date(creator.created_at).toLocaleDateString()

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/10 bg-black/45 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-1 hover:border-yellow-400/30">
      <div className="relative min-h-[260px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-yellow-400/10 via-black/30 to-red-900/20 p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(250,204,21,0.18),transparent_35%)]" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-black text-xl font-black text-yellow-300 shadow-xl shadow-yellow-500/10">
              {name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-black">{name}</h2>
              <p className="text-sm text-zinc-300">{handle}</p>
            </div>
          </div>

          <span className={cn(
            'rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em]',
            creator.status === 'active'
              ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
              : 'border-red-400/30 bg-red-500/15 text-red-200',
          )}>
            {statusLabel}
          </span>
        </div>

        <div className="relative z-10 mt-12 max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-200">
            Followed Creator
          </p>
          <h3 className="mt-3 text-4xl font-black leading-tight">
            {creator.status === 'active'
              ? 'Subscribed creator updates appear here.'
              : 'This creator membership has ended.'}
          </h3>
        </div>

        <div className="relative z-10 mt-8 flex flex-wrap gap-3">
          <Link to={profileLink}>
            <Button className="rounded-2xl bg-yellow-400 font-black text-black hover:bg-yellow-300">
              View Profile
            </Button>
          </Link>
          <Button
            variant="outline"
            className="rounded-2xl border-white/15 bg-black/35 font-black text-white hover:bg-white/10"
          >
            Joined {joinedAt}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 border-t border-white/10 bg-black/50 p-4 sm:grid-cols-3">
        <MiniMetric icon={Users} label="Creator" value={name} />
        <MiniMetric icon={Crown} label="Status" value={statusLabel} />
        <MiniMetric icon={Zap} label="Joined" value={joinedAt} />
      </div>
    </article>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
      <Icon className="h-5 w-5 text-yellow-300" />
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  )
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-yellow-300">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-black uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  )
}

function GlossyPanel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-2xl shadow-yellow-950/10 backdrop-blur-2xl">
      <h3 className="mb-5 text-sm font-black uppercase tracking-[0.28em] text-yellow-300">
        {title}
      </h3>
      {children}
    </section>
  )
}

function AlertRow({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <Icon className="h-5 w-5 text-yellow-300" />
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-1 text-sm text-zinc-400">{text}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-[2rem] border border-yellow-400/20 bg-black/45 p-12 text-center shadow-2xl shadow-yellow-950/10 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400/10 text-4xl">
        ⭐
      </div>
      <h2 className="mt-6 text-3xl font-black">No followed creators found</h2>
      <p className="mx-auto mt-3 max-w-md text-zinc-400">
        Follow creators to build your personalized feed of lives, drops, VIP
        content, and MAI-powered creator updates.
      </p>
      <Button className="mt-6 rounded-2xl bg-yellow-400 font-black text-black hover:bg-yellow-300">
        Discover Creators
      </Button>
    </div>
  )
}

function BackgroundFX() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-48 left-1/2 h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-red-700/25 blur-[120px]" />
      <div className="absolute top-32 -left-32 h-[520px] w-[520px] rounded-full bg-yellow-500/15 blur-[110px]" />
      <div className="absolute bottom-0 right-0 h-[650px] w-[650px] rounded-full bg-red-950/50 blur-[130px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,230,120,0.12),transparent_32%),linear-gradient(135deg,rgba(120,0,0,0.42),transparent_45%),linear-gradient(180deg,rgba(0,0,0,0.15),#050000_80%)]" />
    </div>
  )
}