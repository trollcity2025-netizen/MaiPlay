import type { UnlockType } from '../../types/unlock'
import { cn } from '../../lib/utils'

interface CreatorBadgeProps {
  unlockType: UnlockType
  size?: 'sm' | 'md' | 'lg'
}

export function CreatorBadge({ unlockType, size = 'md' }: CreatorBadgeProps) {
  if (!unlockType) return null

  const badgeConfig = {
    community: {
      label: '🎬 Community Director',
      className: 'bg-gradient-to-r from-primary-purple to-purple-500 text-black glow-purple',
      description: 'Unlocked by community support'
    },
    growth: {
      label: '📈 Rising Director',
      className: 'bg-primary-red/20 text-primary-red border border-primary-red/50',
      description: 'Unlocked by growth'
    },
    paid: {
      label: '🚀 Fast Track Director',
      className: 'bg-surface text-gray-400 border border-border',
      description: 'Fast track unlock'
    }
  }

  const config = badgeConfig[unlockType]
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'rounded-full font-semibold inline-block',
          config.className,
          sizeClasses[size]
        )}
        title={config.description}
      >
        {config.label}
      </span>
    </div>
  )
}