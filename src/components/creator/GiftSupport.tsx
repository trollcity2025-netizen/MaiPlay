import { Button } from '../ui/button'
import { Coins, Heart } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

interface GiftSupportProps {
  creatorId: string
  creatorName: string
}

const GIFT_AMOUNTS = [10, 50, 100, 500]

export function GiftSupport({ creatorId, creatorName }: GiftSupportProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [isGifting, setIsGifting] = useState(false)
  const queryClient = useQueryClient()

  const giftMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create coin transaction for the gift
      const { error } = await supabase.from('coin_transactions').insert({
        user_id: user.id,
        amount: -amount,
        type: 'gift',
        reference_id: creatorId
      })

      if (error) throw error

      // Create coin transaction for creator receiving
      await supabase.from('coin_transactions').insert({
        user_id: creatorId,
        amount: amount,
        type: 'gift',
        reference_id: user.id
      })

      // Update creator_gifters table
      await supabase.from('creator_gifters').upsert({
        creator_id: creatorId,
        sender_user_id: user.id,
        coins_sent: amount
      }, {
        onConflict: 'creator_id,sender_user_id'
      })

      return amount
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-progress', creatorId] })
      setIsGifting(false)
      setSelectedAmount(null)
    }
  })

  const handleGift = async () => {
    if (selectedAmount) {
      await giftMutation.mutateAsync(selectedAmount)
    }
  }

  return (
    <div className="bg-surface rounded-lg p-4 border border-border">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Heart className="w-4 h-4 text-primary-green" />
        Support {creatorName}
      </h3>
      <p className="text-sm text-gray-400 mb-3">
        Gift coins to help unlock movie uploads (50,000 coins needed)
      </p>
      
      <div className="grid grid-cols-4 gap-2 mb-4">
        {GIFT_AMOUNTS.map(amount => (
          <Button
            key={amount}
            variant={selectedAmount === amount ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedAmount(amount)}
          >
            {amount}
          </Button>
        ))}
      </div>

      <Button
        onClick={handleGift}
        disabled={!selectedAmount || isGifting}
        className="w-full bg-primary-green"
      >
        {isGifting ? 'Processing...' : `Gift ${selectedAmount || ''} Coins`}
      </Button>
    </div>
  )
}