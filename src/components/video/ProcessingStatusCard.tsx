import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import type { Video, UploadStatus } from '../../types'

interface ProcessingStatusCardProps {
  videoId: string
}

export function ProcessingStatusCard({ videoId }: ProcessingStatusCardProps) {
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVideo = async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single()
      
      if (!error && data) {
        setVideo(data)
      }
      setLoading(false)
    }

    fetchVideo()

    const interval = setInterval(fetchVideo, 5000)
    return () => clearInterval(interval)
  }, [videoId])

  if (loading) {
    return (
      <div className="bg-surface rounded-lg p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg">Loading status...</span>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="bg-surface rounded-lg p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="w-6 h-6" />
          <span className="text-lg">Video not found</span>
        </div>
      </div>
    )
  }

  const statusConfig: Record<UploadStatus, { icon: React.ReactNode; title: string; description: string; color: string }> = {
    created: {
      icon: <Loader2 className="w-6 h-6 animate-spin" />,
      title: 'Initializing',
      description: 'Preparing your upload...',
      color: 'text-blue-500',
    },
    uploading: {
      icon: <Loader2 className="w-6 h-6 animate-spin" />,
      title: 'Uploading',
      description: 'Uploading your video to Mux...',
      color: 'text-blue-500',
    },
    processing: {
      icon: <Loader2 className="w-6 h-6 animate-spin" />,
      title: 'Processing',
      description: 'Mux is processing your video. This may take a few minutes.',
      color: 'text-yellow-500',
    },
    ready: {
      icon: <CheckCircle className="w-6 h-6" />,
      title: 'Ready',
      description: 'Your video is ready.',
      color: 'text-green-500',
    },
    errored: {
      icon: <AlertCircle className="w-6 h-6" />,
      title: 'Error',
      description: 'Something went wrong during processing.',
      color: 'text-red-500',
    },
    invalid: {
      icon: <AlertCircle className="w-6 h-6" />,
      title: 'Invalid',
      description: 'Video exceeds the allowed duration limit.',
      color: 'text-red-500',
    },
    deleted: {
      icon: <AlertCircle className="w-6 h-6" />,
      title: 'Deleted',
      description: 'This video has been deleted.',
      color: 'text-gray-500',
    },
  }

  const config = statusConfig[video.upload_status] || statusConfig.created

  return (
    <div className="bg-surface rounded-lg p-6">
      <div className={`flex items-center gap-3 ${config.color}`}>
        {config.icon}
        <div>
          <h3 className="text-lg font-semibold">{config.title}</h3>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>
      
      {video.mux_duration_seconds && video.upload_status === 'ready' && (
        <div className="mt-4 text-sm text-muted-foreground">
          Duration: {Math.floor(video.mux_duration_seconds / 60)}:
          {String(video.mux_duration_seconds % 60).padStart(2, '0')}
        </div>
      )}

      {video.moderation_status === 'pending' && video.upload_status === 'ready' && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
          <p className="text-sm text-yellow-500">
            Your video is awaiting moderation approval.
          </p>
        </div>
      )}
    </div>
  )
}