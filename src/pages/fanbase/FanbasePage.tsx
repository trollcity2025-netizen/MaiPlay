import { AppHeader } from '../../components/layout/AppHeader'
import { useAuthAccount } from '../../auth/AuthAccountProvider'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function FanbasePage() {
  const { account } = useAuthAccount()

  if (!account?.id) {
    return (
      <>
        <AppHeader />
        <div className="flex min-h-screen items-center justify-center bg-[#070202] text-white">
          <p>Please log in to view your fan base.</p>
        </div>
      </>
    )
  }

  const fanbase = useQuery({
    queryKey: ['creator-fanbase', account?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_fanbases')
        .select('id, creator_id, name, description, created_at, updated_at')
        .eq('creator_id', account!.id)
        .maybeSingle()

      if (error) {
        console.error('Fanbase query error:', error)
        return null
      }
      return data
    },
    enabled: Boolean(account?.id),
  })

  const { data: fanCount } = useQuery({
    queryKey: ['fan-count', account?.id],
    enabled: Boolean(account?.id),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('fan_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', account!.id)

      if (error) {
        console.warn('Fan count unavailable:', error)
        return 0
      }
      return count ?? 0
    },
  })

  const { data: topGifter } = useQuery({
    queryKey: ['top-gifter', account?.id],
    enabled: Boolean(account?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_creator_supporters', { p_creator_id: account!.id })
      if (error) {
        console.warn('Top gifter query error:', error)
        return null
      }
      return data?.[0] || null
    },
  })

  const { data: topCommenter } = useQuery({
    queryKey: ['top-commenter', account?.id],
    enabled: Boolean(account?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_creator_top_commenter', { p_creator_id: account!.id })
      if (error) {
        console.warn('Top commenter query error:', error)
        return null
      }
      return data?.[0] || null
    },
  })

  const { data: topLiker } = useQuery({
    queryKey: ['top-liker', account?.id],
    enabled: Boolean(account?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_creator_top_liker', { p_creator_id: account!.id })
      if (error) {
        console.warn('Top liker query error:', error)
        return null
      }
      return data?.[0] || null
    },
  })

  const liveProgress = Math.min(((fanCount ?? 0) / 100) * 100, 100)
  const liveUnlocked = (fanCount ?? 0) >= 100
  const fansNeeded = Math.max(100 - (fanCount ?? 0), 0)

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-[#070202] px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-red-950/80 via-black to-yellow-950/30 p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-yellow-400">
              MaiPlay Fan Base
            </p>
            <h1 className="mt-3 text-4xl font-black">Audience Command Center</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              Track your supporters, grow your creator community, and unlock Live when you reach 100 fans.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total Fans" value={fanCount ?? 0} />
            <StatCard label="New Today" value={fanbase.data?.new_today ?? 0} />
            <StatCard label="This Week" value={fanbase.data?.new_this_week ?? 0} />
            <StatCard label="Subscribers" value={fanbase.data?.subscriber_count ?? 0} />
          </section>

          <section className="rounded-3xl border border-yellow-400/20 bg-black/50 p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-black">
                  {liveUnlocked ? 'Live Unlocked' : 'Live Unlock Progress'}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {liveUnlocked
                    ? 'You reached 100 fans. Live broadcasting is available from Creator Hub.'
                    : `You need ${fansNeeded} more fans to unlock Live.`}
                </p>
              </div>

              {liveUnlocked ? (
                <a
                  href="/creator-hub/live/setup"
                  className="rounded-xl bg-yellow-400 px-5 py-3 text-center font-black text-black hover:bg-yellow-300"
                >
                  Go Live
                </a>
              ) : (
                <a
                  href="/upload"
                  className="rounded-xl bg-yellow-400 px-5 py-3 text-center font-black text-black hover:bg-yellow-300"
                >
                  Upload More Content
                </a>
              )}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-zinc-400">Fans</span>
                <span className="font-bold text-yellow-300">{(fanCount ?? 0)} / 100</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-yellow-400"
                  style={{ width: `${liveProgress}%` }}
                />
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-2xl font-black">Fan List</h2>
                  <p className="mt-1 text-sm text-zinc-400">Newest fans and supporters.</p>
                </div>
                <input
                  className="rounded-xl border border-yellow-400/20 bg-black/50 px-4 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-yellow-400"
                  placeholder="Search fans..."
                />
              </div>

              <div className="mt-5 space-y-3">
                {fanbase.isLoading || fanCount === undefined ? (
                  <EmptyCard title="Loading..." text="Checking your fan base." />
                ) : fanbase.isError ? (
                  <EmptyCard title="Error" text="Could not load fan data." />
                ) : (fanCount ?? 0) === 0 ? (
                  <EmptyCard
                    title="No fans yet"
                    text="Post shorts and promote your channel to start building your fan base."
                  />
                ) : (
                  <EmptyCard title="Fan List" text="Individual fan tracking coming soon." />
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-black">Top Supporters</h2>
                <p className="mt-1 text-sm text-zinc-400">Your strongest fans will appear here.</p>

                <div className="mt-5 space-y-3">
                  <SupporterRank
                    rank={1}
                    label="Top gifter"
                    supporterName={topGifter ? (topGifter.profiles?.display_name || topGifter.profiles?.username || 'Anonymous') : ''}
                    value={topGifter ? `${topGifter.total_gifted_coins.toLocaleString()} coins` : 'Coming soon'}
                  />
                  <SupporterRank
                    rank={2}
                    label="Top commenter"
                    supporterName={topCommenter ? (topCommenter.display_name || topCommenter.username || 'Anonymous') : ''}
                    value={topCommenter ? `${topCommenter.comment_count} comments` : 'Coming soon'}
                  />
                  <SupporterRank
                    rank={3}
                    label="Most active fan"
                    supporterName={topLiker ? (topLiker.display_name || topLiker.username || 'Anonymous') : ''}
                    value={topLiker ? `${topLiker.like_count} likes` : 'Coming soon'}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-black">Milestones</h2>

                <div className="mt-5 space-y-3">
<Milestone title="25 Fans" text="Rising Creator" active={(fanCount ?? 0) >= 25} />
                   <Milestone title="50 Fans" text="Growing Channel" active={(fanCount ?? 0) >= 50} />
                   <Milestone title="100 Fans" text="Live Unlocked" active={(fanCount ?? 0) >= 100} />
                   <Milestone title="250 Fans" text="Featured Creator Candidate" active={(fanCount ?? 0) >= 250} />
                   <Milestone title="1,000 Fans" text="MAI Partner Candidate" active={(fanCount ?? 0) >= 1000} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/50 p-5">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-yellow-400">{value}</p>
    </div>
  )
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-8 text-center">
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm text-zinc-400">{text}</p>
    </div>
  )
}

function SupporterRank({ rank, label, supporterName, value }: { rank: number; label: string; supporterName: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 font-black text-black">
          {rank}
        </div>
        <div>
          <p className="font-bold">{label}</p>
          {supporterName && <p className="text-sm text-zinc-400">{supporterName}</p>}
        </div>
      </div>
      <p className="text-sm text-zinc-400">{value}</p>
    </div>
  )
}
function Milestone({ title, text, active }: { title: string; text: string; active: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        active
          ? 'border-yellow-400/30 bg-yellow-400/10'
          : 'border-white/10 bg-black/40'
      }`}
    >
      <p className={active ? 'font-black text-yellow-300' : 'font-black text-white'}>{title}</p>
      <p className="mt-1 text-sm text-zinc-400">{text}</p>
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString()
}