import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, Gift, Coins, Users, Music, Crown } from 'lucide-react'

import { AppHeader } from '../../components/layout/AppHeader'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { MAI_CASHOUT_TIERS, MAI_COIN_PACKS } from '../../config/maiEconomy'
import { supabase } from '../../lib/supabase'
import { SchemaMonitor } from './SchemaMonitor'
import { AdminModerationModal } from '../../components/admin/AdminModerationModal'

type ProfileLite = {
  id: string
  user_id?: string | null
  username?: string | null
  display_name?: string | null
  role?: string | null
  is_creator?: boolean | null
  is_artist?: boolean | null
  moderation_status?: string | null
  subscriber_count?: number | null
  total_views?: number | null
  created_at?: string | null
}

type MaiCoinTransaction = {
  id: string
  user_id: string
  amount: number
  transaction_type?: string | null
  source?: string | null
  metadata?: any
  created_at?: string | null
}

const money = (value: number) =>
  value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })

const number = (value: number) => value.toLocaleString()

export function AdminDashboardPage() {
  const [holdCreatorId, setHoldCreatorId] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [revenueSearch, setRevenueSearch] = useState('')
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<any>(null)
  const [showModerationModal, setShowModerationModal] = useState(false)

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
      return data as ProfileLite[]
    },
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
      return data as ProfileLite[]
    },
  })

   const { data: pendingPayouts } = useQuery({
     queryKey: ['admin-pending-payouts'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('pending_payout_requests')
         .select('*')
         .eq('status', 'pending')
         .order('created_at', { ascending: false })

       if (error) throw error
       return data
     },
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
    },
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
    },
  })

   const { data: pendingProducts } = useQuery({
     queryKey: ['admin-pending-products'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('creator_merch_items')
         .select('*')
         .eq('status', 'pending_review')
         .order('created_at', { ascending: false })

       if (error) throw error
       return data
     },
   })

  const { data: pendingCreatorApps } = useQuery({
    queryKey: ['admin-pending-creator-apps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_applications')
        .select(`
          *,
          profiles (
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
    },
  })

   const { data: revenueTransactions, isLoading: revenueLoading } = useQuery({
    queryKey: ['admin-platform-revenue-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mai_coin_transactions')
        .select('id,user_id,amount,transaction_type,source,metadata,created_at')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) throw error
      return data as MaiCoinTransaction[]
    },
  })

  const profileByAuthUserId = useMemo(() => {
    const map = new Map<string, ProfileLite>()

    ;(users || []).forEach((profile) => {
      if (profile.user_id) map.set(profile.user_id, profile)
      map.set(profile.id, profile)
    })

    return map
  }, [users])

  const revenueData = useMemo(() => {
    const transactions = revenueTransactions || []

    const purchaseTransactions = transactions.filter((tx) => {
      const type = `${tx.transaction_type || ''}`.toLowerCase()
      const source = `${tx.source || ''}`.toLowerCase()
      const metadata = JSON.stringify(tx.metadata || {}).toLowerCase()

      return (
        type.includes('purchase') ||
        source.includes('paypal') ||
        metadata.includes('paypal') ||
        Boolean(tx.metadata?.orderId || tx.metadata?.paypal_order_id || tx.metadata?.packId)
      )
    })

    const giftTransactions = transactions.filter((tx) => {
      const type = `${tx.transaction_type || ''}`.toLowerCase()
      const source = `${tx.source || ''}`.toLowerCase()
      const metadata = JSON.stringify(tx.metadata || {}).toLowerCase()

      return (
        type.includes('gift') ||
        source.includes('gift') ||
        metadata.includes('gift') ||
        Boolean(tx.metadata?.creator_id || tx.metadata?.artist_id || tx.metadata?.recipient_id)
      )
    })

    const purchaseRows = purchaseTransactions.map((tx) => {
      const packId = tx.metadata?.packId || tx.metadata?.package_id || tx.metadata?.pack_id || ''
      const matchingPack = MAI_COIN_PACKS.find(
        (pack: any) =>
          pack.name === packId ||
          pack.id === packId ||
          `${pack.coins}` === `${tx.amount}` ||
          tx.metadata?.packName === pack.name
      )

      const usd =
        Number(tx.metadata?.priceUsd) ||
        Number(tx.metadata?.usd) ||
        Number(tx.metadata?.amountUsd) ||
        Number(tx.metadata?.gross_usd) ||
        Number(matchingPack?.priceUsd) ||
        0

      return {
        ...tx,
        usd,
        packName: tx.metadata?.packName || tx.metadata?.pack_name || matchingPack?.name || packId || 'Coin Pack',
        buyer: profileByAuthUserId.get(tx.user_id),
      }
    })

    const giftRows = giftTransactions.map((tx) => {
      const recipientId =
        tx.metadata?.recipient_id ||
        tx.metadata?.creator_id ||
        tx.metadata?.artist_id ||
        tx.metadata?.to_user_id ||
        tx.user_id

      const senderId = tx.metadata?.sender_id || tx.metadata?.gifter_id || tx.metadata?.from_user_id || tx.user_id

      return {
        ...tx,
        recipientId,
        senderId,
        recipient: profileByAuthUserId.get(recipientId) || profileByAuthUserId.get(tx.user_id),
        sender: profileByAuthUserId.get(senderId),
      }
    })

    const giftTotalsByRecipient = new Map<
      string,
      {
        recipientId: string
        recipient?: ProfileLite
        giftedCoins: number
        giftCount: number
        creatorType: string
      }
    >()

    giftRows.forEach((gift) => {
      const key = gift.recipientId || gift.user_id
      const existing =
        giftTotalsByRecipient.get(key) ||
        {
          recipientId: key,
          recipient: gift.recipient,
          giftedCoins: 0,
          giftCount: 0,
          creatorType: gift.recipient?.is_creator
            ? 'Creator'
            : gift.recipient?.is_artist
              ? 'Artist'
              : gift.recipient?.role || 'User',
        }

      existing.giftedCoins += Number(gift.amount || 0)
      existing.giftCount += 1
      giftTotalsByRecipient.set(key, existing)
    })

    const totalGrossRevenueUsd = purchaseRows.reduce((sum, tx) => sum + tx.usd, 0)
    const totalPurchasedCoins = purchaseRows.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
    const totalGiftedCoins = giftRows.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

    return {
      purchaseRows,
      giftRows,
      giftTotalsByRecipient: Array.from(giftTotalsByRecipient.values()).sort(
        (a, b) => b.giftedCoins - a.giftedCoins
      ),
      totalGrossRevenueUsd,
      totalPurchasedCoins,
      totalGiftedCoins,
      purchaseCount: purchaseRows.length,
      giftCount: giftRows.length,
    }
  }, [revenueTransactions, profileByAuthUserId])

  const filteredPurchaseRows = useMemo(() => {
    const q = revenueSearch.trim().toLowerCase()
    if (!q) return revenueData.purchaseRows

    return revenueData.purchaseRows.filter((row) => {
      const buyerName = row.buyer?.username || row.buyer?.display_name || ''
      return (
        row.id.toLowerCase().includes(q) ||
        row.user_id.toLowerCase().includes(q) ||
        buyerName.toLowerCase().includes(q) ||
        `${row.packName}`.toLowerCase().includes(q) ||
        JSON.stringify(row.metadata || {}).toLowerCase().includes(q)
      )
    })
  }, [revenueData.purchaseRows, revenueSearch])

  const approveVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from('videos')
        .update({
          moderation_status: 'approved',
          visibility: 'public',
        })
        .eq('id', videoId)

      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-videos'] }),
  })

  const rejectVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from('videos')
        .update({ moderation_status: 'rejected' })
        .eq('id', videoId)

      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-videos'] }),
  })

  const approveProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('creator_merch_items')
        .update({ status: 'published' })
        .eq('id', productId)

      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-products'] }),
  })

  const rejectProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('creator_merch_items')
        .update({ status: 'rejected' })
        .eq('id', productId)

      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-products'] }),
  })

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || ''
      const session = (await supabase.auth.getSession()).data.session

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-delete-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ videoId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete video')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-videos'] })
      setShowModerationModal(false)
      setSelectedVideo(null)
    },
  })

  const approveCreatorAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase.rpc('approve_creator_application', {
        p_application_id: appId,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-creator-apps'] }),
  })

  const rejectCreatorAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await supabase
        .from('creator_applications')
        .update({ status: 'rejected' })
        .eq('id', appId)

      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-pending-creator-apps'] }),
  })

  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin-users', 'admin-creators', 'admin-moderators'],
      }),
  })

  const handleVideoDoubleClick = (video: any) => {
    setSelectedVideo(video)
    setShowModerationModal(true)
  }

  const handlePromoteUserToModerator = async () => {
    const userId = window.prompt('Enter the profile id of the user to promote to moderator:')
    if (!userId) return

    try {
      await updateProfileMutation.mutateAsync({
        userId,
        updates: { role: 'moderator' },
      })
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
            Control platform health, creators, payouts, reports, support, commerce, platform revenue,
            and live operations from one MaiCorp HQ.
          </p>
        </section>

        <section>
          <SchemaMonitor />
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <AdminModule title="Platform Revenue" text="PayPal purchases, gifts, creator and artist coin flow." to="#platform-revenue" />
          <AdminModule title="Reports Center" text="Review user, video, live, and commerce reports." to="/admin/reports" />
          <AdminModule title="Support Desk" text="Manage creator and buyer support tickets." to="/admin/support" />
          <AdminModule title="Moderators" text="Manage moderator roles and permissions." to="#moderators" />
          <AdminModule title="Creator Operations" text="Review creators, unlocks, fanbase, and Live access." to="/creator-hub" />
        </section>

        <section id="platform-revenue">
          <Card className="border-yellow-400/20 bg-black/50 p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-yellow-400">
                  Finance Command
                </p>
                <h2 className="mt-2 text-2xl font-black">Platform Revenue</h2>
                <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                  Tracks PayPal coin-pack purchases from <span className="text-yellow-300">mai_coin_transactions</span>,
                  plus gifted coin movement by user, creator, and artist.
                </p>
              </div>

              <Button
                variant="outline"
                className="border-yellow-400/30 text-yellow-300"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-platform-revenue-transactions'] })}
              >
                Refresh Revenue
              </Button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <RevenueMetric icon={<DollarSign size={18} />} label="Gross PayPal Revenue" value={money(revenueData.totalGrossRevenueUsd)} tone="gold" />
              <RevenueMetric icon={<Coins size={18} />} label="Purchased Coins" value={number(revenueData.totalPurchasedCoins)} tone="green" />
              <RevenueMetric icon={<Gift size={18} />} label="Gifted Coins" value={number(revenueData.totalGiftedCoins)} tone="purple" />
              <RevenueMetric icon={<Users size={18} />} label="PayPal Purchases" value={number(revenueData.purchaseCount)} tone="blue" />
              <RevenueMetric icon={<Crown size={18} />} label="Gift Events" value={number(revenueData.giftCount)} tone="red" />
            </div>

            <div className="mt-6">
              <Input
                value={revenueSearch}
                onChange={(e) => setRevenueSearch(e.target.value)}
                placeholder="Search purchases by buyer, order ID, pack, metadata, or user ID..."
                className="border-yellow-400/20 bg-black/60"
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-lg font-black text-yellow-300">PayPal Coin Pack Purchases</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Shows detected PayPal purchase transactions and estimated USD from metadata or configured packs.
                </p>

                <div className="mt-4 max-h-96 overflow-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="pb-2 text-left">Buyer</th>
                        <th className="pb-2 text-left">Pack</th>
                        <th className="pb-2 text-left">Coins</th>
                        <th className="pb-2 text-left">USD</th>
                        <th className="pb-2 text-left">PayPal Order</th>
                        <th className="pb-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchaseRows.map((tx) => (
                        <tr key={tx.id} className="border-b border-white/5">
                          <td className="py-2">
                            <p className="font-bold text-white">
                              {tx.buyer?.username || tx.buyer?.display_name || 'Unknown Buyer'}
                            </p>
                            <p className="text-xs text-zinc-500">{tx.user_id}</p>
                          </td>
                          <td className="py-2 text-yellow-300">{tx.packName}</td>
                          <td className="py-2">{number(Number(tx.amount || 0))}</td>
                          <td className="py-2 font-black text-green-300">{money(tx.usd)}</td>
                          <td className="py-2 text-xs text-zinc-400">
                            {tx.metadata?.orderId ||
                              tx.metadata?.paypal_order_id ||
                              tx.metadata?.paypalOrderId ||
                              '—'}
                          </td>
                          <td className="py-2 text-xs text-zinc-400">
                            {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}

                      {!revenueLoading && filteredPurchaseRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-zinc-500">
                            No PayPal coin-pack purchases found yet.
                          </td>
                        </tr>
                      )}

                      {revenueLoading && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-zinc-500">
                            Loading revenue...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-lg font-black text-purple-300">Gifted Coins by User / Creator / Artist</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Aggregates detected gift transactions by recipient.
                </p>

                <div className="mt-4 max-h-96 overflow-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="pb-2 text-left">Recipient</th>
                        <th className="pb-2 text-left">Type</th>
                        <th className="pb-2 text-left">Gifted Coins</th>
                        <th className="pb-2 text-left">Gift Count</th>
                        <th className="pb-2 text-left">Recipient ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueData.giftTotalsByRecipient.map((row) => (
                        <tr key={row.recipientId} className="border-b border-white/5">
                          <td className="py-2">
                            <p className="font-bold text-white">
                              {row.recipient?.username || row.recipient?.display_name || 'Unknown Recipient'}
                            </p>
                          </td>
                          <td className="py-2">
                            <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2 py-1 text-xs font-black text-purple-200">
                              {row.creatorType}
                            </span>
                          </td>
                          <td className="py-2 font-black text-purple-300">{number(row.giftedCoins)}</td>
                          <td className="py-2">{number(row.giftCount)}</td>
                          <td className="py-2 text-xs text-zinc-500">{row.recipientId}</td>
                        </tr>
                      ))}

                      {!revenueLoading && revenueData.giftTotalsByRecipient.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-500">
                            No gifted coin transactions found yet.
                          </td>
                        </tr>
                      )}

                      {revenueLoading && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-500">
                            Loading gifted coin data...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* keep the rest of your existing admin sections below this */}
        <Card className="border-yellow-400/20 bg-black/50 p-6">
          <h2 className="text-xl font-black">MAI Coin Pricing Controls</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {MAI_COIN_PACKS.map((pack: any, index: number) => (
              <div key={`${pack.name}-${pack.coins}-${pack.priceUsd}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
            {MAI_CASHOUT_TIERS.map((tier: any, index: number) => (
              <div key={`${tier.name}-${tier.coinsRequired}-${tier.payoutUsd}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-black text-yellow-300">{tier.name}</p>
                <p>
                  {tier.coinsRequired.toLocaleString()} coins → ${tier.payoutUsd}
                </p>
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
      </main>

      {showModerationModal && selectedVideo && (
        <AdminModerationModal
          video={selectedVideo}
          onClose={() => {
            setShowModerationModal(false)
            setSelectedVideo(null)
          }}
          onApprove={() => approveVideoMutation.mutate(selectedVideo.id)}
          onReject={() => rejectVideoMutation.mutate(selectedVideo.id)}
          onDelete={() => deleteVideoMutation.mutate(selectedVideo.id)}
        />
      )}
    </div>
  )
}

function RevenueMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: 'gold' | 'green' | 'purple' | 'blue' | 'red'
}) {
  const tones = {
    gold: 'border-yellow-400/20 bg-yellow-500/10 text-yellow-300',
    green: 'border-green-400/20 bg-green-500/10 text-green-300',
    purple: 'border-purple-400/20 bg-purple-500/10 text-purple-300',
    blue: 'border-blue-400/20 bg-blue-500/10 text-blue-300',
    red: 'border-red-400/20 bg-red-500/10 text-red-300',
  }

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-black uppercase tracking-wide opacity-80">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-black">{value}</p>
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