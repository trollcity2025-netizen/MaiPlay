import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Album,
  Clapperboard,
  Disc3,
  Film,
  Gift,
  Heart,
  Music,
  Play,
  SearchX,
  Sparkles,
  Upload,
  Video,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { PLACEHOLDER_MUSIC } from '../config/placeholders'
import { cn } from '../lib/utils'

type DropFilter = 'all' | 'music' | 'music_video' | 'short' | 'movie'

const DROP_CATEGORIES = [
  'music',
  'music_track',
  'audio',
  'mp3',
  'music_album',
  'music_video',
  'video_music',
  'short',
  'movie',
  'film',
  'feature',
]

function isMusicSingle(item: any) {
  return ['music', 'music_track', 'audio', 'mp3'].includes(item.category)
}

function isMusicAlbum(item: any) {
  return item.category === 'music_album'
}

function isMusicVideo(item: any) {
  return ['music_video', 'video_music'].includes(item.category)
}

function isMovie(item: any) {
  return ['movie', 'film', 'feature'].includes(item.video_type) || item.category === 'movie'
}

function isShort(item: any) {
  return (
    item.video_type === 'short' ||
    item.category === 'short' ||
    (!isMusicSingle(item) && !isMusicAlbum(item) && !isMusicVideo(item) && !isMovie(item))
  )
}

function getDropType(item: any): DropFilter {
  if (isMusicSingle(item) || isMusicAlbum(item)) return 'music'
  if (isMusicVideo(item)) return 'music_video'
  if (isMovie(item)) return 'movie'
  return 'short'
}

function getThumbnail(item: any) {
  return (
    item.cover_url ||
    item.album_cover_url ||
    item.thumbnail_url ||
    item.thumbnail ||
    item.mux_thumbnail_url ||
    PLACEHOLDER_MUSIC
  )
}

function getArtistName(item: any) {
  return (
    item.profiles?.display_name ||
    item.profiles?.username ||
    item.artist?.display_name ||
    item.artist?.username ||
    'MAI Creator'
  )
}

function getTitle(item: any) {
  return item.title || item.track_title || item.album_title || 'Untitled Drop'
}

function getDropLabel(item: any) {
  if (isMusicAlbum(item)) return 'Album'
  if (isMusicSingle(item)) return 'MP3 Single'
  if (isMusicVideo(item)) return 'Music Video'
  if (isMovie(item)) return 'Movie'
  return 'Short'
}

function getDropIcon(item: any) {
  if (isMusicAlbum(item)) return <Album className="h-3.5 w-3.5" />
  if (isMusicSingle(item)) return <Music className="h-3.5 w-3.5" />
  if (isMusicVideo(item)) return <Film className="h-3.5 w-3.5" />
  if (isMovie(item)) return <Clapperboard className="h-3.5 w-3.5" />
  return <Video className="h-3.5 w-3.5" />
}

function getDropLink(item: any) {
  if (isMusicAlbum(item)) return `/album/${item.id}`
  if (isMusicSingle(item)) return `/music/${item.id}`
  if (isMusicVideo(item) || isMovie(item) || isShort(item)) return `/video/${item.id}`
  return `/video/${item.id}`
}

function formatCount(value: number | null | undefined) {
  const count = Number(value || 0)
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return `${count}`
}

export function NewDropsPage() {
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState<DropFilter>('all')
  const searchQuery = (searchParams.get('search') || '').trim().toLowerCase()

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .mai-gold-text {
          background: linear-gradient(90deg, #f7c948, #fff2a8, #d99b16);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .mai-card-glow {
          box-shadow:
            0 0 0 1px rgba(247, 201, 72, 0.12),
            0 18px 60px rgba(0, 0, 0, 0.45),
            0 0 40px rgba(153, 27, 27, 0.18);
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(185,28,28,0.34),transparent_36%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.16),transparent_30%),linear-gradient(180deg,#050000_0%,#130000_42%,#030303_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px] opacity-20" />
      </div>

      <div className="relative z-10">
        <AppHeader />

        <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <section className="mb-8 overflow-hidden rounded-[2rem] border border-yellow-500/20 bg-black/50 p-5 shadow-[0_0_80px_rgba(185,28,28,0.2)] backdrop-blur-xl md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-yellow-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Fresh MAI Drops
                </div>

                <h1 className="text-4xl font-black tracking-tight md:text-6xl">
                  New <span className="mai-gold-text">Drops</span>
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 md:text-base">
                  Fresh MP3 singles, albums, music videos, shorts, and movies from creators across MaiPlay.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Link to="/upload/music">
                  <Button className="h-12 w-full rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 px-5 font-black text-black shadow-[0_0_28px_rgba(250,204,21,0.34)] transition hover:scale-105">
                    <Music className="mr-2 h-4 w-4" />
                    Music
                  </Button>
                </Link>

                <Link to="/upload/music-video">
                  <Button className="h-12 w-full rounded-full border border-red-400/30 bg-red-500/10 px-5 font-black text-red-100 transition hover:scale-105 hover:bg-red-500/20">
                    <Film className="mr-2 h-4 w-4" />
                    Music Video
                  </Button>
                </Link>

                <Link to="/upload/short">
                  <Button className="h-12 w-full rounded-full border border-white/15 bg-white/5 px-5 font-black text-white transition hover:scale-105 hover:bg-white/10">
                    <Disc3 className="mr-2 h-4 w-4" />
                    Short
                  </Button>
                </Link>

                <Link to="/upload/movie">
                  <Button className="h-12 w-full rounded-full border border-yellow-400/30 bg-yellow-500/10 px-5 font-black text-yellow-200 transition hover:scale-105 hover:bg-yellow-500/20">
                    <Clapperboard className="mr-2 h-4 w-4" />
                    Movie
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">Latest Creator Uploads</h2>
              <p className="text-sm text-zinc-400">
                Newest approved uploads across the MaiPlay network.
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-xl scrollbar-hide">
              <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
                All
              </FilterButton>
              <FilterButton active={filter === 'music'} onClick={() => setFilter('music')}>
                Music
              </FilterButton>
              <FilterButton active={filter === 'music_video'} onClick={() => setFilter('music_video')}>
                Music Videos
              </FilterButton>
              <FilterButton active={filter === 'short'} onClick={() => setFilter('short')}>
                Shorts
              </FilterButton>
              <FilterButton active={filter === 'movie'} onClick={() => setFilter('movie')}>
                Movies
              </FilterButton>
            </div>
          </section>

          <NewDropsGrid searchQuery={searchQuery} filter={filter} />
        </main>
      </div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        'h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition',
        active
          ? 'border-yellow-300/50 bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 text-black shadow-[0_0_18px_rgba(250,204,21,0.35)]'
          : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
      )}
    >
      {children}
    </Button>
  )
}

function NewDropsGrid({
  searchQuery,
  filter,
}: {
  searchQuery: string
  filter: DropFilter
}) {
  const { data: drops, isLoading } = useQuery({
    queryKey: ['new-drops-all-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles:creator_id(*)')
        .in('category', DROP_CATEGORIES)
        .eq('visibility', 'public')
        .eq('upload_status', 'ready')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(80)

      if (error) throw error
      return data ?? []
    },
    staleTime: 2 * 60 * 1000,
  })

  const filteredDrops = useMemo(() => {
    if (!drops) return []

    return drops.filter((drop) => {
      const matchesFilter = filter === 'all' || getDropType(drop) === filter

      if (!matchesFilter) return false
      if (!searchQuery) return true

      const haystack = [
        drop.title,
        drop.album_title || '',
        drop.track_title || '',
        drop.description || '',
        drop.category || '',
        drop.video_type || '',
        drop.profiles?.username || '',
        drop.profiles?.display_name || '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(searchQuery)
    })
  }, [drops, filter, searchQuery])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array(16)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-[1.75rem] border border-yellow-500/10 bg-white/10"
            />
          ))}
      </div>
    )
  }

  if (filteredDrops.length === 0) {
    return (
      <div className="rounded-[2rem] border border-yellow-500/20 bg-black/50 px-6 py-16 text-center backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-yellow-500/25 bg-yellow-500/10 text-yellow-300">
          <SearchX className="h-7 w-7" />
        </div>

        <h3 className="text-2xl font-black">No new drops found</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
          Upload music, a short, a music video, or a movie to become the next new drop.
        </p>

        <Link to="/upload/music" className="mt-6 inline-block">
          <Button className="rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 px-6 font-black text-black">
            Drop Content
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {filteredDrops.map((drop) => (
        <DropCard key={drop.id} drop={drop} />
      ))}
    </div>
  )
}

function DropCard({ drop }: { drop: any }) {
  const likes = Number(drop.like_count || 0)
  const gifts = Number(drop.gift_count || 0)
  const views = Number(drop.view_count || 0)

  return (
    <Link
      to={getDropLink(drop)}
      className="group mai-card-glow relative block overflow-hidden rounded-[1.75rem] border border-yellow-500/15 bg-black/70 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-yellow-300/45 hover:shadow-[0_0_50px_rgba(250,204,21,0.18)]"
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={getThumbnail(drop)}
          alt={getTitle(drop)}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

        <div className="absolute left-3 top-3">
          <div className="flex items-center gap-1 rounded-full border border-yellow-400/30 bg-black/60 px-2.5 py-1 text-xs font-black text-yellow-200 backdrop-blur-xl">
            {getDropIcon(drop)}
            {getDropLabel(drop)}
          </div>
        </div>

        <div className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-xl transition group-hover:scale-110 group-hover:border-yellow-300/50 group-hover:text-yellow-200">
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-cyan-200">
            <Sparkles className="h-3 w-3" />
            New Drop
          </div>

          <h3 className="line-clamp-2 text-base font-black leading-tight text-white">
            {getTitle(drop)}
          </h3>

          <p className="mt-1 truncate text-xs font-semibold text-zinc-300">
            @{getArtistName(drop)}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-bold text-zinc-300">
            <StatBox label="Plays" value={formatCount(views)} />
            <StatBox label="Likes" value={formatCount(likes)} icon={<Heart className="h-3 w-3" />} />
            <StatBox label="Gifts" value={formatCount(gifts)} icon={<Gift className="h-3 w-3" />} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function StatBox({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
      <span className="block text-zinc-500">{label}</span>
      <span className="flex items-center gap-1 text-white">
        {icon}
        {value}
      </span>
    </div>
  )
}