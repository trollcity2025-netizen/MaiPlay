import { Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAuthAccount } from '../../auth/AuthAccountProvider'

export function RequireAuth({ children }: { children: ReactElement }) {
  const { loading, user } = useAuthAccount()
  if (loading) return <div className="min-h-screen bg-background" />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export function RequireAdminOrModerator({ children }: { children: ReactElement }) {
  const { loading, user, account } = useAuthAccount()
  if (loading) return <div className="min-h-screen bg-background" />
  if (!user) return <Navigate to="/login" replace />
  if (!account || (account.role !== 'admin' && account.role !== 'moderator')) {
    return <Navigate to="/home" replace />
  }
  return children
}

export function RequireModerator({ children }: { children: ReactElement }) {
  const { loading, user, account } = useAuthAccount()
  if (loading) return <div className="min-h-screen bg-background" />
  if (!user) return <Navigate to="/login" replace />
  if (!account || account.role !== 'moderator') {
    return <Navigate to="/home" replace />
  }
  return children
}
