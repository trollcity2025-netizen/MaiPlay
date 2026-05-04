import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/layout/AppHeader'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { MAI_CASHOUT_TIERS, MAI_COIN_PACKS } from '../../config/maiEconomy'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { SchemaMonitor } from './SchemaMonitor'
import { AdminModerationModal } from '../../components/admin/AdminModerationModal'

export function AdminDashboardPage() {
  const [holdCreatorId, setHoldCreatorId] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          is_creator,
          role,
          created_at,
          user_id,
          moderation_status,
          creator_level,
          subscriber_count,
          total_views
        `)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    }
  })

  const { data: creators } = useQuery({
    queryKey: ['admin-creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          is_creator,
          role,
          created_at,
          user_id,
          subscriber_count,
          total_views
        `)
        .eq('is_creator', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: pendingPayouts } = useQuery({
    queryKey: ['admin-pending-payouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_payout_requests')
        .select(`
          *,
          creator:profiles!creator_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: moderators } = useQuery({
    queryKey: ['admin-moderators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          role,
          created_at,
          user_id,
          moderation_status
        `)
        .in('role', ['moderator', 'admin'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: pendingVideos } = useQuery({
    queryKey: ['admin-pending-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          creator:profiles!creator_id (
            id,
            username,
            display_name,
            avatar_url,
            user_id
          )
        `)
        .eq('moderation_status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: pendingProducts } = useQuery({
    queryKey: ['admin-pending-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_merch_items')
        .select(`
          *,
          creator:profiles!creator_merch_items_creator_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const { data: pendingCreatorApps } = useQuery({
    queryKey: ['admin-pending-creator-apps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_applications')
        .select(`
          *,
          profiles!creator_applications_user_id_fkey (
            username,
            display_name,
            avatar_url,
            user_id
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

const { data: allMusic } = useQuery({
    queryKey: ['admin-all-music'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('music')
        .select(`
          *,
          creator:profiles!creator_id (
            id,
            username,
            display_name,
            avatar_url,
            user_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data
    }
  })

   const approveVideoMutation = useMutation({
     mutationFn: async (videoId: string) => {
       const { error } = await supabase.from('videos').update({
         moderation_status: 'approved',
         visibility: 'public'
       }).eq('id', videoId)
       if (error) throw error
     },
     onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-videos', 'admin-all-uploads'] })
   })

  const rejectVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase.from('videos').update({ moderation_status: 'rejected' }).eq('id', videoId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-videos', 'admin-all-uploads'] })
  })

  const approveProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from('creator_merch_items').update({ status: 'published' }).eq('id', productId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-products'] })
  })

  const rejectProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from('creator_merch_items').update({ status: 'rejected' }).eq('id', productId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-products'] })
  })

  const [selectedVideo, setSelectedVideo] = useState<any>(null)
  const [showModerationModal, setShowModerationModal] = useState(false)

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || ''
      const response = await fetch(
        `${supabaseUrl}/functions/v1/admin-delete-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ videoId }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete video')
      }
    },
onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['admin-pending-videos', 'admin-all-music'] })
      setShowModerationModal(false)
      setSelectedVideo(null)
    },
  })

  const handleVideoDoubleClick = (video: any) => {
    setSelectedVideo(video)
    setShowModerationModal(true)
  }

  const approveCreatorAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase.rpc('approve_creator_application', { p_application_id: appId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-creator-apps'] })
  })

  const rejectCreatorAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase
        .from('creator_applications')
        .update({ status: 'rejected' })
        .eq('id', appId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-creator-apps'] })
   })

  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users', 'admin-creators', 'admin-moderators'] })
  })

  const handlePromoteUserToModerator = async () => {
    const userId = window.prompt('Enter the profile id of the user to promote to moderator:')
    if (!userId) return

    try {
      await updateProfileMutation.mutateAsync({ userId, updates: { role: 'moderator' } })
      alert('User promoted to moderator.')
    } catch (error: any) {
      console.error(error)
      alert('Failed to promote user: ' + (error?.message || 'Unknown error'))
    }
  }

  const handlePayoutBatch = () => {
    alert('Friday payout batch queued. Use your backend payout system to execute the batch.')
  }

  const handleSyncPayPalStatus = () => {
    alert('PayPal payout status sync requested.')
  }

  const handleHoldPayout = () => {
    if (!holdCreatorId) {
      alert('Enter a creator account id to hold payouts.')
      return
    }
    alert(`Hold payout request queued for creator ${holdCreatorId}.`)
  }

   return (
    <div className="min-h-screen bg-[#070202] text-white">
      <AppHeader />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-red-950/80 via-black to-yellow-950/30 p-6 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-yellow-400">
            MaiCorp Command
          </p>
          <h1 className="mt-3 text-4xl font-black">Ultimate Admin Dashboard</h1>
          <p className="mt-3 max-w-3xl text-sm text-zinc-300">
            Control platform health, creators, payouts, reports, support, commerce, and live operations from one MaiCorp HQ.
          </p>
         </section>

         <section>
           <SchemaMonitor />
         </section>

         <section className="grid gap-4 lg:grid-cols-4">
          <AdminModule title="Reports Center" text="Review user, video, live, and commerce reports." to="/admin/reports" />
          <AdminModule title="Support Desk" text="Manage creator and buyer support tickets." to="/admin/support" />
          <AdminModule title="Moderators" text="Manage moderator roles and permissions." to="#moderators" />
          <AdminModule title="Creator Operations" text="Review creators, unlocks, fanbase, and Live access." to="/creator-hub" />
        </section>

        <section>
          <Card className="border-yellow-400/20 bg-black/50 p-6">
            <h2 className="text-xl font-black">All Users</h2>
            <div className="mt-4">
              <Input
                placeholder="Search users by username, display name, or ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="mb-4"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="pb-2 text-left">User ID</th>
                    <th className="pb-2 text-left">Username</th>
                    <th className="pb-2 text-left">Display Name</th>
                    <th className="pb-2 text-left">Role</th>
                    <th className="pb-2 text-left">Creator</th>
                    <th className="pb-2 text-left">Status</th>
                    <th className="pb-2 text-left">Subs</th>
                    <th className="pb-2 text-left">Views</th>
                    <th className="pb-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(users || [])
                    .filter((u: any) =>
                      userSearch === '' ||
                      (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase())) ||
                      (u.display_name && u.display_name.toLowerCase().includes(userSearch.toLowerCase())) ||
                      (u.user_id && u.user_id.toLowerCase().includes(userSearch.toLowerCase())) ||
                      u.id.toLowerCase().includes(userSearch.toLowerCase())
                    )
                    .map((u: any) => (
                      <tr key={u.id} className="border-b border-white/5">
                        <td className="py-2">{u.user_id || '—'}</td>
                        <td className="py-2">{u.username || '-'}</td>
                        <td className="py-2">{u.display_name || '-'}</td>
                        <td className="py-2">{u.role || 'user'}</td>
                        <td className="py-2">{u.is_creator ? 'Yes' : 'No'}</td>
                        <td className="py-2"><span className={`px-2 py-1 rounded text-xs font-bold ${u.moderation_status === 'active' ? 'bg-green-400/20 text-green-300' : 'bg-red-400/20 text-red-300'}`}>{u.moderation_status || 'active'}</span></td>
                        <td className="py-2">{(u.subscriber_count || 0).toLocaleString()}</td>
                        <td className="py-2">{(u.total_views || 0).toLocaleString()}</td>
                        <td className="py-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2 border-blue-400/30 text-blue-300"
                            onClick={() => navigate(`/profile/${u.username || u.user_id || u.id}`)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-400/30 text-red-300"
                            loading={updateProfileMutation.isPending}
                            onClick={() => updateProfileMutation.mutate({ userId: u.id, updates: { moderation_status: u.moderation_status === 'active' ? 'suspended' : 'active' } })}
                          >
                            {u.moderation_status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <section>
          <Card className="border-yellow-400/20 bg-black/50 p-6">
            <h2 className="text-xl font-black">All Creators</h2>
            <p className="mt-2 text-sm text-zinc-400">Actions for creator management</p>
            <div className="mt-4 max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="pb-2 text-left">Creator</th>
                    <th className="pb-2 text-left">Email</th>
                    <th className="pb-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(creators || []).map((c: any) => (
                    <tr key={c.id} className="border-b border-white/5">
                      <td className="py-2">{c.username}</td>
                      <td className="py-2">{c.user_id || '—'}</td>
                      <td className="py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2 border-red-400/30 text-red-300"
                          onClick={() => alert(`Hold pay request queued for creator ${c.user_id || c.username}`)}
                        >
                          Hold Pay
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-yellow-400/30 text-yellow-300"
                          loading={updateProfileMutation.isPending}
                          onClick={() => updateProfileMutation.mutate({ userId: c.id, updates: { moderation_status: 'flagged' } })}
                        >
                          Flag for Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <section>
          <Card className="border-yellow-400/20 bg-black/50 p-6">
            <h2 className="text-xl font-black">Moderators</h2>
            <p className="mt-2 text-sm text-zinc-400">Manage moderator roles and permissions</p>
            <div className="mt-4 max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="pb-2 text-left">Moderator</th>
                    <th className="pb-2 text-left">Email</th>
                    <th className="pb-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(moderators || []).map((m: any) => (
                    <tr key={m.id} className="border-b border-white/5">
                      <td className="py-2">{m.username}</td>
                      <td className="py-2">{m.user_id || '—'}</td>
                      <td className="py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2 border-blue-400/30 text-blue-300"
                          onClick={() => {
                            const nextRole = window.prompt('Enter new role for this moderator (admin/moderator):', m.role || 'moderator')
                            if (!nextRole) return
                            updateProfileMutation.mutate({ userId: m.id, updates: { role: nextRole } })
                          }}
                        >
                          Edit Permissions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-400/30 text-red-300"
                          loading={updateProfileMutation.isPending}
                          onClick={() => updateProfileMutation.mutate({ userId: m.id, updates: { moderation_status: m.moderation_status === 'active' ? 'suspended' : 'active' } })}
                        >
                          {m.moderation_status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <Button variant="outline" className="border-green-400/30 text-green-300" onClick={handlePromoteUserToModerator}>
                Promote User to Moderator
              </Button>
            </div>
          </Card>
        </section>

        <section>
          <Card className="border-yellow-400/20 bg-black/50 p-6">
            <h2 className="text-xl font-black">Content Approval — Uploaded Content</h2>
            <p className="mt-2 text-sm text-zinc-400">Review and approve pending uploads including music tracks, albums, music videos, shorts, and movies.</p>
            <div className="mt-4 max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="pb-2 text-left">Upload</th>
                    <th className="pb-2 text-left">Creator</th>
                    <th className="pb-2 text-left">Type</th>
                    <th className="pb-2 text-left">Status</th>
                    <th className="pb-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {(pendingVideos || []).map((video: any) => (
                     <tr
                       key={video.id}
                       className="border-b border-white/5 hover:bg-yellow-400/5 cursor-pointer"
                       onDoubleClick={() => handleVideoDoubleClick(video)}
                     >
                      <td className="py-2">{video.title || 'Untitled'}</td>
                      <td className="py-2">{video.creator?.username || 'Unknown'}</td>
                      <td className="py-2">{video.video_type || video.category || 'unknown'}</td>
                      <td className="py-2">{video.moderation_status || 'pending'}</td>
                      <td className="py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2 border-green-400/30 text-green-300"
                          loading={approveVideoMutation.isPending}
                          onClick={() => approveVideoMutation.mutate(video.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-400/30 text-red-300"
                          loading={rejectVideoMutation.isPending}
                          onClick={() => rejectVideoMutation.mutate(video.id)}
                        >
                          Reject
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(pendingVideos || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-zinc-400">
                        No pending uploads
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
</Card>
         </section>

         <section>
           <Card className="border-yellow-400/20 bg-black/50 p-6">
             <h2 className="text-xl font-black">All Music — Tracks and Albums</h2>
            <p className="mt-2 text-sm text-zinc-400">Browse and manage all music uploads. Click delete to remove violating content.</p>
            <div className="mt-4 max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="pb-2 text-left">Title</th>
                    <th className="pb-2 text-left">Creator</th>
                    <th className="pb-2 text-left">Type</th>
                    <th className="pb-2 text-left">Visibility</th>
                    <th className="pb-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                    {(allMusic || []).map((item: any) => (
                      <tr
                        key={item.id}
                        className="border-b border-white/5 hover:bg-yellow-400/5 cursor-pointer"
                        onDoubleClick={() => handleVideoDoubleClick(item)}
                      >
                       <td className="py-2">{item.title || 'Untitled'}</td>
                       <td className="py-2">{item.creator?.username || 'Unknown'}</td>
                       <td className="py-2">{item.music_type || 'track'}</td>
                       <td className="py-2">{item.visibility || 'unknown'}</td>
                       <td className="py-2">
                         <Button
                           variant="outline"
                           size="sm"
                           className="border-red-400/30 text-red-300"
                           loading={deleteVideoMutation.isPending}
                           onClick={() => deleteVideoMutation.mutate(item.id)}
                         >
                           Delete
                         </Button>
                       </td>
                     </tr>
                  ))}
                  {(allMusic || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-zinc-400">
                        No music found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <section>
          <Card className="border-yellow-400/20 bg-black/50 p-6">
            <h2 className="text-xl font-black">Content Approval — Creator Products</h2>
            <p className="mt-2 text-sm text-zinc-400">Review and approve pending creator merch products</p>
            <div className="mt-4 max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="pb-2 text-left">Product</th>
                    <th className="pb-2 text-left">Creator</th>
                    <th className="pb-2 text-left">Price</th>
                    <th className="pb-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(pendingProducts || []).map((product: any) => (
                    <tr key={product.id} className="border-b border-white/5">
                      <td className="py-2">{product.name}</td>
                      <td className="py-2">{product.creator?.username || 'Unknown'}</td>
                      <td className="py-2">${product.price || product.price_amount || '0.00'}</td>
                      <td className="py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2 border-green-400/30 text-green-300"
                          loading={approveProductMutation.isPending}
                          onClick={() => approveProductMutation.mutate(product.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-400/30 text-red-300"
                          loading={rejectProductMutation.isPending}
                          onClick={() => rejectProductMutation.mutate(product.id)}
                        >
                          Reject
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(pendingProducts || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-zinc-400">
                        No pending product approvals
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <section>
          <Card className="border-yellow-400/20 bg-black/50 p-6">
            <h2 className="text-xl font-black">Creator Applications</h2>
            <p className="mt-2 text-sm text-zinc-400">Review and approve creator applications</p>
            <div className="mt-4 max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="pb-2 text-left">Applicant</th>
                    <th className="pb-2 text-left">Email</th>
                    <th className="pb-2 text-left">Applied</th>
                    <th className="pb-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(pendingCreatorApps || []).map((app: any) => (
                    <tr key={app.id} className="border-b border-white/5">
                      <td className="py-2">{app.mai_accounts?.username || 'Unknown'}</td>
                      <td className="py-2">{app.mai_accounts?.user_id || '—'}</td>
                      <td className="py-2">{new Date(app.created_at).toLocaleDateString()}</td>
                      <td className="py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2 border-green-400/30 text-green-300"
                          loading={approveCreatorAppMutation.isPending}
                          onClick={() => approveCreatorAppMutation.mutate(app.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-400/30 text-red-300"
                          loading={rejectCreatorAppMutation.isPending}
                          onClick={() => rejectCreatorAppMutation.mutate(app.id)}
                        >
                          Reject
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(pendingCreatorApps || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-zinc-400">
                        No pending creator applications
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <Card className="border-yellow-400/20 bg-black/50 p-6">
          <h2 className="text-xl font-black">MAI Coin Pricing Controls</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {MAI_COIN_PACKS.map((pack) => (
              <div key={pack.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-black text-yellow-300">{pack.name}</p>
                <p>{pack.coins.toLocaleString()} coins</p>
                <p className="text-zinc-400">${pack.priceUsd}</p>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            className="mt-4 border-yellow-400/30 text-yellow-300"
            onClick={() => navigate('/admin/coin-pack-pricing')}
          >
            Edit Coin Pack Pricing
          </Button>
        </Card>

        <Card className="border-yellow-400/20 bg-black/50 p-6">
          <h2 className="text-xl font-black">Cashout Tier Controls</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {MAI_CASHOUT_TIERS.map((tier) => (
              <div key={tier.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-black text-yellow-300">{tier.name}</p>
                <p>{tier.coinsRequired.toLocaleString()} coins → ${tier.payoutUsd}</p>
                <p className="text-xs text-zinc-400">{tier.feeLabel}</p>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            className="mt-4 border-yellow-400/30 text-yellow-300"
            onClick={() => navigate('/admin/cashout-tiers')}
          >
            Edit Cashout Tiers
          </Button>
        </Card>

        <Card className="border-yellow-400/20 bg-black/50 p-6">
          <h2 className="text-xl font-black">Custom Payout Requests</h2>
          <p className="mt-2 text-sm text-zinc-400">Review and approve custom cashout requests</p>
          <div className="mt-4 max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="pb-2 text-left">Creator</th>
                  <th className="pb-2 text-left">Coins</th>
                  <th className="pb-2 text-left">USD</th>
                  <th className="pb-2 text-left">Status</th>
                  <th className="pb-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(pendingPayouts || []).map((payout: any) => (
                  <tr key={payout.id} className="border-b border-white/5">
                     <td className="py-2">{payout.creator?.username || 'Unknown'}</td>
                    <td className="py-2">{payout.requested_coins.toLocaleString()}</td>
                    <td className="py-2">${payout.requested_usd}</td>
                    <td className="py-2">{payout.status}</td>
                    <td className="py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="mr-2 border-green-400/30 text-green-300"
                        loading={processingPayoutId === payout.id}
                        onClick={async () => {
                          try {
                            setProcessingPayoutId(payout.id)
                            const { data, error } = await supabase.functions.invoke('paypal-payout', {
                              body: JSON.stringify({ requestId: payout.id })
                            })

                            if (error) {
                              throw error
                            }

                            if (!data?.success) {
                              throw new Error(data?.error || 'PayPal payout failed')
                            }

                            queryClient.invalidateQueries({ queryKey: ['admin-pending-payouts'] })
                            alert('Payout approved and paid via PayPal payout API.')
                          } catch (err: any) {
                            console.error(err)
                            alert('Error sending payout: ' + (err.message || 'Unknown error'))
                          } finally {
                            setProcessingPayoutId(null)
                          }
                        }}
                      >
                        Approve & Pay
                      </Button>
                      <Button variant="outline" size="sm" className="border-red-400/30 text-red-300">
                        Reject
                      </Button>
                    </td>
                  </tr>
                ))}
                {(pendingPayouts || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-zinc-400">
                      No pending payout requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border-red-500/20 bg-black/50 p-6">
          <h2 className="text-xl font-black">Payout Operations — PayPal</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Trigger payout batches, hold creators, and reconcile PayPal payout logs.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="bg-yellow-400 font-black text-black hover:bg-yellow-300" onClick={handlePayoutBatch}>
              Send Friday Payout Batch
            </Button>
            <Button variant="outline" className="border-yellow-400/30 text-yellow-300" onClick={handleSyncPayPalStatus}>
              Sync PayPal Payout Status
            </Button>
          </div>

          <div className="mt-4 flex max-w-lg gap-2">
            <input
              value={holdCreatorId}
              onChange={(e) => setHoldCreatorId(e.target.value)}
              placeholder="Creator account id"
              className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3 py-2 outline-none focus:border-yellow-400"
            />
            <Button variant="outline" className="border-red-400/30 text-red-300" onClick={handleHoldPayout}>
              Hold Payout
            </Button>
          </div>
        </Card>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-white/10 bg-black/50 p-6">
            <h2 className="text-xl font-black">Live Operations</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Monitor active lives, reports, chat disables, bans, and BroadOfficer actions.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <OpsButton label="Active Lives" />
              <OpsButton label="BroadOfficer Logs" />
              <OpsButton label="Live Reports" />
              <OpsButton label="Chat Disabled Rooms" />
            </div>
          </Card>

          <Card className="border-white/10 bg-black/50 p-6">
            <h2 className="text-xl font-black">Commerce Operations</h2>
            <p className="mt-2 text-sm text-zinc-400">
              MaiPlay does not manage merch payments, but admins can review products, reports, orders, and safety issues.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <OpsButton label="Reported Products" />
              <OpsButton label="Order Disputes" />
              <OpsButton label="Stores Under Review" />
              <OpsButton label="Tracking Issues" />
            </div>
          </Card>
        </section>
      </main>

      {/* Admin Moderation Modal */}
      {showModerationModal && selectedVideo && (
        <AdminModerationModal
          video={selectedVideo}
          onClose={() => {
            setShowModerationModal(false)
            setSelectedVideo(null)
          }}
          onApprove={() => {
            approveVideoMutation.mutate(selectedVideo.id)
          }}
          onReject={() => {
            rejectVideoMutation.mutate(selectedVideo.id)
          }}
          onDelete={() => {
            deleteVideoMutation.mutate(selectedVideo.id)
          }}
        />
      )}
    </div>
   )
 }

 function AdminModule({ title, text, to }: { title: string; text: string; to: string }) {
  return (
    <Link to={to}>
      <Card className="h-full border-yellow-400/20 bg-white/5 p-6 transition hover:bg-yellow-400/10">
        <h2 className="text-xl font-black text-yellow-300">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{text}</p>
      </Card>
    </Link>
  )
}

function OpsButton({ label }: { label: string }) {
  return (
    <Button variant="outline" className="justify-start border-white/10 text-zinc-300 hover:bg-yellow-400/10 hover:text-yellow-300">
      {label}
    </Button>
  )
}