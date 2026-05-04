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

type MusicTrack = {
  id: string
  creator_id: string
  title: string | null
  description: string | null
  category: string | null
  video_type: string | null
  audio_url: string | null
  file_url: string | null
  cover_url: string | null
  album_cover_url: string | null
  thumbnail_url: string | null
  like_count: number | null
  gift_count: number | null
  view_count: number | null
  copyright_status?: string | null
  created_at: string
  profiles?: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

const PLACEHOLDER_MUSIC_COVER = PLACEHOLDER_MUSIC

function formatCount(value?: number | null) {
  const count = Number(value || 0)
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toLocaleString()
}

function getCover(track: MusicTrack) {
  return (
    track.cover_url ||
    track.album_cover_url ||
    PLACEHOLDER_MUSIC_COVER
  )
}

function getAudioUrl(track: MusicTrack) {
  return track.audio_url || track.file_url
}

function getArtistName(track: MusicTrack) {
  return (
    track.profiles?.display_name ||
    track.profiles?.username ||
    'MAI Artist'
  )
}

export function MusicPlayerPage() {
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
    queryKey: ['music-track', id],
    enabled: !!id,
    queryFn: async (): Promise<MusicTrack | null> => {
      if (!id) return null

      const { data, error } = await supabase
        .from('videos')
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
        .in('category', ['music', 'music_track', 'audio', 'mp3'])
        .in('video_type', ['music'])
        .eq('visibility', 'public')
        .in('upload_status', ['ready', 'processing'])
        .in('moderation_status', ['approved', 'pending'])
        .maybeSingle()

      if (error) throw error
      return data as MusicTrack | null
    },
  })

  const track = trackQuery.data
  const audioUrl = track ? getAudioUrl(track) : null
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  const artistPath = useMemo(() => {
    if (!track?.profiles?.username) return '/home'
    return `/profile/${track.profiles.username}`
  }, [track])

  useEffect(() => {
    if (!track?.id) return

    supabase
      .from('videos')
      .update({
        view_count: Number(track.view_count || 0) + 1,
      })
      .eq('id', track.id)
      .then(({ error }) => {
        if (error) console.warn('[MusicPlayerPage] View count update failed:', error)
      })
  }, [track?.id])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = volume
  }, [volume])

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio || !audioUrl) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }

    try {
      await audio.play()
      setIsPlaying(true)
    } catch (err) {
      console.error('[MusicPlayerPage] Audio play failed:', err)
    }
  }

  const handleSeek = (value: number) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const nextTime = (value / 100) * duration
    audio.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, duration))
  }

  const handleLike = async () => {
    if (!track || liked) return

    setLiked(true)

    const { error } = await supabase
      .from('videos')
      .update({
        like_count: Number(track.like_count || 0) + 1,
      })
      .eq('id', track.id)

    if (error) {
      console.error('[MusicPlayerPage] Like failed:', error)
      setLiked(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href

    if (navigator.share) {
      await navigator.share({
        title: track?.title || 'MaiPlay Music',
        url,
      })
      return
    }

    await navigator.clipboard.writeText(url)
    alert('Music link copied.')
  }

  if (trackQuery.isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <AppHeader />
        <main className="flex min-h-[70vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
        </main>
      </div>
    )
  }

  if (!track || !audioUrl) {
    return (
      <div className="min-h-screen bg-black text-white">
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Music className="mx-auto mb-4 h-14 w-14 text-yellow-300" />
          <h1 className="text-3xl font-black">Music not found</h1>
          <p className="mt-2 text-zinc-400">
            This track may still be processing, private, or unavailable.
          </p>
          <Button
            onClick={() => navigate('/music')}
            className="mt-6 rounded-full bg-yellow-400 font-black text-black hover:bg-yellow-300"
          >
            Back to Music
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <AppHeader />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(185,28,28,0.38),transparent_35%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.18),transparent_30%),linear-gradient(180deg,#060000_0%,#130000_45%,#000_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px] opacity-20" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="grid gap-8 lg:grid-cols-[420px_1fr]">
          <div className="relative">
            <div className="absolute -inset-6 rounded-[3rem] bg-yellow-500/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-yellow-500/20 bg-black/60 shadow-[0_0_80px_rgba(250,204,21,0.14)]">
           <img
             src={getCover(track)}
             alt={track.title || 'Music cover'}
             className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
             onError={(event) => {
               event.currentTarget.src = PLACEHOLDER_MUSIC_COVER
             }}
           />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/55 p-4 backdrop-blur-xl">
                <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
                  <Music className="h-4 w-4" />
                  MaiPlay Music
                </div>

                <h1 className="line-clamp-2 text-2xl font-black">
                  {track.title || 'Untitled Track'}
                </h1>

                <Link
                  to={artistPath}
                  className="mt-1 block text-sm font-semibold text-zinc-300 hover:text-yellow-300"
                >
                  @{getArtistName(track)}
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-yellow-200">
              {track.copyright_status === 'clean'
                ? 'Copyright Clean'
                : track.copyright_status === 'flagged'
                  ? 'Needs Review'
                  : 'Music Drop'}
            </div>

            <h2 className="text-4xl font-black tracking-tight md:text-6xl">
              {track.title || 'Untitled Track'}
            </h2>

            <Link
              to={artistPath}
              className="mt-3 flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
            >
              <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-800">
                {track.profiles?.avatar_url ? (
                  <img
                    src={track.profiles.avatar_url}
                    alt={getArtistName(track)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-700 to-yellow-400 text-sm font-black text-black">
                    MAI
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-black">{getArtistName(track)}</p>
                <p className="text-xs text-zinc-500">Creator</p>
              </div>
            </Link>

            {track.description && (
              <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-300">
                {track.description}
              </p>
            )}

            <div className="mt-8 rounded-[2rem] border border-yellow-500/20 bg-black/60 p-5 shadow-[0_0_60px_rgba(185,28,28,0.14)] backdrop-blur-xl">
              <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                onLoadedMetadata={(event) => {
                  setDuration(event.currentTarget.duration || 0)
                }}
                onTimeUpdate={(event) => {
                  setCurrentTime(event.currentTarget.currentTime)
                }}
                onEnded={() => setIsPlaying(false)}
              />

              <div className="mb-5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progressPercent}
                  onChange={(event) => handleSeek(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer accent-yellow-400"
                />

                <div className="mt-2 flex justify-between text-xs text-zinc-500">
                  <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                  <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button
                  type="button"
                  onClick={() => skip(-10)}
                  className="h-12 w-12 rounded-full border border-white/10 bg-white/5 p-0 hover:bg-white/10"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  onClick={togglePlay}
                  className="h-20 w-20 rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 p-0 text-black shadow-[0_0_40px_rgba(250,204,21,0.35)] hover:scale-105"
                >
                  {isPlaying ? (
                    <Pause className="h-9 w-9 fill-current" />
                  ) : (
                    <Play className="ml-1 h-9 w-9 fill-current" />
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={() => skip(10)}
                  className="h-12 w-12 rounded-full border border-white/10 bg-white/5 p-0 hover:bg-white/10"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-zinc-400" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  className="w-full accent-yellow-400"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <StatBox label="Plays" value={formatCount(track.view_count)} />
              <StatBox label="Likes" value={formatCount(track.like_count)} />
              <StatBox label="Gifts" value={formatCount(track.gift_count)} />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={handleLike}
                disabled={liked}
                className="rounded-full border border-pink-400/20 bg-pink-500/10 font-black text-pink-200 hover:bg-pink-500/20"
              >
                <Heart className={`mr-2 h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                {liked ? 'Liked' : 'Like'}
              </Button>

              <Button
                className="rounded-full border border-yellow-400/20 bg-yellow-500/10 font-black text-yellow-200 hover:bg-yellow-500/20"
              >
                <Gift className="mr-2 h-4 w-4" />
                Gift
              </Button>

              <Button
                onClick={handleShare}
                className="rounded-full border border-white/10 bg-white/5 font-black text-white hover:bg-white/10"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>

            {!user && (
              <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                Sign in to like, gift, and support this artist with MAI Coins.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  )
}