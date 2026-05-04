import { Crown } from 'lucide-react'

interface Props {
  tierName?: string | null
}

const tierStyles: Record<string, string> = {
  supporter: 'from-red-500 to-red-700',
  vip: 'from-yellow-400 to-amber-600 text-black',
  elite: 'from-yellow-300 via-amber-300 to-red-500 text-black',
}

export function SubscriberBadge({ tierName }: Props) {
  if (!tierName) return null

  const key = tierName.toLowerCase()
  const classes = tierStyles[key] ?? 'from-red-500 to-red-700'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${classes} px-2 py-1 text-xs font-bold shadow-lg animate-pulse`}>
      <Crown className="h-3 w-3" />
      {tierName}
    </span>
  )
}
