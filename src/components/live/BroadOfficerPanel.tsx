import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Shield, Ban, MessageSquare, AlertTriangle, Users } from 'lucide-react'

interface BroadOfficerPanelProps {
  creatorId: string
  liveSessionId: string | null
}

export function BroadOfficerPanel({ creatorId, liveSessionId }: BroadOfficerPanelProps) {
  const [selectedUser, setSelectedUser] = useState('')
  const [actionReason, setActionReason] = useState('')
  const [actionType, setActionType] = useState('')
  const [showModerateDialog, setShowModerateDialog] = useState(false)
  const queryClient = useQueryClient()

  // Fetch BroadOfficer status
  const { data: isBroadOfficer } = useQuery({
    queryKey: ['broadofficer-status', creatorId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data } = await supabase
        .from('creator_broadofficers')
        .select('id')
        .eq('creator_id', creatorId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      return Boolean(data)
    }
  })

  // Fetch recent moderation actions
  const { data: recentActions } = useQuery({
    queryKey: ['moderation-actions', creatorId, liveSessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('live_user_moderation_actions')
        .select(`
          id,
          action_type,
          reason,
          created_at,
target_user:profiles!target_user_id(id, username, display_name),
           actor_user:profiles!actor_user_id(username)
        `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(10)

      return data || []
    },
    enabled: Boolean(isBroadOfficer)
  })

  // Fetch active bans
  const { data: activeBans } = useQuery({
    queryKey: ['active-bans', creatorId],
    queryFn: async () => {
      const { data: banData, error: banError } = await supabase
        .from('creator_broadcast_bans')
        .select('id, ban_type, starts_at, expires_at, user_id')
        .eq('creator_id', creatorId)
        .eq('active', true)
      if (banError) throw banError

      const bans = banData ?? []
      const uniqueUserIds = Array.from(new Set(bans.map((ban: any) => ban.user_id).filter(Boolean) as string[]))

      const { data: users, error: usersError } = uniqueUserIds.length > 0
        ? await supabase.from('profiles').select('id, username, display_name').in('id', uniqueUserIds)
        : { data: [], error: null }
      if (usersError) throw usersError

      const userMap = new Map((users ?? []).map((user: any) => [user.id, user]))

      return bans.map((ban: any) => ({
        ...ban,
        target_user: userMap.get(ban.user_id) || null,
      }))
    },
    enabled: Boolean(isBroadOfficer)
  })

  // Moderation action mutation
  const moderationMutation = useMutation({
    mutationFn: async ({ targetUserId, actionType, reason }: {
      targetUserId: string
      actionType: string
      reason: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('live_user_moderation_actions')
        .insert({
          creator_id: creatorId,
          live_session_id: liveSessionId,
          target_user_id: targetUserId,
          actor_user_id: user.id,
          action_type: actionType,
          reason: reason || null,
          expires_at: actionType === 'ban_1_week' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() :
                     actionType === 'ban_1_month' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() :
                     actionType === 'ban_permanent' ? null : null
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-actions'] })
      setSelectedUser('')
      setActionReason('')
      setActionType('')
    }
  })

  if (!isBroadOfficer) {
    return null
  }

  const handleModerationAction = () => {
    if (!selectedUser || !actionType) return

    moderationMutation.mutate({
      targetUserId: selectedUser,
      actionType,
      reason: actionReason
    })
  }

  return (
    <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-red-400">
        <Shield className="w-5 h-5" />
        <h3 className="font-semibold">BroadOfficer Controls</h3>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowModerateDialog(true)}
          className="flex items-center gap-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 px-3 py-2 rounded text-sm"
        >
          <Ban className="w-4 h-4" />
          Moderate User
        </button>

        <Button variant="outline" size="sm" className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
          <AlertTriangle className="w-4 h-4 mr-1" />
          Report Issue
        </Button>
      </div>

      {/* Moderation Dialog */}
      {showModerateDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-white font-semibold mb-4">Moderate User</h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="target-user" className="text-white">Target User ID</Label>
                <Input
                  id="target-user"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  placeholder="Enter user ID"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label htmlFor="action-type" className="text-white">Action Type</Label>
                <select
                  id="action-type"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2"
                >
                  <option value="">Select action</option>
                  <option value="chat_disabled">Disable Chat (Temp)</option>
                  <option value="kick">Kick from Stream</option>
                  <option value="ban_1_week">Ban (1 Week)</option>
                  <option value="ban_1_month">Ban (1 Month)</option>
                  <option value="ban_permanent">Ban (Permanent)</option>
                  <option value="report_to_admin">Report to Admin</option>
                </select>
              </div>

              <div>
                <Label htmlFor="reason" className="text-white">Reason (Optional)</Label>
                <Input
                  id="reason"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Reason for action"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleModerationAction}
                  disabled={moderationMutation.isPending || !selectedUser || !actionType}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {moderationMutation.isPending ? 'Processing...' : 'Execute Action'}
                </Button>
                <Button
                  onClick={() => setShowModerateDialog(false)}
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:bg-gray-800"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Bans */}
      {activeBans && activeBans.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1">
            <Users className="w-4 h-4" />
            Active Bans ({activeBans.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {activeBans.map((ban: any) => (
              <div key={ban.id} className="text-xs bg-red-950/40 p-2 rounded border border-red-500/20">
                <div className="font-medium text-red-300">
                  {ban.target_user?.username || ban.target_user?.display_name || 'Unknown User'}
                </div>
                <div className="text-red-400">
                  {ban.ban_type} • Expires: {ban.expires_at ? new Date(ban.expires_at).toLocaleDateString() : 'Never'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Actions */}
      {recentActions && recentActions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            Recent Actions
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {recentActions.slice(0, 5).map((action: any) => (
              <div key={action.id} className="text-xs bg-gray-800/40 p-2 rounded">
                <div className="text-gray-300">
                  {action.action_type.replace('_', ' ').toUpperCase()} on {action.target_user?.username || 'Unknown'}
                </div>
                <div className="text-gray-500">
                  {new Date(action.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}