import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bookmark,
  Flame,
  Gift,
  Heart,
  MonitorPlay,
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
  return video.title || 'Untitled Movie'
}

function formatNumber(value: number | null | undefined) {
  return (value || 0).toLocaleString()
}

export function MoviesPage() {
  const [sortBy, setSortBy] = useState<'popularity' | 'likes' | 'gifts'>('popularity')
  const [searchParams] = useSearchParams()
  const searchQuery = (searchParams.get('search') || '').trim().toLowerCase()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030303] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(160,0,0,0.38),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(255,200,0,0.10),transparent_28%),linear-gradient(180deg,#040404_0%,#050000_48%,#000_100%)]" />
        <div className="absolute left-0 top-0 h-full w-[420px] bg-gradient-to-r from-red-950/35 to-transparent" />
      </div>

      <AppHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-black/50 shadow-2xl shadow-red-950/20">
          <div className="relative min-h-[280px] p-6 sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(239,68,68,0.28),transparent_32%),linear-gradient(135deg,rgba(127,29,29,0.55),rgba(0,0,0,0.75)_55%,rgba(113,63,18,0.20))]" />

            <div className="relative max-w-4xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                <Flame className="h-3.5 w-3.5" />
                Creator Movies
              </div>

              <h1 className="max-w-4xl text-5xl font-black uppercase leading-tight sm:text-6xl">
                Full stories.
                <br />
                <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                  Creator owned.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                Watch premium creator movies, discover rising filmmakers, and support content
                directly with MAI coins.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/home?sort=spotlight">
                  <Button className="rounded-xl bg-yellow-400 px-6 py-3 font-black text-black shadow-lg shadow-yellow-500/20 hover:bg-yellow-300">
                    <Play className="mr-2 h-4 w-4 fill-black" />
                    Watch Featured
                  </Button>
                </Link>

                <Link to="/upload/movie">
                  <Button
                    variant="outline"
                    className="rounded-xl border-white/15 bg-black/40 px-6 py-3 font-black text-white hover:bg-white/10"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Movie
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-yellow-400">
              Discover
            </p>
            <h2 className="mt-1 text-2xl font-black">Movie Library</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <SortButton
              active={sortBy === 'popularity'}
              onClick={() => setSortBy('popularity')}
              icon={Flame}
              label="Popularity"
            />
            <SortButton
              active={sortBy === 'likes'}
              onClick={() => setSortBy('likes')}
              icon={Heart}
              label="Likes"
            />
            <SortButton
              active={sortBy === 'gifts'}
              onClick={() => setSortBy('gifts')}
              icon={Gift}
              label="Gifts"
            />
          </div>
        </section>

        {searchQuery && (
          <section className="mb-6 rounded-2xl border border-yellow-400/20 bg-yellow-950/20 p-4">
            <div className="flex items-center gap-2 text-yellow-200">
              <Search className="h-4 w-4" />
              <p className="text-sm font-bold">
                Showing movie results for “{searchQuery}”
              </p>
            </div>
          </section>
        )}

        <MoviesGrid sortBy={sortBy} searchQuery={searchQuery} />
      </main>
    </div>
  )
}

function SortButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: any
  label: string
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl font-black ${
        active
          ? 'bg-yellow-400 text-black hover:bg-yellow-300'
          : 'border-white/10 bg-black/30 text-zinc-300 hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-200'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  )
}

function MoviesGrid({
  sortBy,
  searchQuery,
}: {
  sortBy: 'popularity' | 'likes' | 'gifts'
  searchQuery: string
}) {
  const { data: movies, isLoading } = useQuery({
    queryKey: ['movies-page', sortBy],
    queryFn: async () => {
      let orderBy = 'view_count'
      if (sortBy === 'likes') orderBy = 'like_count'
      if (sortBy === 'gifts') orderBy = 'gift_count'

      const { data, error } = await supabase
        .from('movies')
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

  const filteredMovies = useMemo(() => {
    if (!movies) return []
    if (!searchQuery) return movies

    return movies.filter((movie) => {
      const haystack = [
        movie.title,
        movie.description || '',
        movie.category || '',
        movie.profiles?.username || '',
        movie.profiles?.display_name || '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(searchQuery)
    })
  }, [movies, searchQuery])

  const topEarningMovies = useMemo(() => {
    return [...filteredMovies]
      .sort((a, b) => (b.gift_count || 0) - (a.gift_count || 0))
      .slice(0, 4)
  }, [filteredMovies])

  return (
    <>
      {topEarningMovies.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <h2 className="text-2xl font-black">Top Earning Movies</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topEarningMovies.map((movie) => (
              <MovieCard key={`top-${movie.id}`} movie={movie} featured />
            ))}
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array(12)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="aspect-video animate-pulse rounded-2xl border border-white/10 bg-white/10"
              />
            ))}
        </div>
      ) : filteredMovies.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <MonitorPlay className="h-5 w-5 text-red-400" />
            <h2 className="text-2xl font-black">All Movies</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-3xl border border-yellow-400/20 bg-black/45 p-10 text-center shadow-2xl shadow-red-950/20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10">
            <MonitorPlay className="h-8 w-8 text-yellow-300" />
          </div>

          <h3 className="text-2xl font-black text-white">
            Be the first to upload a creator movie
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            Publish full-length content, build your fanbase, earn MAI coins, and start
            moving toward your next cashout.
          </p>

          <Link to="/upload/movie">
            <Button className="mt-6 rounded-xl bg-yellow-400 px-6 py-3 font-black text-black hover:bg-yellow-300">
              Upload & Start Earning
            </Button>
          </Link>
        </div>
      )}
    </>
  )
}

function MovieCard({ movie, featured = false }: { movie: any; featured?: boolean }) {
  const isTrending = (movie.view_count || 0) >= 10_000
  const isHighEarn = (movie.gift_count || 0) >= 5_000

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-zinc-950 transition duration-300 hover:-translate-y-1 ${
        featured
          ? 'border-yellow-400/30 shadow-xl shadow-yellow-950/20 hover:border-yellow-400/60'
          : 'border-white/10 hover:border-yellow-400/40'
      }`}
    >
      <Link to={`/movie/${movie.id}`} className="block">
        <div className="relative aspect-video overflow-hidden">
           <img
             src={getThumbnail(movie)}
             alt={getVideoTitle(movie)}
             className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
             loading="lazy"
             onError={(event) => {
               event.currentTarget.src = PLACEHOLDER_THUMBNAIL
             }}
           />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {featured && (
              <span className="rounded-md bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase text-black">
                💰 Top Earn
              </span>
            )}

            {isTrending && (
              <span className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-black uppercase text-white">
                🔥 Trending
              </span>
            )}

            {isHighEarn && !featured && (
              <span className="rounded-md bg-yellow-500 px-2 py-1 text-[10px] font-black uppercase text-black">
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
              {getVideoTitle(movie)}
            </h3>

            <p className="mt-1 text-xs font-semibold text-zinc-300">
              @{getCreatorName(movie)}
            </p>
          </div>
        </div>
      </Link>

      <div className="border-t border-white/10 bg-black/50 p-4">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Metric label="Views" value={formatNumber(movie.view_count)} />
          <Metric label="Likes" value={formatNumber(movie.like_count)} />
          <Metric label="Coins" value={formatNumber(movie.gift_count)} gold />
        </div>
      </div>

      <button
        type="button"
        className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/60 p-2 text-white opacity-0 transition hover:bg-yellow-500/20 group-hover:opacity-100"
        onClick={() => {
          alert('Added to Watch Later')
        }}
      >
        <Bookmark className="h-4 w-4" />
      </button>
    </article>
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