import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthAccount } from '../auth/AuthAccountProvider'

export function useModActions() {
  const { account } = useAuthAccount()
  const queryClient = useQueryClient()

  const isMod = account?.role === 'admin' || account?.role === 'moderator'

  const deleteContentMutation = useMutation({
    mutationFn: async ({ contentType, contentId }: { contentType: 'video' | 'music'; contentId: string }) => {
      const sessionResponse = await supabase.auth.getSession()
      const token = sessionResponse.data.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contentType, contentId }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to delete content')
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videos', 'music'] })
  })

  const suspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('profiles').update({ suspended: true }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  })

  const deleteVideo = (videoId: string) => deleteContentMutation.mutate({ contentType: 'video', contentId: videoId })
  const deleteMusic = (musicId: string) => deleteContentMutation.mutate({ contentType: 'music', contentId: musicId })

  const canDelete = (creatorRole?: string) => {
    if (!isMod) return false
    if (creatorRole === 'admin') return false
    return true
  }

  return {
    isMod,
    deleteVideo,
    deleteMusic,
    suspendUser: suspendUserMutation.mutate,
    canDelete,
  }
}