import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Heart,
  Play,
  Pause,
  Coins,
  Gift,
  Share2,
  Music,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { useAuthAccount } from '../auth/AuthAccountProvider'
import { PLACEHOLDER_MUSIC } from '../config/placeholders'
import type { Album, AlbumTrack, Track } from '../types'

const PLACEHOLDER_COVER = PLACEHOLDER_MUSIC

function formatCount(value?: number | null) {
  const count = Number(value || 0)
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toLocaleString()
}

export function AlbumPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthAccount()

  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const albumQuery = useQuery({
    queryKey: ['album', id],
    enabled: !!id,
    queryFn: async (): Promise<Album | null> => {
      if (!id) return null

      const { data, error } = await supabase
        .from('albums')
        .select(`*, profiles:creator_id(*)`)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Album
    },
  })

  const albumTracksQuery = useQuery({
    queryKey: ['album-tracks', id],
    enabled: !!id,
    queryFn: async (): Promise<AlbumTrack[] | null> => {
      if (!id) return null

      const { data, error } = await supabase
        .from('album_tracks')
        .select(`
          *,
          track:tracks(*)
        `)
        .eq('album_id', id)
        .order('track_number', { ascending: true })

      if (error) throw error
      return data as AlbumTrack[]
    },
  })

  const album = albumQuery.data
  const albumTracks = albumTracksQuery.data || []

  useEffect(() => {
    if (!album?.id) return

    supabase
      .from('albums')
      .update({
        view_count: Number(album.view_count || 0) + 1,
      })
      .eq('id', album.id)
      .then(({ error }) => {
        if (error) console.warn('[AlbumPage] View count update failed:', error)
      })
  }, [album?.id])

  const currentTrack = albumTracks.find(at => at.track_id === currentTrackId)?.track as Track | undefined

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => {
      if (currentTrackId && albumTracks.length > 0) {
        const currentIndex = albumTracks.findIndex(at => at.track_id === currentTrackId)
        const nextTrack = albumTracks[currentIndex + 1]
        if (nextTrack) {
          setCurrentTrackId(nextTrack.track_id)
        } else {
          setIsPlaying(false)
        }
      }
    }

    audio.addEventListener('ended', handleEnded)
    return () => audio.removeEventListener('ended', handleEnded)
  }, [currentTrackId, albumTracks])

  const playTrack = (trackId: string) => {
    if (currentTrackId === trackId) {
      setIsPlaying(!isPlaying)
    } else {
      setCurrentTrackId(trackId)
      setIsPlaying(true)
    }
  }

  if (!album) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen bg-[#070202] text-white">
          <main className="mx-auto max-w-4xl px-4 py-8">
            <div className="text-center">
              <Music className="mx-auto h-16 w-16 text-yellow-400 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Album not found</h2>
              <p className="text-zinc-400">This album may have been removed or doesn't exist.</p>
            </div>
          </main>
        </div>
      </>
    )
  }

  const creatorName = (album as any).profiles?.display_name || (album as any).profiles?.username || 'Artist'
  const coverUrl = album.cover_art_url || PLACEHOLDER_COVER

  const totalTracks = albumTracks.length
  const totalDuration = albumTracks.reduce((acc, at) => acc + (at.track as Track)?.view_count || 0, 0) // Using view_count as placeholder for duration since it's not stored

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-[#070202] text-white">
        <audio
          ref={audioRef}
          src={currentTrack?.audio_url || ''}
          autoPlay={isPlaying}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          {/* Album Header */}
          <div className="flex gap-8 mb-12">
            <img
              src={coverUrl}
              alt={album.title}
              className="w-64 h-64 rounded-2xl object-cover shadow-2xl"
              onError={(e) => {
                e.currentTarget.src = PLACEHOLDER_COVER
              }}
            />
            <div className="flex-1 flex flex-col justify-end">
              <h1 className="text-5xl font-black mb-4">{album.title}</h1>
              <Link
                to={`/profile/${(album as any).profiles?.username}`}
                className="text-xl text-zinc-400 hover:text-yellow-400 transition-colors mb-4"
              >
                {creatorName}
              </Link>
              {album.description && (
                <p className="text-zinc-300 mb-4">{album.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span>{totalTracks} tracks</span>
                <span>•</span>
                <span>{formatCount(album.view_count)} plays</span>
              </div>
            </div>
          </div>

          {/* Track List */}
          <div className="space-y-2">
            {albumTracks.map((albumTrack) => {
              const track = albumTrack.track as Track
              if (!track) return null

              return (
                <div
                  key={albumTrack.id}
                  className={`group flex items-center gap-4 rounded-xl p-3 transition-colors ${
                    currentTrackId === track.id
                      ? 'bg-yellow-500/20'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <button
                    onClick={() => playTrack(track.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 group-hover:bg-yellow-500/20 transition-colors"
                  >
                    {currentTrackId === track.id && isPlaying ? (
                      <Pause className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <Play className="h-5 w-5 text-yellow-400 pl-0.5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{track.title}</h3>
                    {track.description && (
                      <p className="text-sm text-zinc-500 truncate">{track.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <span>{formatCount(track.view_count)}</span>
                    <button
                      onClick={() => {}}
                      className="hover:text-red-400 transition-colors"
                    >
                      <Heart className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {}}
                      className="hover:text-yellow-400 transition-colors"
                    >
                      <Gift className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      </div>
    </>
  )
}
