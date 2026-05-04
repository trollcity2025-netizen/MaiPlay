export interface CashoutTier {
  coinsRequired: number
  payoutUsd: number
  name: string
}

export const CASHOUT_TIERS: CashoutTier[] = [
  { coinsRequired: 5000, payoutUsd: 25, name: 'Tier 1' },
  { coinsRequired: 15000, payoutUsd: 50, name: 'Tier 2' },
  { coinsRequired: 30000, payoutUsd: 150, name: 'Tier 3' },
  { coinsRequired: 60000, payoutUsd: 300, name: 'Tier 4' },
  { coinsRequired: 120000, payoutUsd: 600, name: 'Tier 5' },
  { coinsRequired: 200000, payoutUsd: 1000, name: 'Tier 6' },
]

export function getCurrentCashoutTier(coins: number): CashoutTier | null {
  for (let i = CASHOUT_TIERS.length - 1; i >= 0; i--) {
    if (coins >= CASHOUT_TIERS[i].coinsRequired) {
      return CASHOUT_TIERS[i]
    }
  }
  return null
}

export function getNextCashoutTier(coins: number): CashoutTier | null {
  for (const tier of CASHOUT_TIERS) {
    if (coins < tier.coinsRequired) {
      return tier
    }
  }
  return null
}

export function getProgressToNextTier(coins: number): number {
  const nextTier = getNextCashoutTier(coins)
  if (!nextTier) return 100

  const prevTier = getCurrentCashoutTier(coins)
  const prevRequired = prevTier ? prevTier.coinsRequired : 0
  const progress = (coins - prevRequired) / (nextTier.coinsRequired - prevRequired)
  return Math.min(Math.max(progress * 100, 0), 100)
}

export function getCoinsRemainingToNextTier(coins: number): number {
  const nextTier = getNextCashoutTier(coins)
  return nextTier ? nextTier.coinsRequired - coins : 0
}