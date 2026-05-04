import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  Coins,
  Crown,
  Flame,
  Gift,
  Heart,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { useGiftCreator } from '../../hooks/useGifting'
import type { UnlockType } from '../../types/unlock'

interface GiftModalProps {
  videoId: string
  creatorId: string
  creatorName: string
  movieLocked: boolean
  unlockType: UnlockType
  onClose: () => void
  onGiftSent?: (gift: GiftAnimationPayload) => void
}

export type GiftAnimationPayload = {
  amount: number
  giftType: string
  animationType: 'heart_burst' | 'gold_coin_rain' | 'fireworks' | 'royal_crown' | 'mai_legend'
  title: string
  message: string
}

const GIFT_PACKAGES = [
  {
    amount: 50,
    label: '50',
    title: 'Heart Burst',
    icon: Heart,
    animationType: 'heart_burst' as const,
    popular: false,
  },
  {
    amount: 100,
    label: '100',
    title: 'Gold Rain',
    icon: Coins,
    animationType: 'gold_coin_rain' as const,
    popular: true,
  },
  {
    amount: 500,
    label: '500',
    title: 'Fireworks',
    icon: Flame,
    animationType: 'fireworks' as const,
    popular: false,
  },
  {
    amount: 1000,
    label: '1,000',
    title: 'Royal Crown',
    icon: Crown,
    animationType: 'royal_crown' as const,
    popular: false,
  },
  {
    amount: 5000,
    label: '5,000',
    title: 'MAI Legend',
    icon: Sparkles,
    animationType: 'mai_legend' as const,
    popular: false,
  },
]

function getAnimationForAmount(amount: number): GiftAnimationPayload['animationType'] {
  if (amount >= 5000) return 'mai_legend'
  if (amount >= 1000) return 'royal_crown'
  if (amount >= 500) return 'fireworks'
  if (amount >= 100) return 'gold_coin_rain'
  return 'heart_burst'
}

function formatCoins(amount: number) {
  return amount.toLocaleString()
}

export function GiftModal({
  videoId,
  creatorName,
  movieLocked,
  unlockType,
  onClose,
  onGiftSent,
}: GiftModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100)
  const [customAmount, setCustomAmount] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [sentAmount, setSentAmount] = useState(0)

  const giftMutation = useGiftCreator()

  const finalAmount = useMemo(() => {
    return selectedAmount || Number.parseInt(customAmount || '0', 10)
  }, [customAmount, selectedAmount])

  const selectedAnimation = getAnimationForAmount(finalAmount || 0)

  const handleGift = async () => {
    if (!finalAmount || finalAmount < 10) return

    const giftType = movieLocked ? 'creator_unlock' : 'standard'

    await giftMutation.mutateAsync({
      videoId,
      amountCoins: finalAmount,
      giftType,
    })

    const payload: GiftAnimationPayload = {
      amount: finalAmount,
      giftType,
      animationType: selectedAnimation,
      title:
        finalAmount >= 5000
          ? 'MAI LEGEND GIFT'
          : finalAmount >= 1000
            ? 'ROYAL GIFT'
            : finalAmount >= 500
              ? 'FIRE GIFT'
              : finalAmount >= 100
                ? 'GOLD GIFT'
                : 'HEART GIFT',
      message: `${creatorName} received ${formatCoins(finalAmount)} coins`,
    }

    onGiftSent?.(payload)
    setSentAmount(finalAmount)
    setShowConfirmation(true)
  }

  if (showConfirmation) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md border-yellow-500/20 bg-black text-white shadow-[0_0_80px_rgba(250,204,21,0.18)]">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-green-400/30 bg-green-500/10">
                <CheckCircle className="h-12 w-12 text-green-400" />
              </div>
              Gift Sent
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 text-center">
            <p className="text-lg font-black">
              You supported {creatorName} with {formatCoins(sentAmount)} coins.
            </p>

            {movieLocked && unlockType !== 'community' && (
              <p className="mt-3 text-sm font-semibold text-yellow-300">
                Your gift helped this creator move closer to unlocking movie uploads.
              </p>
            )}

            <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              A premium gift animation has been triggered on the live/player page.
            </div>
          </div>

          <Button
            onClick={onClose}
            className="w-full rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 font-black text-black hover:scale-[1.01]"
          >
            Continue Watching
          </Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg overflow-hidden border-yellow-500/20 bg-black p-0 text-white shadow-[0_0_90px_rgba(185,28,28,0.24)]">
        <div className="relative bg-gradient-to-br from-black via-red-950/40 to-black p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.22),transparent_34%)]" />

          <DialogHeader className="relative z-10">
            <DialogTitle className="flex items-center gap-3 text-2xl font-black">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
                <Gift className="h-6 w-6" />
              </span>
              Support {creatorName}
            </DialogTitle>
          </DialogHeader>

          <div className="relative z-10 mt-5 space-y-5">
            {movieLocked && (
              <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-4">
                <div className="mb-2 flex items-center gap-2 font-black text-yellow-300">
                  <Zap className="h-4 w-4" />
                  Movie Unlock Support
                </div>
                <p className="text-sm text-zinc-300">
                  This creator needs community support to unlock movie uploads. Your gift counts toward that progress.
                </p>
              </div>
            )}

            <div>
              <h4 className="mb-3 font-black">Choose a premium gift animation</h4>

              <div className="grid grid-cols-2 gap-3">
                {GIFT_PACKAGES.map((pkg) => {
                  const Icon = pkg.icon
                  const active = selectedAmount === pkg.amount

                  return (
                    <button
                      key={pkg.amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(pkg.amount)
                        setCustomAmount('')
                      }}
                      className={`relative rounded-2xl border p-4 text-left transition hover:-translate-y-1 ${
                        active
                          ? 'border-yellow-300 bg-yellow-500/15 shadow-[0_0_28px_rgba(250,204,21,0.22)]'
                          : 'border-white/10 bg-white/5 hover:border-yellow-400/30 hover:bg-white/10'
                      }`}
                    >
                      {pkg.popular && (
                        <span className="absolute right-3 top-3 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-black text-black">
                          POPULAR
                        </span>
                      )}

                      <Icon className={active ? 'mb-3 h-6 w-6 text-yellow-300' : 'mb-3 h-6 w-6 text-zinc-300'} />

                      <p className="font-black">{pkg.title}</p>
                      <p className="text-sm text-zinc-400">{pkg.label} coins</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-black">Custom gift amount</h4>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <Coins className="h-5 w-5 text-yellow-300" />
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value)
                    setSelectedAmount(null)
                  }}
                  placeholder="Enter coins, minimum 10"
                  className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                  min="10"
                />
              </div>
            </div>

            {finalAmount > 0 && finalAmount < 10 && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4" />
                Minimum gift is 10 coins.
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                Animation Preview
              </p>
              <p className="mt-1 text-lg font-black text-yellow-300">
                {selectedAnimation.replaceAll('_', ' ').toUpperCase()}
              </p>
              <p className="text-sm text-zinc-400">
                This animation should render full-screen on live/video pages.
              </p>
            </div>

            <Button
              onClick={handleGift}
              disabled={!finalAmount || finalAmount < 10 || giftMutation.isPending}
              className="w-full rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 py-6 font-black text-black shadow-[0_0_28px_rgba(250,204,21,0.25)] hover:scale-[1.01] disabled:opacity-50"
            >
              {giftMutation.isPending ? 'Processing Gift...' : `Send ${formatCoins(finalAmount || 0)} Coin Gift`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}