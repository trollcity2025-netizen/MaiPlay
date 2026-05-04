import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface MaiWallet {
  id: string
  user_id: string
  mai_coins: number
  lifetime_earned: number
  lifetime_spent: number
  created_at: string
  updated_at: string
}

export interface DailyLoginReward {
  id: string
  user_id: string
  reward_date: string
  coins_awarded: number
  created_at: string
}

export interface MaiCoinTransaction {
  id: string
  user_id: string
  amount: number
  transaction_type: string
  source: string
  metadata: Record<string, any>
  created_at: string
}

export interface ClaimRewardResponse {
  claimed: boolean
  message?: string
  balance: number
  coins_awarded?: number
  next_claim_date: string
}

export function useMaiWallet() {
  const queryClient = useQueryClient()

  // Fetch wallet balance
  const walletQuery = useQuery({
    queryKey: ['mai-wallet'],
    queryFn: async (): Promise<MaiWallet | null> => {
      const { data, error } = await supabase
        .from('mai_wallets')
        .select('*')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error
      }

      return data || null
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch daily login reward history
  const rewardsQuery = useQuery({
    queryKey: ['daily-login-rewards'],
    queryFn: async (): Promise<DailyLoginReward[]> => {
      const { data, error } = await supabase
        .from('mai_daily_login_rewards')
        .select('*')
        .order('reward_date', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Fetch today's reward status
  const todayRewardQuery = useQuery({
    queryKey: ['today-reward'],
    queryFn: async (): Promise<DailyLoginReward | null> => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('mai_daily_login_rewards')
        .select('*')
        .eq('reward_date', today)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data || null
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  // Claim daily reward mutation
  const claimRewardMutation = useMutation({
    mutationFn: async (): Promise<ClaimRewardResponse> => {
      const { data, error } = await supabase.functions.invoke('claim_daily_login_reward')
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate and refetch wallet and rewards
      queryClient.invalidateQueries({ queryKey: ['mai-wallet'] })
      queryClient.invalidateQueries({ queryKey: ['daily-login-rewards'] })
      queryClient.invalidateQueries({ queryKey: ['today-reward'] })
    }
  })

  // Fetch transactions
  const transactionsQuery = useQuery({
    queryKey: ['mai-transactions'],
    queryFn: async (): Promise<MaiCoinTransaction[]> => {
      const { data, error } = await supabase
        .from('mai_coin_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    wallet: walletQuery.data,
    rewards: rewardsQuery.data || [],
    todayReward: todayRewardQuery.data,
    transactions: transactionsQuery.data || [],
    claimReward: claimRewardMutation.mutateAsync,
    isClaiming: claimRewardMutation.isPending,
    claimError: claimRewardMutation.error,
    walletLoading: walletQuery.isLoading,
    rewardsLoading: rewardsQuery.isLoading,
    transactionsLoading: transactionsQuery.isLoading
  }
}