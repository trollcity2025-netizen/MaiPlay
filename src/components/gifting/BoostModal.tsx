import { useState } from 'react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Zap, Clock, AlertCircle } from 'lucide-react'
import { useBoostVideo } from '../../hooks/useGifting'

interface BoostModalProps {
  videoId: string
  ownerId: string
  onClose: () => void
}

const BOOST_PACKAGES = [
  { amount: 100, label: 'Small Boost', duration: '1 hour', description: 'Increases visibility for 1 hour' },
  { amount: 500, label: 'Medium Boost', duration: '6 hours', description: 'Increases visibility for 6 hours' },
  { amount: 1000, label: 'Large Boost', duration: '24 hours', description: 'Increases visibility for 24 hours' },
  { amount: 5000, label: 'Featured', duration: '48 hours', description: 'Featured candidate for 48 hours' }
]

export function BoostModal({ videoId, ownerId }: BoostModalProps) {
  const [selectedBoost, setSelectedBoost] = useState<number | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  
  const boostMutation = useBoostVideo()

  const handleBoost = async () => {
    if (!selectedBoost) return

    await boostMutation.mutateAsync({
      videoId,
      amountCoins: selectedBoost
    })
    setShowConfirmation(true)
  }

  if (showConfirmation) {
    const boost = BOOST_PACKAGES.find(b => b.amount === selectedBoost)
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-surface">
          <DialogHeader>
            <DialogTitle className="text-center">
              <Zap className="w-12 h-12 text-accent-gold mx-auto mb-2" />
              Boost Activated!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-lg mb-2">
              Your {boost?.label} is active
            </p>
            <p className="text-sm text-gray-400">
              Effect: {boost?.duration}
            </p>
          </div>
          <Button onClick={onClose} className="w-full">
            Continue Watching
          </Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-surface">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent-gold" />
            Boost This Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-sm text-blue-400">
              Boosting increases visibility but does not guarantee views. The algorithm determines if/when your boosted video appears to viewers.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Choose boost level:</h4>
            <div className="space-y-2">
              {BOOST_PACKAGES.map(boost => (
                <button
                  key={boost.amount}
                  onClick={() => setSelectedBoost(boost.amount)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    selectedBoost === boost.amount
                      ? 'border-accent-gold bg-accent-gold/10'
                      : 'border-border bg-surface hover:border-accent-gold/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{boost.label}</p>
                      <p className="text-xs text-gray-400">{boost.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{boost.amount}</p>
                      <p className="text-xs text-gray-400">coins</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleBoost}
              disabled={!selectedBoost || boostMutation.isPending}
              className="w-full bg-accent-gold text-black"
            >
              {boostMutation.isPending ? 'Processing...' : `Boost for ${selectedBoost || ''} coins`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}