import { useEffect, useRef } from 'react'

interface MuxPlayerProps {
  playbackId: string | null
  videoId: string
  autoplay?: boolean
  muted?: boolean
  controls?: boolean
  poster?: string
  className?: string
  onLoad?: () => void
  onError?: (error: string) => void
}

export function useVideoViewTracker(videoId: string, playbackId: string | null) {
  const watchSecondsRef = useRef(0)
  const viewTrackedRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const trackView = async (seconds: number) => {
    if (viewTrackedRef.current) return

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
          viewer_user_id: session?.user?.id || null,
          anonymous_session_id: !session?.user?.id ? crypto.randomUUID() : null,
          playback_id: playbackId,
          watch_seconds: seconds,
          source: 'player',
        }),
      })
      
      viewTrackedRef.current = true
    } catch (err) {
      console.error('Failed to track view:', err)
    }
  }

  const startTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(() => {
      watchSecondsRef.current += 1
      const minWatch = videoId?.includes('short') ? 5 : 30
      if (watchSecondsRef.current >= minWatch && !viewTrackedRef.current) {
        trackView(watchSecondsRef.current)
      }
    }, 1000)
  }

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  return { startTracking, stopTracking }
}

export function MuxPlayer({
  playbackId,
  videoId,
  autoplay = false,
  muted = false,
  controls = true,
  poster,
  className = '',
  onLoad,
  onError,
}: MuxPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { startTracking, stopTracking } = useVideoViewTracker(videoId, playbackId)

  useEffect(() => {
    if (!playbackId || !videoRef.current) {
      if (!playbackId && onError) {
        onError('No playback ID available')
      }
      return
    }

    const video = videoRef.current
    const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`

    const setupPlayer = async () => {
      const Hls = (await import('hls.js')).default
      
      if (Hls.isSupported()) {
        const hls = new Hls()
        hls.loadSource(hlsUrl)
        hls.attachMedia(video)
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (onLoad) onLoad()
        })
        
        return () => {
          hls.destroy()
        }
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl
        video.addEventListener('loadedmetadata', () => {
          if (onLoad) onLoad()
        })
      }
    }

    setupPlayer()
  }, [playbackId, onLoad, onError])

  const handlePlay = () => startTracking()
  const handlePause = () => stopTracking()
  const handleEnded = () => stopTracking()

  if (!playbackId) {
    return (
      <div className={`bg-black rounded-lg flex items-center justify-center aspect-video ${className}`}>
        <p className="text-muted-foreground">Video not available</p>
      </div>
    )
  }

  const thumbnailUrl = poster || `https://image.mux.com/${playbackId}/thumbnail.jpg`

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        poster={thumbnailUrl}
        controls={controls}
        autoPlay={autoplay}
        muted={muted}
        playsInline
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        className="w-full aspect-video"
      />
    </div>
  )
}