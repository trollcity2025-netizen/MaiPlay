import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Coins,
  Crown,
  Flame,
  Gift,
  Pause,
  Play,
  Share2,
  ThumbsUp,
  Users,
  Zap,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { MuxVideoPlayer } from '../components/video/MuxVideoPlayer'
import { ProcessingStatusCard } from '../components/video/ProcessingStatusCard'
import { GiftingOverlay } from '../components/gifting/GiftingOverlay'
import { CommentsSidebar } from '../components/video/CommentsSidebar'
import { GiftButton } from '../components/gifting/GiftButton'
import { BoostButton } from '../components/gifting/BoostButton'
import { Button } from '../components/ui/button'
import type { Short, Movie, Profile } from '../types'

type ContentType = 'short' | 'movie' | null

type VideoWithProfile = (Short | Movie) & { profiles?: Profile }

function getThumbnail(video: any) {
  return (
    video.mux_thumbnail_url ||
    video.thumbnail_url ||
    video.thumbnail ||
    '/placeholder-thumbnail.jpg'
  )
}

function getCreatorName(video: any) {
  return (
    video.profiles?.display_name ||
    video.profiles?.username ||
    video.creator?.display_name ||
    video.creator?.username ||
    'Creator'
  )
}

function formatCount(value: number | null | undefined) {
  const count = Number(value || 0)
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toLocaleString()
}

export function VideoPlayerPage({ type }: { type?: ContentType } = {}) {
  const { id } = useParams<{ id: string }>()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [audioPlaying, setAudioPlaying] = useState(false)

  const { data: video, isLoading } = useQuery<VideoWithProfile>({
    queryKey: ['video', id, type],
    queryFn: async () => {
      if (!id) throw new Error('ID is required')

      // Determine which table to query based on type
      let tableName = 'videos' // legacy fallback
      if (type === 'short') tableName = 'shorts'
      else if (type === 'movie') tableName = 'movies'

      const selectFields = `
        *,
        profiles:creator_id(id, username, display_name, avatar_url)
      `

      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .eq('id', id)
        .eq('visibility', 'public')
        .eq('upload_status', 'ready')
        .eq('moderation_status', 'approved')
        .single()

      if (error) throw error
      return data as LoadedVideo
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070202] text-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-[#070202] text-white">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <AlertCircle className="h-16 w-16 text-yellow-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Video not found</h2>
          <p className="text-zinc-400">This video may have been removed or doesn't exist.</p>
        </div>
      </div>
    )
  }

  const thumbnailUrl = getThumbnail(video)
  const creatorName = getCreatorName(video)

  return (
    <div className="min-h-screen bg-[#070202] text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            {type === 'short' || type === 'movie' ? (
              <MuxVideoPlayer
                playbackId={video.mux_playback_id || ''}
                poster={thumbnailUrl}
                title={video.title}
              />
            ) : (
              <ProcessingStatusCard video={video} />
            )}

            {/* Video Info */}
            <div className="mt-4">
              <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={(video as any).profiles?.avatar_url || DEFAULT_AVATAR}
                    alt={creatorName}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <Link to={`/profile/${(video as any).profiles?.username}`} className="font-semibold hover:text-yellow-400">
                      {creatorName}
                    </Link>
                    <div className="text-sm text-zinc-400">
                      {formatCount(video.view_count)} views
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <GiftButton videoId={video.id} />
                  <BoostButton videoId={video.id} />
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <CommentsSidebar videoId={video.id} />
            <GiftingOverlay videoId={video.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
