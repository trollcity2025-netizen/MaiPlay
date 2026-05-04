import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { UnlockStatus, CreatorProgress, CreatorUnlock } from '../types/unlock'
import { COMMUNITY_UNLOCK_TARGET, COMMUNITY_UNLOCK_MIN_GIFTERS, GROWTH_UNLOCK_MIN_SUBSCRIBERS, GROWTH_UNLOCK_MIN_VIEWS, PAID_UNLOCK_PRICE_DEFAULT, PAID_UNLOCK_PRICE_REDUCED, PAID_UNLOCK_REDUCED_THRESHOLD } from '../types/unlock'

export const useUnlockProgress = (creatorId: string) => {
  const { data: profile } = useQuery({
    queryKey: ['profile', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, creator_unlocks(*)')
        .eq('id', creatorId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!creatorId
  })

  const { data: progress } = useQuery({
    queryKey: ['creator-progress', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_progress_cache')
        .select('*')
        .eq('creator_id', creatorId)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data as CreatorProgress | null
    },
    enabled: !!creatorId
  })

  const status: UnlockStatus = {
    isUnlocked: profile?.can_upload_movies || false,
    unlockType: profile?.unlock_type || null,
    coinsProgress: progress?.coins_progress || 0,
    giftersCount: progress?.unique_gifters_count || 0,
    communityProgress: Math.min(100, Math.round(((progress?.coins_progress || 0) / COMMUNITY_UNLOCK_TARGET) * 100)),
    growthProgress: Math.min(100, Math.round(((Math.min(profile?.subscriber_count || 0, GROWTH_UNLOCK_MIN_SUBSCRIBERS) / GROWTH_UNLOCK_MIN_SUBSCRIBERS) * 50 + (Math.min(profile?.total_views || 0, GROWTH_UNLOCK_MIN_VIEWS) / GROWTH_UNLOCK_MIN_VIEWS) * 50))),
    paidPrice: (progress?.coins_progress || 0) >= PAID_UNLOCK_REDUCED_THRESHOLD ? PAID_UNLOCK_PRICE_REDUCED : PAID_UNLOCK_PRICE_DEFAULT,
    canUnlockCommunity: (progress?.coins_progress || 0) >= COMMUNITY_UNLOCK_TARGET && (progress?.unique_gifters_count || 0) >= COMMUNITY_UNLOCK_MIN_GIFTERS,
    canUnlockGrowth: (profile?.subscriber_count || 0) >= GROWTH_UNLOCK_MIN_SUBSCRIBERS && (profile?.total_views || 0) >= GROWTH_UNLOCK_MIN_VIEWS
  }

  return { status, profile, progress }
}

export const useCreatorStatus = (creatorId: string) => {
  const queryClient = useQueryClient()

  const unlockMutation = useMutation({
    mutationFn: async (unlockType: 'community' | 'growth' | 'paid') => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (unlockType === 'community' || unlockType === 'growth') {
        // Verify requirements met
        const { status } = await queryClient.fetchQuery(['unlock-progress', creatorId], () => 
          supabase.from('profiles').select('*').eq('id', creatorId).single()
        )
        
        const profile = await queryClient.fetchQuery(['profile', creatorId], () => 
          supabase.from('profiles').select('*').eq('id', creatorId).single()
        )

        if (unlockType === 'community' && !status.canUnlockCommunity) {
          throw new Error('Community unlock requirements not met')
        }
        if (unlockType === 'growth' && !status.canUnlockGrowth) {
          throw new Error('Growth unlock requirements not met')
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            can_upload_movies: true,
            unlock_type: unlockType,
            unlock_unlocked_at: new Date().toISOString()
          })
          .eq('id', creatorId)

        if (error) throw error

        await supabase.from('creator_unlocks').upsert({
          user_id: creatorId,
          unlock_type: unlockType,
          coins_progress: status.coinsProgress,
          unique_gifters_count: status.giftersCount,
          unlocked_at: new Date().toISOString()
        })
      }

      return unlockType
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', creatorId] })
      queryClient.invalidateQueries({ queryKey: ['creator-progress', creatorId] })
    }
  })

  return { unlockMutation }
}

export const usePaidUnlock = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ creatorId, price }: { creatorId: string; price: number }) => {
      // PayPal integration would go here
      // For now, simulate successful payment
      return { success: true, creatorId, price }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    }
  })
}