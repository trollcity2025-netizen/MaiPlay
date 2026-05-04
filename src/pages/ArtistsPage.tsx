import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { PLACEHOLDER_AVATAR } from '../config/placeholders'

function getAvatar(profile: any) {
  return (
    profile.avatar_url ||
    PLACEHOLDER_AVATAR
  )
}

export function ArtistsPage() {
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
            <h1 className="text-3xl font-black">Top Artists</h1>
            <p className="text-zinc-400">Discover the best musicians and support their art</p>
          </div>
        </div>

        <ArtistsGrid searchQuery={searchQuery} />
      </main>
    </div>
  )
}

function ArtistsGrid({ searchQuery }: { searchQuery: string }) {
  const { data: artists, isLoading } = useQuery({
    queryKey: ['top-artists'],
    queryFn: async () => {
      // Query profiles that are creators with music category videos
const { data, error } = await supabase
         .from('profiles')
         .select(`
          id,
          username,
          display_name,
          avatar_url,
          subscriber_count,
          videos(count)
        `)
        .eq('is_creator', true)
        .order('subscriber_count', { ascending: false })
        .limit(50)

      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const filteredArtists = useMemo(() => {
    if (!artists) return []
    if (!searchQuery) return artists

    return artists.filter((artist) => {
      const haystack = [
        artist.username,
        artist.display_name || '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(searchQuery)
    })
  }, [artists, searchQuery])

  return (
    <>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array(20).fill(0).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredArtists.map((artist, index) => (
            <ArtistCard key={artist.id} artist={artist} rank={index + 1} />
          ))}
        </div>
      )}

      {!isLoading && filteredArtists.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-400 mb-4">No artists found</p>
        </div>
      )}
    </>
  )
}

function ArtistCard({ artist, rank }: { artist: any; rank: number }) {
  return (
    <Link
      to={`/profile/${artist.username}`}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-yellow-400/40 hover:-translate-y-1"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-3">
          <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-yellow-400/40 bg-zinc-900">
            <img
              src={getAvatar(artist)}
              alt={artist.display_name || artist.username}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-xs font-black text-black">
            {rank}
          </div>
        </div>
        <h3 className="font-bold text-white">{artist.display_name || artist.username}</h3>
        <p className="text-xs text-zinc-400 mb-2">@{artist.username}</p>
        <p className="text-xs text-zinc-500">{artist.subscriber_count || 0} fans</p>
        <div className="mt-3 rounded-xl bg-yellow-400 px-3 py-1 text-xs font-black text-black">
          Follow
        </div>
      </div>
    </Link>
  )
}