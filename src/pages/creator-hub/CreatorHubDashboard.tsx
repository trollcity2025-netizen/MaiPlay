import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { AppHeader } from '../../components/layout/AppHeader'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Progress } from '../../components/ui/progress'
import { Link } from 'react-router-dom'
import { useAuthAccount } from '../../auth/AuthAccountProvider'
import { MAI_CASHOUT_TIERS } from '../../config/maiEconomy'
import { getCurrentCashoutTier, getNextCashoutTier, getProgressToNextTier, getCoinsRemainingToNextTier } from '../../utils/creatorProgression'
import { 
  useCreatorTracks, 
  useCreatorAlbums, 
  useCreatorShorts, 
  useCreatorMovies, 
  useCreatorLives,
  useDeleteTrack,
  useDeleteAlbum,
  useDeleteShort,
  useDeleteMovie,
  useDeleteLive
} from '../../hooks/useVideos'

type VideoItem = { id: string; title: string; view_count?: number; moderation_status?: string; copyright_status?: string; video_type: string }

function getVideoStatus(video: VideoItem) {
  if (video.moderation_status === 'approved') return 'Published'
  if (video.copyright_status === 'clean') return 'Ready to Publish'
  if (video.copyright_status === 'flagged') return 'Copyright Flagged'
  if (video.copyright_status === 'review') return 'Under Review'
  if (video.copyright_status === 'pending') return 'Scanning Copyright'
  return 'Pending'
}

export function CreatorHubDashboard() {
  const { account, user } = useAuthAccount()
  const [customCoins, setCustomCoins] = useState('')
  const [paypalEmail, setPaypalEmail] = useState('')
  const [activeTab, setActiveTab] = useState<'tracks' | 'albums' | 'shorts' | 'movies' | 'lives'>('tracks')

  const { data: tracks } = useCreatorTracks()
  const { data: albums } = useCreatorAlbums()
  const { data: shorts } = useCreatorShorts()
  const { data: movies } = useCreatorMovies()
  const { data: lives } = useCreatorLives()

  const totalTracks = tracks?.length || 0
  const totalAlbums = albums?.length || 0
  const totalShorts = shorts?.length || 0
  const totalMovies = movies?.length || 0
  const totalLives = lives?.length || 0
  const totalContent = totalTracks + totalAlbums + totalShorts + totalMovies + totalLives

  const videos = [
    ...(tracks || []).map(t => ({ ...t, video_type: 'track' as const })),
    ...(albums || []).map(a => ({ ...a, video_type: 'album' as const })),
    ...(shorts || []).map(s => ({ ...s, video_type: 'short' as const })),
    ...(movies || []).map(m => ({ ...m, video_type: 'movie' as const })),
  ]

  const { data: fanCount } = useQuery({
    queryKey: ['creator-fan-count', user?.id],
    queryFn: async () => {
      if (!user) return 0
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!profile) return 0
      const { count, error } = await supabase
        .from('fan_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', profile.id)
      if (error) return 0
      return count ?? 0
    },
    enabled: Boolean(user)
  })

  const { data: liveSessions } = useQuery({
    queryKey: ['creator-live-sessions', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!profile) return []
      const { data, error } = await supabase
        .from('creator_live_sessions')
        .select('id, title, status, scheduled_at, viewer_count')
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(user)
  })

  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data, error } = await supabase
        .from('mai_wallets')
        .select('mai_coins')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: Boolean(user)
  })

  return (
    <div className="min-h-screen bg-[#070202] text-white">
      <AppHeader />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-red-950/80 via-black to-yellow-950/30 p-6 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-yellow-400">
            Creator Hub
          </p>
          <h1 className="mt-3 text-4xl font-black">Your Creator Dashboard</h1>
          <p className="mt-3 max-w-3xl text-sm text-zinc-300">
            Manage your content, track performance, and grow your fanbase.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Content" value={totalContent.toString()} />
          <StatCard label="Total Fans" value={fanCount?.toString() || '0'} />
          <StatCard label="Live Status" value="Ready" />
          <StatCard label="MAI Coins" value={wallet?.mai_coins?.toString() || '0'} />
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <DashboardCard
            title="Upload Video"
            text="Share new content with your fans"
            to="/creator-hub/uploads"
            icon="📤"
          />
          <DashboardCard
            title="Go Live"
            text={(fanCount && fanCount >= 100) || account?.role === 'admin' ? "Start your live broadcast" : "Unlock live at 100 fans"}
            to="/creator-hub/live/setup"
            icon="🔴"
            disabled={!((fanCount && fanCount >= 100) || account?.role === 'admin')}
          />
          <DashboardCard
            title="Fanbase"
            text="Manage your subscribers"
            to="/fan-base"
            icon="👥"
          />
          <DashboardCard
            title="Monetization"
            text="Manage MAI Circle & earnings"
            to="/creator-hub/monetization"
            icon="💰"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-yellow-400/20 bg-black/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">Your Videos</h2>
              <Link to="/creator-hub/uploads">
                <Button variant="outline" className="border-yellow-400/30 text-yellow-300">
                  Upload New
                </Button>
              </Link>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {videos && videos.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr>
                      <th className="pb-2 text-left">Title</th>
                      <th className="pb-2 text-left">Type</th>
                      <th className="pb-2 text-left">Status</th>
                      <th className="pb-2 text-left">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                      {videos.map((v) => (
                        <tr key={v.id} className="border-b border-white/5">
                          <td className="py-2">{v.title}</td>
                          <td className="py-2">{v.video_type}</td>
                          <td className="py-2">{getVideoStatus(v)}</td>
                          <td className="py-2">{v.view_count || 0}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-zinc-400">No videos yet. Upload your first video!</p>
              )}
            </div>
          </Card>

          <Card className="border-yellow-400/20 bg-black/50 p-6">
            <h2 className="text-xl font-black">Recent Live Sessions</h2>
            <div className="mt-4 max-h-80 overflow-y-auto">
              {liveSessions && liveSessions.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr>
                      <th className="pb-2 text-left">Title</th>
                      <th className="pb-2 text-left">Status</th>
                      <th className="pb-2 text-left">Viewers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveSessions.map((s) => (
                      <tr key={s.id} className="border-b border-white/5">
                        <td className="py-2">{s.title}</td>
                        <td className="py-2">{s.status}</td>
                        <td className="py-2">{s.viewer_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-zinc-400">No live sessions yet.</p>
              )}
            </div>
          </Card>
        </section>

        <Card className="border-yellow-400/20 bg-black/50 p-6">
          <h2 className="text-xl font-black">Cashout Tier Ladder</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Your next payout is closer than you think.
          </p>
          <div className="mt-4 space-y-3">
            {(() => {
              const coins = wallet?.mai_coins || 0
              const currentTier = getCurrentCashoutTier(coins)
              const nextTier = getNextCashoutTier(coins)
              return MAI_CASHOUT_TIERS.map((tier) => {
                const isCompleted = coins >= tier.coinsRequired
                const isCurrent = nextTier && tier.coinsRequired === nextTier.coinsRequired
                const isLocked = !isCompleted && !isCurrent
                return (
                  <div
                    key={tier.name}
                    className={`rounded-2xl border p-4 transition ${
                      isCurrent
                        ? 'border-yellow-400/50 bg-yellow-400/10 shadow-lg shadow-yellow-400/20'
                        : isCompleted
                          ? 'border-green-400/30 bg-green-400/5'
                          : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {isCompleted ? '✅' : isCurrent ? '🔥' : '🔒'}
                      </span>
                      <div className="flex-1">
                        <p className={`font-black ${isCurrent ? 'text-yellow-300' : isCompleted ? 'text-green-300' : 'text-zinc-300'}`}>
                          {tier.name}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {tier.coinsRequired.toLocaleString()} coins → ${tier.payoutUsd}
                        </p>
                        <p className="text-xs text-zinc-500">{tier.feeLabel}</p>
                      </div>
                    </div>
                    {isCurrent && (
                      <div className="mt-3">
                        <Progress value={getProgressToNextTier(coins)} className="h-2" />
                        <p className="mt-1 text-xs text-zinc-400 text-center">
                          {getCoinsRemainingToNextTier(coins).toLocaleString()} coins to unlock
                        </p>
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>
        </Card>

        <Card className="border-yellow-400/20 bg-black/50 p-6">
          <h2 className="text-xl font-black">Custom Cashout</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Request a custom payout amount (min 1,000 coins). Approved by admins.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300">Coins to Cash Out</label>
              <Input
                type="number"
                value={customCoins}
                onChange={(e) => setCustomCoins(e.target.value)}
                placeholder="Enter coin amount"
                className="mt-1"
              />
              {(() => {
                const coins = parseInt(customCoins) || 0
                const usd = coins * 0.005
                let fee = 0
                if (usd <= 25) {
                  fee = 1 // Tier 1
                } else if (usd <= 75) {
                  fee = 4 // Average of Tier 2 $3-5
                } else if (usd <= 150) {
                  fee = usd * 0.08 // Tier 3: 8%
                } else {
                  fee = usd * 0.10 // Tiers 4-6: 10%
                }
                const net = usd - fee
                return (
                  <p className="mt-1 text-xs text-zinc-400">
                    ≈ ${net.toFixed(2)} USD (after ${fee.toFixed(2)} fee)
                  </p>
                )
              })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300">PayPal Email</label>
              <Input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="your@email.com"
                className="mt-1"
              />
            </div>
            <Button
              onClick={async () => {
                if (!customCoins || !paypalEmail) return
                const { error } = await supabase.rpc('request_custom_payout', {
                  p_requested_coins: parseInt(customCoins),
                  p_paypal_email: paypalEmail
                })
                if (error) alert('Error: ' + error.message)
                else {
                  alert('Custom payout requested! Admins will review.')
                  setCustomCoins('')
                  setPaypalEmail('')
                }
              }}
              className="w-full bg-yellow-500 text-black hover:bg-yellow-400"
            >
              Request Custom Payout
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-white/10 bg-black/50 p-5">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-yellow-400">{value}</p>
    </Card>
  )
}

function DashboardCard({ title, text, to, icon, disabled }: { title: string; text: string; to: string; icon: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <Card className="border-yellow-400/20 bg-white/5 p-6 opacity-50">
        <div className="text-3xl mb-2">{icon}</div>
        <h2 className="text-xl font-black text-yellow-300">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{text}</p>
      </Card>
    )
  }
  return (
    <Link to={to}>
      <Card className="h-full border-yellow-400/20 bg-white/5 p-6 transition hover:bg-yellow-400/10">
        <div className="text-3xl mb-2">{icon}</div>
        <h2 className="text-xl font-black text-yellow-300">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{text}</p>
      </Card>
    </Link>
  )
}