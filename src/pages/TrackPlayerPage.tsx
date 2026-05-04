import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Coins,
  Gift,
  Heart,
  Music,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { useAuthAccount } from '../auth/AuthAccountProvider'
import { PLACEHOLDER_MUSIC } from '../config/placeholders'
import type { Track } from '../types'

const PLACEHOLDER_MUSIC_COVER = PLACEHOLDER_MUSIC

function formatCount(value?: number | null) {
  const count = Number(value || 0)
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toLocaleString()
}

function getCover(track: Track) {
  return track.cover_art_url || PLACEHOLDER_MUSIC_COVER
}

function getArtistName(track: Track) {
  return (
    (track as any).profiles?.display_name ||
    (track as any).profiles?.username ||
    'MAI Artist'
  )
}

export function TrackPlayerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthAccount()

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.9)
  const [liked, setLiked] = useState(false)

  const trackQuery = useQuery({
    queryKey: ['track', id],
    enabled: !!id,
    queryFn: async (): Promise<Track | null> => {
      if (!id) return null

      const { data, error } = await supabase
        .from('tracks')
        .select(
          `
          *,
          profiles:creator_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `,
        )
        .eq('id', id)
        .eq('visibility', 'private') // Allow private tracks if creator owns them, public otherwise
        .in('upload_status', ['ready', 'processing'])
        .in('moderation_status', ['approved', 'pending'])
        .maybeSingle()

      if (error) throw error
      return data as Track | null
    },
  })

  const track = trackQuery.data
  const audioUrl = track ? track.audio_url : null
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  const artistPath = useMemo(() => {
    if (!track || !('profiles' in track) || !(track as any).profiles?.username) return '/home'
    return `/profile/${(track as any).profiles.username}`
  }, [track])

  useEffect(() => {
    if (!track?.id) return

    supabase
      .from('tracks')
      .update({
        view_count: Number(track.view_count || 0) + 1,
      })
      .eq('id', track.id)
      .then(({ error }) => {
        if (error) console.warn('[TrackPlayerPage] View count update failed:', error)
      })
  }, [track?.id])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const togglePlay = () => setIsPlaying(!isPlaying)

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds
    }
  }

  const handleLike = () => {
    // TODO: Implement like/unlike for tracks
    setLiked(!liked)
  }

  const handleShare = async () => {
    if (navigator.share && track) {
      try {
        await navigator.share({
          title: track.title,
          text: `Check out "${track.title}" by ${getArtistName(track)} on MaiPlay`,
          url: window.location.href,
        })
      } catch (err) {
        console.log('Share failed:', err)
      }
    }
  }

  const handleGift = () => {
    // TODO: Implement gifting for tracks
    console.log('Gift track')
  }

  if (!track) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen bg-[#070202] text-white">
          <main className="mx-auto max-w-4xl px-4 py-8">
            <div className="text-center">
              <Music className="mx-auto h-16 w-16 text-yellow-400 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Track not found</h2>
              <p className="text-zinc-400">This track may have been removed or doesn't exist.</p>
            </div>
          </main>
        </div>
      </>
    )
  }

  const coverUrl = getCover(track)
  const artistName = getArtistName(track)

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-[#070202] text-white">
        <audio
          ref={audioRef}
          src={audioUrl || ''}
          autoPlay={isPlaying}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Album Art */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-red-950/50 to-yellow-950/30">
              <img
                src={coverUrl}
                alt={track.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER_MUSIC_COVER
                }}
              />
            </div>

            {/* Track Info */}
            <div className="flex flex-col justify-center space-y-6">
              <div>
                <h1 className="text-4xl font-black mb-2">{track.title}</h1>
                <Link
                  to={artistPath}
                  className="text-xl text-zinc-400 hover:text-yellow-400 transition-colors"
                >
                  {artistName}
                </Link>
              </div>

              {track.description && (
                <p className="text-zinc-300">{track.description}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span>{formatCount(track.view_count)} views</span>
                <span>•</span>
                <span>{formatCount(track.like_count)} likes</span>
                <span>•</span>
                <span>{formatCount(track.gift_count)} gifts</span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-yellow-400 to-red-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => skip(-10)}
                  className="rounded-full p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <SkipBack className="h-6 w-6" />
                </button>

                <button
                  onClick={togglePlay}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-red-500 text-black"
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8 pl-1" />
                  )}
                </button>

                <button
                  onClick={() => skip(10)}
                  className="rounded-full p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <SkipForward className="h-6 w-6" />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-zinc-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 accent-yellow-400"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 transition-colors ${
                    liked
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
                  <span>{formatCount(track.like_count)}</span>
                </button>

                <button
                  onClick={handleGift}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <Gift className="h-5 w-5" />
                  <span>{formatCount(track.gift_count)}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <Share2 className="h-5 w-5" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

function formatTime(seconds: number) {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
