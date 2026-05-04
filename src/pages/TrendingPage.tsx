import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Flame, Heart, Gift } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/layout/AppHeader'
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

export function TrendingPage() {
  const [sortBy, setSortBy] = useState<'popularity' | 'likes' | 'gifts'>('popularity')
  const [searchParams] = useSearchParams()
  const searchQuery = (searchParams.get('search') || '').trim().toLowerCase()

  return (
    <div className="min-h-screen overflow-hidden bg-[#030303] text-white">
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Trending</h1>
            <p className="text-zinc-400">What's blowing up right now</p>
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          <Button
            variant={sortBy === 'popularity' ? 'default' : 'outline'}
            onClick={() => setSortBy('popularity')}
            className="flex items-center gap-2"
          >
            <Flame className="h-4 w-4" />
            Popularity
          </Button>
          <Button
            variant={sortBy === 'likes' ? 'default' : 'outline'}
            onClick={() => setSortBy('likes')}
            className="flex items-center gap-2"
          >
            <Heart className="h-4 w-4" />
            Likes
          </Button>
          <Button
            variant={sortBy === 'gifts' ? 'default' : 'outline'}
            onClick={() => setSortBy('gifts')}
            className="flex items-center gap-2"
          >
            <Gift className="h-4 w-4" />
            Gifts
          </Button>
        </div>

        <TrendingGrid sortBy={sortBy} searchQuery={searchQuery} />
      </main>
    </div>
  )
}

function TrendingGrid({ sortBy, searchQuery }: { sortBy: 'popularity' | 'likes' | 'gifts'; searchQuery: string }) {
  const { data: trending, isLoading } = useQuery({
    queryKey: ['trending-page', sortBy],
    queryFn: async () => {
      let orderBy = 'view_count'
      if (sortBy === 'likes') orderBy = 'like_count'
      if (sortBy === 'gifts') orderBy = 'gift_count'

      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles:creator_id(*)')
        .eq('visibility', 'public')
        .eq('upload_status', 'ready')
        .eq('moderation_status', 'approved')
        .not('mux_playback_id', 'is', null)
        .order(orderBy, { ascending: false })
        .limit(50)

      if (error) throw error
      return data ?? []
    },
    staleTime: 2 * 60 * 1000,
  })

  const filteredTrending = useMemo(() => {
    if (!trending) return []
    if (!searchQuery) return trending

    return trending.filter((video) => {
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
  }, [trending, searchQuery])

  return (
    <>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array(20).fill(0).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredTrending.map((video) => (
            <TrendingCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {!isLoading && filteredTrending.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-400 mb-4">No trending content found</p>
        </div>
      )}
    </>
  )
}

function TrendingCard({ video }: { video: any }) {
  return (
    <Link
      to={`/video/${video.id}`}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition hover:border-yellow-400/40 hover:-translate-y-1"
    >
      <div className="aspect-video relative">
        <img
          src={getThumbnail(video)}
          alt={getVideoTitle(video)}
          className="h-full w-full object-cover transition group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-3 left-3">
          <div className="flex items-center gap-1 rounded-full bg-red-600/20 px-2 py-1 text-xs text-red-300">
            <Flame className="h-3 w-3" />
            Trending
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-bold text-white line-clamp-2">{getVideoTitle(video)}</h3>
          <p className="text-xs text-zinc-300 mt-1">@{getCreatorName(video)}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
            <span>{video.view_count || 0} views</span>
            <span>{video.like_count || 0} likes</span>
          </div>
        </div>
      </div>
    </Link>
  )
}