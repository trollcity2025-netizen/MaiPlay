import React, { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Crown,
  Flame,
  Gift,
  Play,
  Search,
  Sparkles,
  Star,
  Trophy,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { PLACEHOLDER_THUMBNAIL } from '../config/placeholders'

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
  return video.title || 'Untitled Video'
}

function formatNumber(value: number | null | undefined) {
  return (value || 0).toLocaleString()
}

export function SpotlightPage() {
  const [searchParams] = useSearchParams()
  const searchQuery = (searchParams.get('search') || '').trim().toLowerCase()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030303] text-white">
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(160,0,0,0.38),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(255,200,0,0.10),transparent_28%),linear-gradient(180deg,#040404_0%,#050000_48%,#000_100%)]" />
        <div className="absolute left-0 top-0 h-full w-[420px] bg-gradient-to-r from-red-950/35 to-transparent" />
      </div>

      <AppHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-black/50 shadow-2xl shadow-red-950/20">
          <div className="relative min-h-[320px] p-6 sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_24%,rgba(250,204,21,0.18),transparent_30%),radial-gradient(circle_at_20%_10%,rgba(239,68,68,0.32),transparent_34%),linear-gradient(135deg,rgba(127,29,29,0.6),rgba(0,0,0,0.82)_58%,rgba(113,63,18,0.24))]" />

            <div className="relative max-w-4xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-3 py-1 text-xs font-black uppercase tracking-wide text-black shadow-lg shadow-yellow-500/20">
                <Star className="h-3.5 w-3.5 fill-black" />
                MAI Spotlight
              </div>

              <h1 className="max-w-4xl text-5xl font-black uppercase leading-tight sm:text-6xl">
                Top creators.
                <br />
                <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                  Real momentum.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                Discover the videos, creators, and cashout-driven moments rising across
                the MAI network.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/home?sort=spotlight">
                  <Button className="rounded-xl bg-yellow-400 px-6 py-3 font-black text-black shadow-lg shadow-yellow-500/20 hover:bg-yellow-300">
                    <Play className="mr-2 h-4 w-4 fill-black" />
                    Watch Spotlight
                  </Button>
                </Link>

                <Link to="/upload">
                  <Button
                    variant="outline"
                    className="rounded-xl border-white/15 bg-black/40 px-6 py-3 font-black text-white hover:bg-white/10"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload & Compete
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {searchQuery && (
          <section className="mb-6 rounded-2xl border border-yellow-400/20 bg-yellow-950/20 p-4">
            <div className="flex items-center gap-2 text-yellow-200">
              <Search className="h-4 w-4" />
              <p className="text-sm font-bold">
                Showing spotlight results for “{searchQuery}”
              </p>
            </div>
          </section>
        )}

        <SpotlightGrid searchQuery={searchQuery} />
      </main>
    </div>
  )
}

function SpotlightGrid({ searchQuery }: { searchQuery: string }) {
  const { data: spotlight, isLoading } = useQuery({
    queryKey: ['spotlight-page'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles:creator_id(*)')
        .eq('visibility', 'public')
        .eq('upload_status', 'ready')
        .eq('moderation_status', 'approved')
        .not('mux_playback_id', 'is', null)
        .order('boost_score', { ascending: false, nullsFirst: false })
        .order('view_count', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data ?? []
    },
    staleTime: 2 * 60 * 1000,
  })

  const filteredSpotlight = useMemo(() => {
    if (!spotlight) return []
    if (!searchQuery) return spotlight

    return spotlight.filter((video) => {
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
  }, [spotlight, searchQuery])

  const topVideo = filteredSpotlight[0]
  const topFive = filteredSpotlight.slice(0, 5)
  const remainingVideos = filteredSpotlight.slice(5)

  return (
    <>
      {isLoading ? (
        <SpotlightSkeleton />
      ) : filteredSpotlight.length > 0 ? (
        <div className="space-y-10">
          {topVideo && <SpotlightHeroFeature video={topVideo} />}

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <h2 className="text-2xl font-black">Top 5 Spotlight Picks</h2>
              </div>

              <p className="text-sm font-bold text-yellow-300">
                Ranked by boost, views, and momentum
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {topFive.map((video, index) => (
                <SpotlightRankCard key={video.id} video={video} rank={index + 1} />
              ))}
            </div>
          </section>

          {remainingVideos.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-400" />
                <h2 className="text-2xl font-black">Rising Spotlight</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {remainingVideos.map((video) => (
                  <SpotlightCard key={video.id} video={video} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <SpotlightEmptyState />
      )}
    </>
  )
}

function SpotlightHeroFeature({ video }: { video: any }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-black/50 shadow-2xl shadow-yellow-950/10">
      <Link to={`/video/${video.id}`} className="group grid lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative min-h-[360px] overflow-hidden">
            <img
              src={getThumbnail(featured)}
              alt={getVideoTitle(featured)}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = PLACEHOLDER_THUMBNAIL
              }}
            />

          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

          <div className="absolute left-5 top-5 rounded-lg bg-yellow-400 px-3 py-1 text-xs font-black uppercase text-black">
            #1 Spotlight
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
              {getVideoTitle(video)}
            </h2>

            <p className="mt-2 text-sm font-semibold text-zinc-300">
              @{getCreatorName(video)}
            </p>

            <div className="mt-5 inline-flex rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition group-hover:bg-yellow-300">
              <Play className="mr-2 h-4 w-4 fill-black" />
              Watch Now
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center border-t border-white/10 bg-black/60 p-6 lg:border-l lg:border-t-0">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-yellow-400">
            Momentum Stats
          </p>

          <div className="mt-5 grid gap-3">
            <SpotlightMetric icon={TrendingUp} label="Views" value={formatNumber(video.view_count)} />
            <SpotlightMetric icon={Sparkles} label="Likes" value={formatNumber(video.like_count)} />
            <SpotlightMetric icon={Gift} label="Coins / Gifts" value={formatNumber(video.gift_count)} />
            <SpotlightMetric icon={Zap} label="Boost Score" value={formatNumber(video.boost_score)} />
          </div>
        </div>
      </Link>
    </section>
  )
}

function SpotlightRankCard({ video, rank }: { video: any; rank: number }) {
  return (
    <Link
      to={`/video/${video.id}`}
      className="group relative overflow-hidden rounded-2xl border border-yellow-400/20 bg-black/40 p-4 text-center transition hover:-translate-y-1 hover:border-yellow-400/50 hover:bg-yellow-400/10"
    >
      <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-black">
        {rank}
      </div>

      <div className="mx-auto mt-6 h-28 w-28 overflow-hidden rounded-full border-2 border-yellow-400/60 bg-zinc-900 shadow-lg shadow-yellow-500/10">
         <img
           src={video.profiles?.avatar_url || getThumbnail(video)}
           alt={getCreatorName(video)}
           className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
           loading="lazy"
           onError={(event) => {
             event.currentTarget.src = PLACEHOLDER_THUMBNAIL
           }}
         />
      </div>

      <p className="mt-4 truncate font-black text-white">{getCreatorName(video)}</p>
      <p className="text-xs text-yellow-300">{video.category || 'Spotlight Creator'}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {formatNumber(video.view_count)} views
      </p>

      <div className="mt-4 rounded-xl bg-yellow-400 px-3 py-2 text-xs font-black text-black">
        Watch Pick
      </div>
    </Link>
  )
}

function SpotlightCard({ video }: { video: any }) {
  const isBoosted = (video.boost_score || 0) > 0
  const isHighGifted = (video.gift_count || 0) >= 5000

  return (
    <Link
      to={`/video/${video.id}`}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/40 hover:shadow-xl hover:shadow-yellow-950/20"
    >
      <div className="relative aspect-video overflow-hidden">
         <img
           src={getThumbnail(video)}
           alt={getVideoTitle(video)}
           className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
           loading="lazy"
           onError={(event) => {
             event.currentTarget.src = PLACEHOLDER_THUMBNAIL
           }}
         />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <div className="flex items-center gap-1 rounded-full bg-yellow-400/20 px-2 py-1 text-xs text-yellow-300">
            <Star className="h-3 w-3 fill-yellow-300" />
            Spotlight
          </div>

          {isBoosted && (
            <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-black text-white">
              Boosted
            </span>
          )}

          {isHighGifted && (
            <span className="rounded-full bg-yellow-400 px-2 py-1 text-xs font-black text-black">
              High Gifted
            </span>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
          <div className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-lg shadow-yellow-500/30">
            <Play className="mr-1 inline h-4 w-4 fill-black" />
            Watch Now
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="line-clamp-2 text-base font-black text-white">
            {getVideoTitle(video)}
          </h3>

          <p className="mt-1 text-xs font-semibold text-zinc-300">
            @{getCreatorName(video)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-white/10 bg-black/50 p-4 text-xs">
        <Metric label="Views" value={formatNumber(video.view_count)} />
        <Metric label="Likes" value={formatNumber(video.like_count)} />
        <Metric label="Coins" value={formatNumber(video.gift_count)} gold />
      </div>
    </Link>
  )
}

function SpotlightMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className="h-4 w-4 text-yellow-300" />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function Metric({
  label,
  value,
  gold = false,
}: {
  label: string
  value: string
  gold?: boolean
}) {
  return (
    <div>
      <p className={`font-black ${gold ? 'text-yellow-300' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  )
}

function SpotlightSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-[420px] animate-pulse rounded-[2rem] border border-white/10 bg-white/10" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array(5)
          .fill(0)
          .map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/10"
            />
          ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array(8)
          .fill(0)
          .map((_, index) => (
            <div
              key={index}
              className="aspect-video animate-pulse rounded-2xl border border-white/10 bg-white/10"
            />
          ))}
      </div>
    </div>
  )
}

function SpotlightEmptyState() {
  return (
    <div className="rounded-3xl border border-yellow-400/20 bg-black/45 p-10 text-center shadow-2xl shadow-red-950/20">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10">
        <Star className="h-8 w-8 fill-yellow-300 text-yellow-300" />
      </div>

      <h3 className="text-2xl font-black text-white">
        Be the first to claim MAI Spotlight
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
        Upload approved content, earn views, receive gifts, and compete for the top
        creator placement.
      </p>

      <Link to="/upload">
        <Button className="mt-6 rounded-xl bg-yellow-400 px-6 py-3 font-black text-black hover:bg-yellow-300">
          Upload & Compete
        </Button>
      </Link>
    </div>
  )
}