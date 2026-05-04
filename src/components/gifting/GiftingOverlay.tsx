import { useState } from 'react'
import { Button } from '../ui/button'
import { Coins } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface GiftingOverlayProps {
  videoId: string
}

const GIFT_AMOUNTS = [10, 50, 100, 500]

export function GiftingOverlay({ videoId }: GiftingOverlayProps) {
  const [showGiftPanel, setShowGiftPanel] = useState(false)
  const [giftAnimation, setGiftAnimation] = useState<{amount: number, id: number}[]>([])

  const sendGift = async (amount: number) => {
    setGiftAnimation(prev => [...prev, { amount, id: Date.now() }])
    
    setTimeout(() => {
      setGiftAnimation(prev => prev.slice(1))
    }, 3000)
  }

  return (
    <div className="bg-surface rounded-lg p-4">
      <Button
        onClick={() => setShowGiftPanel(true)}
        className="w-full bg-accent-gold text-black hover:bg-accent-gold/90"
      >
        <Coins className="w-4 h-4 mr-2" />
        Send Gift
      </Button>

      <AnimatePresence>
        {giftAnimation.map(gift => (
          <motion.div
            key={gift.id}
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -100, opacity: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent-gold text-2xl font-bold"
          >
            +{gift.amount} coins
          </motion.div>
        ))}
      </AnimatePresence>

      {showGiftPanel && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Send Gift</h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {GIFT_AMOUNTS.map(amount => (
                <Button
                  key={amount}
                  onClick={() => {
                    sendGift(amount)
                    setShowGiftPanel(false)
                  }}
                  className="bg-primary-green hover:bg-primary-green/90"
                >
                  {amount}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowGiftPanel(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}