import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart } from 'lucide-react'

interface GiftAnimationOverlayProps {
  isVisible: boolean
  amount: number
  creatorName: string
  onComplete: () => void
}

export function GiftAnimationOverlay({ isVisible, amount, creatorName, onComplete }: GiftAnimationOverlayProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([])

  useEffect(() => {
    if (isVisible) {
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100
      }))
      setParticles(newParticles)

      const timer = setTimeout(onComplete, 2000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="bg-accent-gold text-black px-6 py-4 rounded-lg shadow-lg"
            >
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-primary-red" />
                <div>
                  <p className="font-bold">Sent {amount} coins!</p>
                  <p className="text-sm">To {creatorName}</p>
                </div>
              </div>
            </motion.div>

            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ 
                  x: `${p.x - 50}px`, 
                  y: `${p.y - 50}px`,
                  opacity: 0 
                }}
                transition={{ duration: 1.5 }}
                className="absolute top-1/2 left-1/2"
              >
                <Heart className="w-4 h-4 text-accent-gold" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}