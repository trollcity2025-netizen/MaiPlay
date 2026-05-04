import { Button } from '../ui/button'
import { Coins, Gift } from 'lucide-react'
import { useState } from 'react'
import { GiftModal } from './GiftModal'
import type { UnlockType } from '../../types/unlock'

interface GiftButtonProps {
  videoId: string
  creatorId: string
  creatorName: string
  movieLocked: boolean
  unlockType: UnlockType
}

export function GiftButton({ videoId, creatorId, creatorName, movieLocked, unlockType }: GiftButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="bg-accent-gold text-black hover:bg-accent-gold/90"
      >
        <Gift className="w-4 h-4 mr-2" />
        Support
      </Button>

      {showModal && (
        <GiftModal
          videoId={videoId}
          creatorId={creatorId}
          creatorName={creatorName}
          movieLocked={movieLocked}
          unlockType={unlockType}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}