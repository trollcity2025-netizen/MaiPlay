import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthAccount } from '../auth/AuthAccountProvider'

export type SubscriptionStatus = 'active' | 'grace' | 'expired' | 'cancelled'

export interface UserSubscription {
  id: string
  user_id: string
  creator_id: string
  tier_id: string
  start_date: string
  end_date: string
  auto_renew: boolean
  status: SubscriptionStatus
  created_at: string
}

export function useSubscription(creatorId: string | null) {
  const { account } = useAuthAccount()

  return useQuery({
    queryKey: ['subscription', account?.id, creatorId],
    queryFn: async (): Promise<UserSubscription | null> => {
      if (!account?.id || !creatorId) return null

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', account.id)
        .eq('creator_id', creatorId)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: Boolean(account?.id && creatorId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
