import { Button } from '../ui/button'
import { Zap, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { BoostModal } from './BoostModal'

interface BoostButtonProps {
  videoId: string
  ownerId: string
}

export function BoostButton({ videoId, ownerId }: BoostButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        variant="outline"
        className="border-accent-gold text-accent-gold hover:bg-accent-gold/10"
      >
        <Zap className="w-4 h-4 mr-2" />
        Boost
      </Button>

      {showModal && (
        <BoostModal
          videoId={videoId}
          ownerId={ownerId}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}