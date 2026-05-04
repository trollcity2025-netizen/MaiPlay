import { Clock } from 'lucide-react'

interface BoostBadgeProps {
  boostLevel: 'small' | 'medium' | 'large' | 'featured'
  endsAt: string
}

export function BoostBadge({ boostLevel, endsAt }: BoostBadgeProps) {
  const remaining = Math.max(0, new Date(endsAt).getTime() - Date.now())
  const hours = Math.floor(remaining / (1000 * 60 * 60))

  if (remaining <= 0) return null

  const badgeStyles = {
    small: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    medium: 'bg-primary-green/20 text-primary-green border border-primary-green/30',
    large: 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30',
    featured: 'bg-gradient-to-r from-accent-gold to-primary-green text-black'
  }

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${badgeStyles[boostLevel]}`}>
      <Clock className="w-3 h-3" />
      Boosted • {hours}h left
    </div>
  )
}