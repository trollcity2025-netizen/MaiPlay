export type UnlockType = 'community' | 'growth' | 'paid' | null

export interface CreatorUnlock {
  id: string
  user_id: string
  unlock_type: UnlockType
  coins_progress: number
  unique_gifters_count: number
  unlocked_at: string | null
}

export interface CreatorProgress {
  creator_id: string
  total_views: number
  total_subscribers: number
  unique_gifters_count: number
  coins_progress: number
  last_updated: string
}

export interface CreatorGifter {
  id: string
  creator_id: string
  sender_user_id: string
  coins_sent: number
  created_at: string
}

export interface UnlockStatus {
  isUnlocked: boolean
  unlockType: UnlockType
  coinsProgress: number
  giftersCount: number
  communityProgress: number
  growthProgress: number
  paidPrice: number
  canUnlockCommunity: boolean
  canUnlockGrowth: boolean
}

// Constants
export const COMMUNITY_UNLOCK_TARGET = 50000
export const COMMUNITY_UNLOCK_MIN_GIFTERS = 50
export const GROWTH_UNLOCK_MIN_SUBSCRIBERS = 1000
export const GROWTH_UNLOCK_MIN_VIEWS = 100000
export const PAID_UNLOCK_PRICE_DEFAULT = 120
export const PAID_UNLOCK_PRICE_REDUCED = 69
export const PAID_UNLOCK_REDUCED_THRESHOLD = 25000