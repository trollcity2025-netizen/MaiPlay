import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { useAuth } from '../../hooks/useAuth'

interface MuxVideoPlayerProps {
  playbackId: string | null
  videoId: string
  creatorId: string
  autoplay?: boolean
  muted?: boolean
  controls?: boolean
  poster?: string
  className?: string
}

export function MuxVideoPlayer({
  playbackId,
  videoId,
  creatorId,
  autoplay = false,
  muted = false,
  controls = true,
  poster,
  className = '',
}: MuxVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [viewTracked, setViewTracked] = useState(false)
  const [watchSeconds, setWatchSeconds] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    if (!playbackId || !videoRef.current) return

    const video = videoRef.current
    const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(hlsUrl)
      hls.attachMedia(video)
      
      return () => {
        hls.destroy()
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl
    }
  }, [playbackId])

  useEffect(() => {
    if (!videoId || viewTracked) return

    const video = videoRef.current
    if (!video) return

    let watchInterval: NodeJS.Timeout

    const handlePlay = () => {
      watchInterval = setInterval(() => {
        setWatchSeconds(prev => prev + 1)
      }, 1000)
    }

    const handlePause = () => {
      clearInterval(watchInterval)
    }

    const handleEnded = () => {
      clearInterval(watchInterval)
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      clearInterval(watchInterval)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [videoId, viewTracked])

  useEffect(() => {
    if (!viewTracked && watchSeconds >= (videoId?.startsWith('short') ? 5 : 30)) {
      trackView(videoId, watchSeconds)
      setViewTracked(true)
    }
  }, [watchSeconds, viewTracked, videoId])

  const trackView = async (videoId: string, seconds: number) => {
    try {
      const { data: { session } } = await import('../../lib/supabase').then(m => m.supabase.auth.getSession())
      
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/video_views`, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          video_id: videoId,
          viewer_user_id: user?.id,
          anonymous_session_id: !user?.id ? crypto.randomUUID() : null,
          playback_id: playbackId,
          watch_seconds: seconds,
          source: 'player',
        }),
      })
    } catch (err) {
      console.error('Failed to track view:', err)
    }
  }

  if (!playbackId) {
    return (
      <div className={`bg-black rounded-lg flex items-center justify-center aspect-video ${className}`}>
        <p className="text-muted-foreground">Video not available</p>
      </div>
    )
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        poster={poster || `https://image.mux.com/${playbackId}/thumbnail.jpg`}
        controls={controls}
        autoPlay={autoplay}
        muted={muted}
        playsInline
        className="w-full aspect-video"
      />
    </div>
  )
}

export function getMuxThumbnailUrl(playbackId: string, time?: number) {
  if (!playbackId) return ''
  const timeParam = time ? `?time=${time}` : ''
  return `https://image.mux.com/${playbackId}/thumbnail.jpg${timeParam}`
}

export function getMuxPreviewUrl(playbackId: string) {
  if (!playbackId) return ''
  return `https://image.mux.com/${playbackId}/animated.gif`
}

export function getMuxStreamUrl(playbackId: string) {
  if (!playbackId) return ''
  return `https://stream.mux.com/${playbackId}.m3u8`
}