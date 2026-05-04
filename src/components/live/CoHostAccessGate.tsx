import { ReactNode } from 'react'
import { useSubscription } from '../../hooks/useSubscription'

interface Props {
  creatorId: string
  children: ReactNode
  fallback?: ReactNode
}

export function CoHostAccessGate({ creatorId, children, fallback }: Props) {
  const { data: sub, isLoading } = useSubscription(creatorId)

  if (isLoading) {
    return <div className="text-sm text-yellow-200">Checking co-host eligibility...</div>
  }

  const isEligible = Boolean(sub && ['active', 'grace'].includes(sub.status))

  if (!isEligible) {
    return fallback ?? <div className="rounded-lg border border-red-400/40 bg-red-950/60 p-3 text-sm text-red-100">VIP+ subscription required to request co-host access.</div>
  }

  return <>{children}</>
}
