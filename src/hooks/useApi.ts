import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Video, Profile, CoinTransaction, Subscription } from '../types'

export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, user_id, username, display_name, avatar_url, bio, role, is_creator, created_at, subscriber_count, total_views, short_views, creator_level, can_upload_movies, unlock_type, unlock_unlocked_at, moderation_status',
        )
        .eq('user_id', userId)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // Only retry once for faster failure
  })
}

export const useProfileByUsername = (username: string) => {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, user_id, username, display_name, avatar_url, bio, role, is_creator, created_at, subscriber_count, total_views, short_views, creator_level, can_upload_movies, unlock_type, unlock_unlocked_at, moderation_status',
        )
        .eq('username', username)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!username,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  })
}

export const useVideos = (type?: 'short' | 'movie' | 'music', category?: string) => {
  return useQuery({
    queryKey: ['videos', type, category],
    queryFn: async () => {
      let query = supabase
        .from('videos')
        .select(`*, profiles:creator_id(*)`)
        .eq('visibility', 'public')
        .eq('upload_status', 'ready')
        .eq('moderation_status', 'approved')

      // Only require mux_playback_id for video content, not for music
      if (type !== 'music') {
        query = query.not('mux_playback_id', 'is', null)
      }

      query = query.order('created_at', { ascending: false }).limit(20)

      if (type) query = query.eq('video_type', type)
      if (category) query = query.eq('category', category)

      const { data, error } = await query
      if (error) throw error
      return data as Video[]
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useTrendingVideos = () => {
  return useQuery({
    queryKey: ['videos', 'trending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select(`*, profiles:creator_id(*)`)
        .eq('visibility', 'public')
        .eq('upload_status', 'ready')
        .eq('moderation_status', 'approved')
        .not('mux_playback_id', 'is', null)
        .order('view_count', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as Video[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useSubscribe = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (creatorId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const subscriptionCost = 50 // MAI coins cost for subscription

      // Check wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('mai_wallets')
        .select('mai_coins, lifetime_spent')
        .maybeSingle()

      if (walletError) throw walletError

      const currentBalance = wallet?.mai_coins || 0
      if (currentBalance < subscriptionCost) {
        throw new Error(`Insufficient MAI coins. Need ${subscriptionCost}, have ${currentBalance}`)
      }

      // Create subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({ subscriber_id: user.id, creator_id: creatorId })
      if (subError) throw subError

      // Update wallet and lifetime_spent (create wallet if it doesn't exist)
      const { error: walletUpdateError } = await supabase
        .from('mai_wallets')
        .upsert({
          user_id: user.id,
          mai_coins: currentBalance - subscriptionCost,
          lifetime_spent: (wallet?.lifetime_spent || 0) + subscriptionCost,
          updated_at: new Date().toISOString()
        })
      if (walletUpdateError) throw walletUpdateError

      // Insert transaction
      const { error: txError } = await supabase
        .from('mai_coin_transactions')
        .insert({
          user_id: user.id,
          amount: -subscriptionCost,
          transaction_type: 'subscription_purchase',
          source: 'subscription',
          metadata: { creator_id: creatorId }
        })
      if (txError) throw txError

      // Increment subscriber count
      await supabase.rpc('increment_subscriber_count', { creator_id: creatorId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['mai-wallet'] })
    }
  })
}

export const useCoinBalance = () => {
  return useQuery({
    queryKey: ['mai-wallet'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mai_wallets')
        .select('mai_coins')
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 is not found
      return data?.mai_coins || 0
    }
  })
}