import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bookmark,
  Coins,
  Flame,
  Gift,
  Heart,
  Play,
  Search,
  Sparkles,
  Trophy,
  Upload,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { PLACEHOLDER_THUMBNAIL } from '../config/placeholders'

type SortBy = 'popularity' | 'likes' | 'gifts'

function getThumbnail(video: any) {
  return (
    video.mux_thumbnail_url ||
    video.thumbnail_url ||
    video.thumbnail ||
    PLACEHOLDER_THUMBNAIL
  )
}

function getCreatorName(video: any) {
  return (
    video.profiles?.display_name ||
    video.profiles?.username ||
    video.creator?.display_name ||
    video.creator?.username ||
    'MAI Creator'
  )
}

function getVideoTitle(video: any) {
  return video.title || 'Untitled Short'
}

function compactNumber(value: number | null | undefined) {
  const number = Number(value || 0)
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`
  return `${number}`
}

export function ShortsPage() {
  const [sortBy, setSortBy] = useState<SortBy>('popularity')
  const [searchParams] = useSearchParams()
  const searchQuery = (searchParams.get('search') || '').trim().toLowerCase()

  return (
    <div className="min-h-screen overflow-hidden bg-[#020000] text-white">
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @keyframes mai-gold-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(250, 204, 21, 0.22);
          }
          50% {
            box-shadow: 0 0 42px rgba(250, 204, 21, 0.45);
          }
        }
      `}</style>

      <AppHeader />

      <main className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.32),transparent_32%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.24),transparent_30%),linear-gradient(180deg,#090000_0%,#020000_52%,#000_100%)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-8 top-20 h-52 w-52 rounded-full bg-red-600/20 blur-3xl" />
          <div className="absolute right-10 top-36 h-60 w-60 rounded-full bg-yellow-500/20 blur-3xl" />
          <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-red-950/30 blur-3xl" />
        </div>

        <section className="relative z-10 mx-auto max-w-7xl px-4 py-8">
          <div className="mb-7 overflow-hidden rounded-[2rem] border border-yellow-500/20 bg-black/55 p-5 shadow-[0_0_55px_rgba(220,38,38,0.18)] backdrop-blur-xl md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-yellow-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  MaiPlay Viral Feed
                </div>

                <h1 className="text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
                  Create.
                  <span className="block bg-gradient-to-r from-yellow-200 via-yellow-400 to-red-500 bg-clip-text text-transparent">
                    Trend. Get Paid.
                  </span>
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-medium text-zinc-300 md:text-base">
                  Watch premium shorts, gift creators, push videos up the charts, and help creators
                  unlock custom cashouts.
                </p>

                {searchQuery && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/35 px-3 py-1.5 text-sm text-red-100">
                    <Search className="h-4 w-4 text-yellow-300" />
                    Showing results for{' '}
                    <span className="font-black text-yellow-300">“{searchQuery}”</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link to="/upload/short">
                  <Button className="h-12 rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-600 px-6 font-black text-black shadow-[0_0_28px_rgba(250,204,21,0.35)] transition hover:scale-[1.02] hover:from-yellow-200 hover:to-yellow-500">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Short
                  </Button>
                </Link>

                <Link to="/creator-hub">
                  <Button className="h-12 rounded-full border border-red-500/40 bg-red-600/90 px-6 font-black text-white shadow-[0_0_22px_rgba(220,38,38,0.28)] transition hover:scale-[1.02] hover:bg-red-500">
                    <Coins className="mr-2 h-4 w-4" />
                    Creator Hub
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <HeroStat icon={<Gift className="h-5 w-5" />} label="Gift-powered ranking" value="MAI Coins" />
              <HeroStat icon={<Trophy className="h-5 w-5" />} label="Custom cashout goals" value="$25 → $1,000" />
              <HeroStat icon={<Flame className="h-5 w-5" />} label="Built for virality" value="Trend faster" />
            </div>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <SortButton
              active={sortBy === 'popularity'}
              onClick={() => setSortBy('popularity')}
              icon={<Flame className="h-4 w-4" />}
              label="Popularity"
            />
            <SortButton
              active={sortBy === 'likes'}
              onClick={() => setSortBy('likes')}
              icon={<Heart className="h-4 w-4" />}
              label="Likes"
            />
            <SortButton
              active={sortBy === 'gifts'}
              onClick={() => setSortBy('gifts')}
              icon={<Gift className="h-4 w-4" />}
              label="Gifts"
            />
          </div>

          <ShortsGrid sortBy={sortBy} searchQuery={searchQuery} />
        </section>
      </main>
    </div>
  )
}

function ShortsGrid({
  sortBy,
  searchQuery,
}: {
  sortBy: SortBy
  searchQuery: string
}) {
  const { data: shorts, isLoading } = useQuery({
    queryKey: ['shorts-page', sortBy],
    queryFn: async () => {
      let orderBy = 'view_count'
      if (sortBy === 'likes') orderBy = 'like_count'
      if (sortBy === 'gifts') orderBy = 'gift_count'

      const { data, error } = await supabase
        .from('shorts')
        .select('*, profiles:creator_id(*)')
        .eq('visibility', 'public')
        .eq('upload_status', 'ready')
        .eq('moderation_status', 'approved')
        .order(orderBy, { ascending: false })
        .limit(50)

      if (error) throw error
      return data ?? []
    },
    staleTime: 2 * 60 * 1000,
  })

  const filteredShorts = useMemo(() => {
    if (!shorts) return []
    if (!searchQuery) return shorts

    return shorts.filter((short) => {
      const haystack = [
        short.title,
        short.description || '',
        short.category || '',
        short.profiles?.username || '',
        short.profiles?.display_name || '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(searchQuery)
    })
  }, [shorts, searchQuery])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array(20)
          .fill(0)
          .map((_, index) => (
            <div
              key={index}
              className="aspect-[9/16] animate-pulse rounded-[2rem] border border-yellow-500/10 bg-gradient-to-br from-red-950/30 via-black to-zinc-950 shadow-[0_0_30px_rgba(220,38,38,0.12)]"
            />
          ))}
      </div>
    )
  }

  if (filteredShorts.length === 0) {
    return (
      <div className="rounded-[2rem] border border-yellow-500/20 bg-black/55 px-6 py-14 text-center shadow-[0_0_45px_rgba(220,38,38,0.15)] backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-red-600 to-yellow-400 text-black">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-black text-white">No shorts found</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
          {searchQuery
            ? 'Try searching another creator, title, or category.'
            : 'Be the first creator to start the MaiPlay shorts feed.'}
        </p>
        <Link to="/upload/short">
          <Button className="mt-6 rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-600 px-6 font-black text-black shadow-[0_0_24px_rgba(250,204,21,0.35)] hover:from-yellow-200 hover:to-yellow-500">
            Upload First Short
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {filteredShorts.map((short, index) => (
        <ShortCard key={short.id} short={short} rank={index + 1} />
      ))}
    </div>
  )
}

function ShortCard({ short, rank }: { short: any; rank: number }) {
  const [saved, setSaved] = useState(false)

  const handleWatchLater = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setSaved((current) => !current)
  }

  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-yellow-500/20 bg-black/55 shadow-[0_0_32px_rgba(220,38,38,0.16)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:border-yellow-400/50 hover:shadow-[0_0_38px_rgba(250,204,21,0.28)]">
      <Link to={`/short/${short.id}`} className="block">
        <div className="relative aspect-[9/16] overflow-hidden">
          <img
            src={getThumbnail(short)}
            alt={getVideoTitle(short)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            loading="lazy"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/0 via-transparent to-red-500/10 opacity-0 transition group-hover:opacity-100" />

          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-black/65 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-yellow-300 backdrop-blur-xl">
            <Flame className="h-3.5 w-3.5 fill-red-500 text-red-500" />
            #{rank} Trending
          </div>

          <button
            type="button"
            className={`absolute right-3 top-3 rounded-full border p-2 backdrop-blur-xl transition ${
              saved
                ? 'border-yellow-300 bg-yellow-400 text-black shadow-[0_0_22px_rgba(250,204,21,0.45)]'
                : 'border-yellow-500/20 bg-black/65 text-white opacity-0 group-hover:opacity-100 hover:bg-yellow-400 hover:text-black hover:shadow-[0_0_22px_rgba(250,204,21,0.35)]'
            }`}
            onClick={handleWatchLater}
            aria-label={saved ? 'Remove from Watch Later' : 'Add to Watch Later'}
          >
            <Bookmark className={`h-4 w-4 ${saved ? 'fill-black' : ''}`} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-black/55 px-2.5 py-1 text-[11px] font-bold text-yellow-200/90 backdrop-blur-xl">
              <Play className="h-3 w-3 fill-yellow-300 text-yellow-300" />
              Short
            </div>

            <h3 className="line-clamp-2 text-base font-black leading-tight text-white drop-shadow">
              {getVideoTitle(short)}
            </h3>

            <p className="mt-1 text-xs font-semibold text-zinc-300">
              @{getCreatorName(short)}
            </p>

            <p className="mt-1 text-xs font-bold text-yellow-300/85">
              Earn coins • Unlock cashouts
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-bold">
              <StatPill icon={<Play className="h-3.5 w-3.5" />} value={compactNumber(short.view_count)} label="views" />
              <StatPill icon={<Heart className="h-3.5 w-3.5" />} value={compactNumber(short.like_count)} label="likes" />
              <StatPill icon={<Gift className="h-3.5 w-3.5" />} value={compactNumber(short.gift_count)} label="gifts" gold />
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-300 to-yellow-600 shadow-[0_0_16px_rgba(250,204,21,0.75)]"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(12, (Number(short.gift_count || 0) / 5000) * 100),
                  )}%`,
                }}
              />
            </div>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
              5K coins unlocks starter cashout
            </p>
          </div>
        </div>
      </Link>
    </div>
  )
}

function SortButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition ${
        active
          ? 'border-yellow-300 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-600 text-black shadow-[0_0_24px_rgba(250,204,21,0.38)]'
          : 'border-red-500/20 bg-black/45 text-zinc-300 backdrop-blur-xl hover:border-yellow-400/45 hover:text-yellow-200'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-yellow-500/15 bg-black/45 p-4 shadow-[0_0_24px_rgba(250,204,21,0.08)] backdrop-blur-xl">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-red-600 text-black">
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-yellow-300">{value}</p>
    </div>
  )
}

function StatPill({
  icon,
  value,
  label,
  gold,
}: {
  icon: React.ReactNode
  value: string
  label: string
  gold?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border px-2 py-2 text-center backdrop-blur-xl ${
        gold
          ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200'
          : 'border-white/10 bg-black/45 text-zinc-300'
      }`}
    >
      <div className="mx-auto mb-1 flex justify-center">{icon}</div>
      <div className="font-black">{value}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
    </div>
  )
}