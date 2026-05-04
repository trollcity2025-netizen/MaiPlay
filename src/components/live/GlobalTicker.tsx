import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Pin, Gift, Heart, AlertTriangle } from 'lucide-react'

interface GlobalTickerProps {
  liveSessionId: string
}

interface TickerItem {
  id: string
  type: 'pinned_message' | 'gift' | 'announcement' | 'milestone'
  content: string
  metadata?: any
  created_at: string
  priority: number // Higher priority items show first
}

export function GlobalTicker({ liveSessionId }: GlobalTickerProps) {
  const [currentItem, setCurrentItem] = useState<TickerItem | null>(null)
  const [itemIndex, setItemIndex] = useState(0)

  // Fetch ticker items
  const { data: tickerItems } = useQuery({
    queryKey: ['global-ticker', liveSessionId],
    queryFn: async () => {
      // Get pinned messages
      const { data: pinnedMessagesData, error: pinnedMessagesError } = await supabase
        .from('live_chat_messages')
        .select('id, content, created_at, user_id')
        .eq('live_session_id', liveSessionId)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(5)
      if (pinnedMessagesError) throw pinnedMessagesError
      const pinnedMessages = pinnedMessagesData ?? []

      // Get recent gifts
      const { data: recentGiftsData, error: recentGiftsError } = await supabase
        .from('live_chat_messages')
        .select('id, content, created_at, metadata, user_id')
        .eq('live_session_id', liveSessionId)
        .eq('message_type', 'gift')
        .order('created_at', { ascending: false })
        .limit(10)
      if (recentGiftsError) throw recentGiftsError
      const recentGifts = recentGiftsData ?? []

      // Lookup users separately to avoid PostgREST relationship alias issues
      const uniqueUserIds = Array.from(
        new Set([
          ...pinnedMessages.map((item) => item.user_id),
          ...recentGifts.map((item) => item.user_id),
        ].filter(Boolean) as string[])
      )

      const { data: userProfiles, error: userProfilesError } = uniqueUserIds.length > 0
        ? await supabase.from('profiles').select('id, display_name').in('id', uniqueUserIds)
        : { data: [], error: null }
      if (userProfilesError) throw userProfilesError

      const userMap = new Map((userProfiles ?? []).map((user: any) => [user.id, user.display_name || 'Unknown']))

      // Get announcements (system messages)
      const { data: announcements } = await supabase
        .from('live_chat_messages')
        .select('id, content, created_at')
        .eq('live_session_id', liveSessionId)
        .eq('message_type', 'system')
        .order('created_at', { ascending: false })
        .limit(3)

      const items: TickerItem[] = []

      // Add pinned messages (high priority)
      pinnedMessages.forEach(msg => {
        const displayName = userMap.get(msg.user_id) || 'Unknown'
        items.push({
          id: `pinned_${msg.id}`,
          type: 'pinned_message',
          content: `${displayName}: ${msg.content}`,
          created_at: msg.created_at,
          priority: 10
        })
      })

      // Add gifts (medium priority)
      recentGifts.forEach(gift => {
        const displayName = userMap.get(gift.user_id) || 'Unknown'
        items.push({
          id: `gift_${gift.id}`,
          type: 'gift',
          content: `${displayName} sent a gift!`,
          metadata: gift.metadata,
          created_at: gift.created_at,
          priority: 5
        })
      })

      // Add announcements (high priority)
      announcements?.forEach(announcement => {
        items.push({
          id: `announcement_${announcement.id}`,
          type: 'announcement',
          content: announcement.content,
          created_at: announcement.created_at,
          priority: 8
        })
      })

      // Sort by priority (descending) then by created_at (descending)
      return items.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  })

  // Cycle through ticker items
  useEffect(() => {
    if (!tickerItems || tickerItems.length === 0) {
      setCurrentItem(null)
      return
    }

    const interval = setInterval(() => {
      setItemIndex(prev => (prev + 1) % tickerItems.length)
    }, 8000) // Change every 8 seconds

    return () => clearInterval(interval)
  }, [tickerItems])

  useEffect(() => {
    if (tickerItems && tickerItems.length > 0) {
      setCurrentItem(tickerItems[itemIndex])
    }
  }, [tickerItems, itemIndex])

  if (!currentItem) {
    return null
  }

  const getIcon = () => {
    switch (currentItem.type) {
      case 'pinned_message':
        return <Pin className="w-4 h-4 text-yellow-400" />
      case 'gift':
        return <Gift className="w-4 h-4 text-purple-400" />
      case 'announcement':
        return <AlertTriangle className="w-4 h-4 text-blue-400" />
      case 'milestone':
        return <Heart className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  const getBackgroundColor = () => {
    switch (currentItem.type) {
      case 'pinned_message':
        return 'bg-yellow-950/80 border-yellow-500/50'
      case 'gift':
        return 'bg-purple-950/80 border-purple-500/50'
      case 'announcement':
        return 'bg-blue-950/80 border-blue-500/50'
      case 'milestone':
        return 'bg-red-950/80 border-red-500/50'
      default:
        return 'bg-gray-950/80 border-gray-500/50'
    }
  }

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full border backdrop-blur-sm ${getBackgroundColor()} animate-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-center gap-2 text-white text-sm font-medium">
        {getIcon()}
        <span className="max-w-md truncate">{currentItem.content}</span>
        {currentItem.type === 'gift' && currentItem.metadata?.giftAmount && (
          <span className="text-yellow-400 font-bold">
            ${currentItem.metadata.giftAmount}
          </span>
        )}
      </div>
    </div>
  )
}