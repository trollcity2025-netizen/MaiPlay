import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Medal } from 'lucide-react'

interface SupporterLeaderboardProps {
  creatorId?: string
  videoId?: string
  mode: 'creator' | 'video'
}

interface Supporter {
  supporter_user_id: string
  total_gifted_coins: number
  gift_count: number
  last_gifted_at: string
  profiles?: {
    username: string
    display_name: string
    avatar_url: string
  }
}

export function SupporterLeaderboard({ creatorId, videoId, mode }: SupporterLeaderboardProps) {
  const { data: supporters } = useQuery({
    queryKey: ['supporter-leaderboard', mode, creatorId || videoId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        mode === 'creator' ? 'get_creator_supporters' : 'get_video_supporters',
        mode === 'creator' 
          ? { p_creator_id: creatorId }
          : { p_video_id: videoId }
      )
      if (error) throw error
      return data as Supporter[]
    },
    enabled: !!(creatorId || videoId)
  })

  const getMedal = (index: number) => {
    if (index === 0) return 'text-yellow-500'
    if (index === 1) return 'text-gray-400'
    if (index === 2) return 'text-amber-700'
    return 'text-gray-500'
  }

  return (
    <div className="bg-surface rounded-lg p-4 border border-border">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Medal className="w-5 h-5 text-accent-gold" />
        Top Supporters
      </h3>
      <div className="space-y-3">
        {supporters?.slice(0, 5).map((supporter, index) => (
          <div key={supporter.supporter_user_id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${getMedal(index)}`}>
                #{index + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-primary-green/20 flex items-center justify-center">
                <span className="text-xs font-bold">
                  {supporter.profiles?.display_name?.[0] || '?'}
                </span>
              </div>
              <span className="text-sm">
                {supporter.profiles?.display_name || 'Anonymous'}
              </span>
            </div>
            <span className="text-accent-gold font-semibold">
              {supporter.total_gifted_coins.toLocaleString()}
            </span>
          </div>
        ))}
        {(!supporters || supporters.length === 0) && (
          <p className="text-center text-gray-400 py-4">
            No supporters yet. Be the first!
          </p>
        )}
      </div>
    </div>
  )
}