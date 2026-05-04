import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Music,
  Heart,
  Gift,
  Upload,
  Flame,
  Crown,
  Sparkles,
  Play,
  Disc3,
  SearchX,
  ListMusic,
  Video,
  AudioLines,
  Album,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { PLACEHOLDER_MUSIC } from '../config/placeholders'
import { cn } from '../lib/utils'

type SortBy = 'popularity' | 'likes' | 'gifts'
type MusicTab = 'all' | 'tracks' | 'albums' | 'videos'

function getThumbnail(item: any) {
  return (
    item.cover_url ||
    item.album_cover_url ||
    item.thumbnail_url ||
    item.thumbnail ||
    PLACEHOLDER_MUSIC
  )
}

function getArtistName(item: any) {
  return (
    item.profiles?.display_name ||
    item.profiles?.username ||
    item.artist?.display_name ||
    item.artist?.username ||
    'MAI Artist'
  )
}

function getTitle(item: any) {
  return item.title || item.track_title || item.album_title || 'Untitled'
}

function formatCount(value: number | null | undefined) {
  const count = Number(value || 0)
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return `${count}`
}

export function MusicPage() {
  const [sortBy, setSortBy] = useState<SortBy>('popularity')
  const [activeTab, setActiveTab] = useState<MusicTab>('all')
  const [searchParams] = useSearchParams()
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
                  MAI Music Network
                </div>

                <h1 className="text-4xl font-black tracking-tight md:text-6xl">
                  Discover <span className="mai-gold-text">Music</span>
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 md:text-base">
                  Upload singles, full albums, MP3 tracks with cover art, and music videos inside the MAI creator ecosystem.
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-zinc-300">
                  <span className="rounded-full border border-yellow-500/25 bg-yellow-500/10 px-3 py-1 text-yellow-200">
                    Albums
                  </span>
                  <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1">
                    Music Videos
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    MP3 Singles
                  </span>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:w-auto">
                <Link to="/upload/music">
                  <Button className="h-12 w-full rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 px-5 font-black text-black shadow-[0_0_28px_rgba(250,204,21,0.34)] transition hover:scale-105">
                    <AudioLines className="mr-2 h-4 w-4" />
                    Single Track
                  </Button>
                </Link>

                <Link to="/upload/music">
                  <Button className="h-12 w-full rounded-full border border-yellow-400/30 bg-yellow-500/10 px-5 font-black text-yellow-200 transition hover:scale-105 hover:bg-yellow-500/20">
                    <Album className="mr-2 h-4 w-4" />
                    Album
                  </Button>
                </Link>

                <Link to="/upload/music-video">
                  <Button className="h-12 w-full rounded-full border border-red-400/30 bg-red-500/10 px-5 font-black text-red-100 transition hover:scale-105 hover:bg-red-500/20">
                    <Video className="mr-2 h-4 w-4" />
                    Video
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-black">Trending Soundstage</h2>
              <p className="text-sm text-zinc-400">
                Singles, albums, MP3 uploads, and videos ranked by audience activity.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex gap-2 overflow-x-auto rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-xl scrollbar-hide">
                <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
                  All
                </TabButton>
                <TabButton active={activeTab === 'tracks'} onClick={() => setActiveTab('tracks')}>
                  Tracks
                </TabButton>
                <TabButton active={activeTab === 'albums'} onClick={() => setActiveTab('albums')}>
                  Albums
                </TabButton>
                <TabButton active={activeTab === 'videos'} onClick={() => setActiveTab('videos')}>
                  Videos
                </TabButton>
              </div>

              <div className="flex gap-2 overflow-x-auto rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-xl scrollbar-hide">
                <SortButton
                  active={sortBy === 'popularity'}
                  onClick={() => setSortBy('popularity')}
                  icon={<Flame className="h-4 w-4" />}
                >
                  Popular
                </SortButton>

                <SortButton
                  active={sortBy === 'likes'}
                  onClick={() => setSortBy('likes')}
                  icon={<Heart className="h-4 w-4" />}
                >
                  Likes
                </SortButton>

                <SortButton
                  active={sortBy === 'gifts'}
                  onClick={() => setSortBy('gifts')}
                  icon={<Gift className="h-4 w-4" />}
                >
                  Gifts
                </SortButton>
              </div>
            </div>
          </section>

          <MusicGrid sortBy={sortBy} activeTab={activeTab} searchQuery={searchQuery} />
        </main>
      </div>
    </div>
  )
}

function TabButton({
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
          ? 'border-yellow-300/50 bg-yellow-500 text-black shadow-[0_0_18px_rgba(250,204,21,0.35)]'
          : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
      )}
    >
      {children}
    </Button>
  )
}

function SortButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
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
      <span className="mr-2">{icon}</span>
      {children}
    </Button>
  )
}

function MusicGrid({
  sortBy,
  activeTab,
  searchQuery,
}: {
  sortBy: SortBy
  activeTab: MusicTab
  searchQuery: string
}) {
  const { data: musicItems, isLoading } = useQuery({
    queryKey: ['mai-music-library', sortBy, activeTab],
    queryFn: async () => {
      let orderBy = 'view_count'
      if (sortBy === 'likes') orderBy = 'like_count'
      if (sortBy === 'gifts') orderBy = 'gift_count'

      let query = supabase
        .from('videos')
        .select('*, profiles:creator_id(*)')
        .eq('visibility', 'public')
        .eq('upload_status', 'ready')
        .eq('moderation_status', 'approved')
        .order(orderBy, { ascending: false })
        .limit(100)

      if (activeTab === 'tracks') {
        query = query.in('category', ['music', 'music_track', 'audio'])
      } else if (activeTab === 'albums') {
        query = query.eq('category', 'music_album')
      } else if (activeTab === 'videos') {
        query = query.in('category', ['music_video', 'video_music'])
      } else {
        query = query.in('category', ['music', 'music_track', 'audio', 'music_album', 'music_video', 'video_music'])
      }

      const { data, error } = await query

      if (error) throw error
      return data ?? []
    },
    staleTime: 2 * 60 * 1000,
  })

  const filteredItems = useMemo(() => {
    if (!musicItems) return []

    const filtered = searchQuery
      ? musicItems.filter((item) => {
          const haystack = [
            item.title,
            item.track_title || '',
            item.album_title || '',
            item.description || '',
            item.profiles?.username || '',
            item.profiles?.display_name || '',
          ]
            .join(' ')
            .toLowerCase()

          return haystack.includes(searchQuery)
        })
      : musicItems

    return filtered
  }, [musicItems, searchQuery])

  const albums = useMemo(() => {
    return filteredItems.filter((item) => item.category === 'music_album')
  }, [filteredItems])

  const nonAlbums = useMemo(() => {
    return filteredItems.filter((item) => item.category !== 'music_album')
  }, [filteredItems])

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

  if (filteredItems.length === 0) {
    return (
      <div className="rounded-[2rem] border border-yellow-500/20 bg-black/50 px-6 py-16 text-center backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-yellow-500/25 bg-yellow-500/10 text-yellow-300">
          <SearchX className="h-7 w-7" />
        </div>

        <h3 className="text-2xl font-black">No music found</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
          Upload an MP3 single, music video, or full album to start building the MAI soundstage.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/upload/music">
            <Button className="rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 px-6 font-black text-black">
              Upload Single
            </Button>
          </Link>

          <Link to="/upload/music">
            <Button className="rounded-full border border-yellow-400/30 bg-yellow-500/10 px-6 font-black text-yellow-200">
              Upload Album
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {albums.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Album className="h-5 w-5 text-yellow-300" />
            <h3 className="text-2xl font-black">Albums</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {albums.map((album, index) => (
              <AlbumCard key={album.id} album={album} rank={index + 1} />
            ))}
          </div>
        </section>
      )}

      {nonAlbums.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-yellow-300" />
            <h3 className="text-2xl font-black">Singles & Videos</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {nonAlbums.map((track, index) => (
              <MusicCard key={track.id} track={track} rank={index + 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function AlbumCard({ album, rank }: { album: any; rank: number }) {
  const songs = Array.isArray(album.tracks)
    ? album.tracks
    : Array.isArray(album.album_tracks)
      ? album.album_tracks
      : []

  const likes = Number(album.like_count || 0)
  const gifts = Number(album.gift_count || 0)
  const views = Number(album.view_count || 0)

  return (
    <Link
      to={`/album/${album.id}`}
      className="group mai-card-glow relative grid overflow-hidden rounded-[1.75rem] border border-yellow-500/15 bg-black/70 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-yellow-300/45 md:grid-cols-[180px_1fr]"
    >
      <div className="relative aspect-square overflow-hidden md:aspect-auto">
        <img
          src={getThumbnail(album)}
          alt={getTitle(album)}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        <div className="absolute left-3 top-3 rounded-full border border-yellow-400/30 bg-black/60 px-2.5 py-1 text-xs font-black text-yellow-200 backdrop-blur-xl">
          Album #{rank}
        </div>
      </div>

      <div className="p-5">
        <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-yellow-200">
          <Album className="h-3 w-3" />
          Full Album
        </div>

        <h3 className="line-clamp-2 text-xl font-black leading-tight text-white">
          {getTitle(album)}
        </h3>

        <p className="mt-1 truncate text-sm font-semibold text-zinc-300">
          @{getArtistName(album)}
        </p>

        <div className="mt-4 space-y-2">
          {(songs.length > 0 ? songs.slice(0, 4) : [{ title: 'Album songs available inside' }]).map(
            (song: any, index: number) => (
              <div
                key={`${album.id}-${index}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
              >
                <span className="truncate text-zinc-200">
                  {index + 1}. {song.title || song.track_title || song.name || `Track ${index + 1}`}
                </span>
                <AudioLines className="ml-2 h-3.5 w-3.5 shrink-0 text-yellow-300" />
              </div>
            )
          )}

          {songs.length > 4 && (
            <p className="text-xs font-bold text-yellow-200">
              +{songs.length - 4} more songs
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-bold text-zinc-300">
          <StatBox label="Plays" value={formatCount(views)} />
          <StatBox label="Likes" value={formatCount(likes)} icon={<Heart className="h-3 w-3" />} />
          <StatBox label="Gifts" value={formatCount(gifts)} icon={<Gift className="h-3 w-3" />} />
        </div>
      </div>
    </Link>
  )
}

function MusicCard({ track, rank }: { track: any; rank: number }) {
  const likes = Number(track.like_count || 0)
  const gifts = Number(track.gift_count || 0)
  const views = Number(track.view_count || 0)
  const isVideo = ['music_video', 'video_music'].includes(track.category)
  const isAudio = ['music', 'music_track', 'audio'].includes(track.category)
  const isHot = likes >= 1000 || gifts >= 100 || views >= 10000 || rank <= 3

  return (
    <Link
      to={isAudio ? `/music/${track.id}` : `/video/${track.id}`}
      className="group mai-card-glow relative block overflow-hidden rounded-[1.75rem] border border-yellow-500/15 bg-black/70 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-yellow-300/45 hover:shadow-[0_0_50px_rgba(250,204,21,0.18)]"
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={getThumbnail(track)}
          alt={getTitle(track)}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

        {isHot && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.16),transparent_58%)]" />
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-yellow-400/30 bg-black/60 px-2.5 py-1 text-xs font-black text-yellow-200 backdrop-blur-xl">
            {rank <= 3 ? <Crown className="h-3.5 w-3.5" /> : <Disc3 className="h-3.5 w-3.5" />}
            #{rank}
          </div>

          {isHot && (
            <div className="flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/20 px-2.5 py-1 text-xs font-black text-red-100 backdrop-blur-xl">
              <Flame className="h-3.5 w-3.5" />
              Hot
            </div>
          )}
        </div>

        <div className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-xl transition group-hover:scale-110 group-hover:border-yellow-300/50 group-hover:text-yellow-200">
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-green-400/20 bg-green-500/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-green-200">
            {isVideo ? <Video className="h-3 w-3" /> : <AudioLines className="h-3 w-3" />}
            {isVideo ? 'Music Video' : 'MP3 Track'}
          </div>

          <h3 className="line-clamp-2 text-base font-black leading-tight text-white">
            {getTitle(track)}
          </h3>

          <p className="mt-1 truncate text-xs font-semibold text-zinc-300">
            @{getArtistName(track)}
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