import type { UnlockStatus } from '../../types/unlock'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Coins, TrendingUp, Zap, Users, CheckCircle, XCircle } from 'lucide-react'
import { useCreatorStatus, usePaidUnlock } from '../../hooks/useUnlock'
import { PayPalButtons } from '@paypal/react-paypal-js'

interface UnlockModalProps {
  creatorId: string
  status: UnlockStatus
  onClose: () => void
}

export function UnlockModal({ creatorId, status, onClose }: UnlockModalProps) {
  const { unlockMutation } = useCreatorStatus(creatorId)
  const paidUnlock = usePaidUnlock()

  const handleCommunityUnlock = () => {
    if (status.canUnlockCommunity) {
      unlockMutation.mutate('community')
      onClose()
    }
  }

  const handleGrowthUnlock = () => {
    if (status.canUnlockGrowth) {
      unlockMutation.mutate('growth')
      onClose()
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-surface">
        <DialogHeader>
          <DialogTitle>Movie Upload Unlock Options</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Coins className="w-4 h-4 text-accent-gold" />
              Community Unlock
            </h3>
            <div className="text-sm text-gray-400 mb-3">
              <p>Requires: 50,000 coins from 50+ unique supporters</p>
            </div>
            <div className="space-y-1 text-sm mb-3">
              <div className="flex justify-between">
                <span>Coins received:</span>
                <span>{status.coinsProgress.toLocaleString()} / 50,000</span>
              </div>
              <div className="flex justify-between">
                <span>Unique supporters:</span>
                <span>{status.giftersCount} / 50</span>
              </div>
            </div>
            <Button
              onClick={handleCommunityUnlock}
              disabled={!status.canUnlockCommunity || unlockMutation.isPending}
              className="w-full"
            >
              {status.canUnlockCommunity ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Unlock Now
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Requirements Not Met
                </>
              )}
            </Button>
          </div>

          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-green" />
              Growth Unlock
            </h3>
            <div className="text-sm text-gray-400 mb-3">
              <p>Requires: 1,000 subscribers + 100,000 total views</p>
            </div>
            <Button
              onClick={handleGrowthUnlock}
              disabled={!status.canUnlockGrowth || unlockMutation.isPending}
              className="w-full"
            >
              {status.canUnlockGrowth ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Unlock Now
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Requirements Not Met
                </>
              )}
            </Button>
          </div>

          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-gold" />
              Fast Track Unlock
            </h3>
            <div className="text-sm text-gray-400 mb-3">
              <p>One-time payment for immediate unlock</p>
              <p className="text-xs mt-1">
                Price: ${status.paidPrice} {status.paidPrice < 120 && '(Reduced for progress)'}
              </p>
            </div>
            <PayPalButtons
              createOrder={(data, actions) => {
                return actions.order.create({
                  purchase_units: [{
                    amount: {
                      value: status.paidPrice.toString()
                    }
                  }]
                })
              }}
              onApprove={(data, actions) => {
                return actions.order.capture().then((details) => {
                  paidUnlock.mutate({ creatorId, price: status.paidPrice })
                  onClose()
                })
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}