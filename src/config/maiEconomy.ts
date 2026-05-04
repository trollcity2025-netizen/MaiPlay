export interface CoinPack {
  name: string
  coins: number
  priceUsd: number
  tier: 'Core' | 'Growth' | 'Power' | 'MAI Elite'
  bonusLabel?: string
}

export interface CashoutTier {
  name: string
  coinsRequired: number
  payoutUsd: number
  feeLabel: string
  cooldownHours: number
}

export const MAI_COIN_PACKS: CoinPack[] = [
  { tier: 'Core', name: 'Starter Pack', coins: 100, priceUsd: 0.99, bonusLabel: 'No bonus' },
  { tier: 'Core', name: 'Starter Pack', coins: 550, priceUsd: 4.99, bonusLabel: '+10% bonus' },
  { tier: 'Core', name: 'Starter Pack', coins: 1200, priceUsd: 9.99, bonusLabel: '+20% bonus' },
  { tier: 'Growth', name: 'Growth Pack', coins: 2500, priceUsd: 19.99, bonusLabel: '+25% bonus' },
  { tier: 'Growth', name: 'Growth Pack', coins: 6500, priceUsd: 49.99, bonusLabel: '+30% bonus' },
  { tier: 'Growth', name: 'Growth Pack', coins: 14000, priceUsd: 99.99, bonusLabel: '+40% bonus' },
  { tier: 'Power', name: 'Power Pack', coins: 35000, priceUsd: 199.99, bonusLabel: '+50% bonus' },
  { tier: 'Power', name: 'Power Pack', coins: 75000, priceUsd: 399.99, bonusLabel: '+60% bonus' },
  { tier: 'Power', name: 'Power Pack', coins: 150000, priceUsd: 799.99, bonusLabel: '+75% bonus' },
  { tier: 'MAI Elite', name: 'MAI Elite Pack', coins: 500000, priceUsd: 1999.99, bonusLabel: '+100% bonus' },
  { tier: 'MAI Elite', name: 'MAI Elite Pack', coins: 1000000, priceUsd: 3999.99, bonusLabel: '+120% bonus' }
]

export const MAI_CASHOUT_TIERS: CashoutTier[] = [
  { name: 'Tier 1', coinsRequired: 5000, payoutUsd: 25, feeLabel: '$1 fee', cooldownHours: 24 },
  { name: 'Tier 2', coinsRequired: 15000, payoutUsd: 75, feeLabel: '$3–$5 fee', cooldownHours: 48 },
  { name: 'Tier 3', coinsRequired: 30000, payoutUsd: 150, feeLabel: '8% fee', cooldownHours: 72 },
  { name: 'Tier 4', coinsRequired: 60000, payoutUsd: 300, feeLabel: '10% fee', cooldownHours: 144 },
  { name: 'Tier 5', coinsRequired: 120000, payoutUsd: 600, feeLabel: '10% fee', cooldownHours: 192 },
  { name: 'Tier 6', coinsRequired: 200000, payoutUsd: 1000, feeLabel: '10% fee', cooldownHours: 288 }
]

export const LEGEND_CUTOFF_ISO = '2026-12-31T23:59:59.999Z'
export const LEGEND_CREATOR_LIMIT = 10

