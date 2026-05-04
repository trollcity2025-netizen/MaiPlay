import { Play } from 'lucide-react'
import type { Video } from '../../types'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { PLACEHOLDER_THUMBNAIL } from '../../config/placeholders'

interface VideoCardProps {
  video: Video
  showPreview?: boolean
}

export function VideoCard({ video, showPreview = true }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const thumbnailUrl = video.mux_thumbnail_url || video.thumbnail_url || PLACEHOLDER_THUMBNAIL

  return (
    <Link to={`/video/${video.id}`} className="block group">
      <div
        className="relative rounded-lg overflow-hidden bg-surface"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          <img
            src={thumbnailUrl}
            alt={video.title}
            className="w-full object-cover aspect-video"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary-green/90 flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
          </div>
          {video.mux_duration_seconds && (
            <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs">
              {Math.floor(video.mux_duration_seconds / 60)}:{String(video.mux_duration_seconds % 60).padStart(2, '0')}
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
          <p className="text-xs text-gray-400 mt-1">{video.profiles?.display_name || video.profiles?.username}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
            <span>{video.view_count.toLocaleString()} views</span>
            <span className="bg-primary-green/20 text-primary-green px-1 rounded">
              {video.video_type === 'music' || video.video_type === 'music_video' ? 'MUSIC' : video.video_type.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}