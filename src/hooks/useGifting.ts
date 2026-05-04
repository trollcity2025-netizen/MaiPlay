import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface GiftCreatorParams {
  videoId: string
  amountCoins: number
  giftType?: 'standard' | 'creator_unlock' | 'custom'
}

export function useGiftCreator() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ videoId, amountCoins, giftType = 'standard' }: GiftCreatorParams) => {
      const { data, error } = await supabase.rpc('gift_creator_on_video', {
        p_video_id: videoId,
        p_amount_coins: amountCoins,
        p_gift_type: giftType
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] })
      queryClient.invalidateQueries({ queryKey: ['unlock-progress'] })
      queryClient.invalidateQueries({ queryKey: ['creator-supporters'] })
      queryClient.invalidateQueries({ queryKey: ['video-supporters', variables.videoId] })
      queryClient.invalidateQueries({ queryKey: ['creator-earnings'] })
    }
  })
}

interface BoostVideoParams {
  videoId: string
  amountCoins: number
}

export function useBoostVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ videoId, amountCoins }: BoostVideoParams) => {
      const { data, error } = await supabase.rpc('boost_video', {
        p_video_id: videoId,
        p_amount_coins: amountCoins
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coin-balance'] })
      queryClient.invalidateQueries({ queryKey: ['video', variables.videoId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    }
  })
}