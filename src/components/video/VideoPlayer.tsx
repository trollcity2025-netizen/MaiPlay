import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Coins,
  Film,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from 'lucide-react'

import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import type { Video } from '../../types'

interface VideoPlayerProps {
  video: Video
  className?: string
  autoPlay?: boolean
  showActions?: boolean
  onGiftClick?: () => void
  onBoostClick?: () => void
}

function formatVideoType(type?: string | null) {
  if (!type) return 'Video'
  if (type === 'short') return 'Short'
  if (type === 'movie') return 'Movie'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function VideoPlayer({
  video,
  className,
  autoPlay = false,
  showActions = true,
  onGiftClick,
  onBoostClick,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const typeLabel = useMemo(() => formatVideoType(video.type), [video.type])

  const isShort = video.type === 'short'

  const togglePlay = async () => {
    const player = videoRef.current
    if (!player || hasError) return

    if (player.paused) {
      await player.play()
    } else {
      player.pause()
    }
  }

  const restartVideo = async () => {
    const player = videoRef.current
    if (!player) return

    player.currentTime = 0
    await player.play()
  }

  const openFullscreen = async () => {
    const player = videoRef.current
    if (!player?.requestFullscreen) return

    await player.requestFullscreen()
  }

  if (!video?.video_url) {
    return (
      <div
        className={cn(
          'flex aspect-video w-full items-center justify-center rounded-3xl border border-red-500/30 bg-black text-center',
          className
        )}
      >
        <div className="p-6">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-300" />
          <h3 className="mt-3 text-lg font-black text-white">
            Video unavailable
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            This upload does not have a playable video URL yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <section
      className={cn(
        'group relative overflow-hidden rounded-[2rem] border border-red-500/20 bg-black shadow-2xl shadow-red-950/30',
        className
      )}
    >
      <div
        className={cn(
          'relative w-full bg-black',
          isShort ? 'aspect-[9/16] max-h-[82vh]' : 'aspect-video'
        )}
      >
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-red-950/40">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-pulse rounded-full border border-yellow-400/30 bg-yellow-500/10" />
              <p className="mt-3 text-sm font-semibold text-zinc-400">
                Loading {typeLabel.toLowerCase()}...
              </p>
            </div>
          </div>
        )}

        {hasError ? (
          <div className="flex h-full w-full items-center justify-center bg-black p-6 text-center">
            <div>
              <AlertTriangle className="mx-auto h-12 w-12 text-red-300" />
              <h3 className="mt-4 text-xl font-black text-white">
                Playback failed
              </h3>
              <p className="mt-2 max-w-md text-sm text-zinc-400">
                This video could not be loaded. Check the upload URL, storage
                permissions, or CDN playback status.
              </p>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={video.video_url}
            poster={video.thumbnail_url || undefined}
            controls
            playsInline
            preload="metadata"
            autoPlay={autoPlay}
            className={cn(
              'h-full w-full bg-black object-contain',
              isShort ? 'mx-auto max-w-[520px]' : ''
            )}
            onLoadedData={() => setIsLoaded(true)}
            onCanPlay={() => setIsLoaded(true)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              setHasError(true)
              setIsLoaded(true)
            }}
          />
        )}

        {!hasError && (
          <button
            type="button"
            onClick={togglePlay}
            className={cn(
              'absolute inset-0 z-20 flex items-center justify-center transition-opacity',
              isPlaying
                ? 'opacity-0 group-hover:opacity-100'
                : 'opacity-100 bg-black/20'
            )}
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-yellow-400/40 bg-black/70 text-yellow-100 shadow-2xl shadow-yellow-950/40 backdrop-blur-md transition-transform hover:scale-105">
              {isPlaying ? (
                <Pause className="h-9 w-9" />
              ) : (
                <Play className="ml-1 h-9 w-9" />
              )}
            </span>
          </button>
        )}

        <div className="pointer-events-none absolute left-4 top-4 z-30 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-black/75 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-yellow-100 backdrop-blur-md">
            <Film className="h-3.5 w-3.5" />
            {typeLabel}
          </span>

          {isPlaying && (
            <span className="rounded-full border border-red-400/30 bg-red-600/20 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-red-100 backdrop-blur-md">
              Playing
            </span>
          )}
        </div>

        {!hasError && (
          <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={restartVideo}
              className="rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-md hover:bg-white/15"
              aria-label="Restart video"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={openFullscreen}
              className="rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-md hover:bg-white/15"
              aria-label="Fullscreen"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {showActions && (
        <div className="border-t border-white/10 bg-gradient-to-r from-[#140303] via-black to-[#1d0702] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-white">
                {video.title || 'Untitled video'}
              </h2>

              {video.description && (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                  {video.description}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                onClick={onGiftClick}
                className="rounded-2xl bg-gradient-to-r from-yellow-500 to-red-600 font-black text-black hover:opacity-90"
              >
                <Coins className="mr-2 h-4 w-4" />
                Gift Creator
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onBoostClick}
                className="rounded-2xl border-yellow-400/30 bg-black/40 font-bold text-yellow-100 hover:bg-yellow-500/10"
              >
                <Volume2 className="mr-2 h-4 w-4" />
                Boost
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}