import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Check,
  Crown,
  Eye,
  Gift,
  Gem,
  Lock,
  Play,
  Settings,
  ShieldCheck,
  Star,
} from 'lucide-react'

import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useAuthAccount } from '../auth/AuthAccountProvider'

const tabs = ['Active', 'Expired', 'Creators'] as const
type Tab = (typeof tabs)[number]

type SubscriptionItem = {
  id: string
  status: string
  start_date: string
  end_date: string
  auto_renew: boolean
  creator: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null
  plan: {
    id: string
    name: string
    price_coins: number
    features: any
  } | null
}

export function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Active')
  const { account } = useAuthAccount()

  const subscriptionsQuery = useQuery<SubscriptionItem[]>({
    queryKey: ['user-subscriptions', account?.id],
    queryFn: async () => {
      if (!account?.id) return []

      const { data, error } = await supabase
        .from('mai_circle_subscriptions')
        .select(
          'id, status, start_date, end_date, auto_renew, creator:creator_id(id, username, display_name, avatar_url), plan:mai_circle_plans(*)'
        )
        .eq('subscriber_id', account.id)
        .order('start_date', { ascending: false })

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.id,
        status: item.status,
        start_date: item.start_date,
        end_date: item.end_date,
        auto_renew: item.auto_renew,
        creator: Array.isArray(item.creator) ? item.creator[0] ?? null : item.creator ?? null,
        plan: Array.isArray(item.plan) ? item.plan[0] ?? null : item.plan ?? null,
      })) as SubscriptionItem[]
    },
    enabled: Boolean(account?.id),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  const subscriptions = subscriptionsQuery.data || []
  const activeCount = subscriptions.filter((item) => item.status === 'active').length
  const expiredCount = subscriptions.filter((item) => item.status !== 'active').length

  const visibleSubscriptions = useMemo(() => {
    if (activeTab === 'Creators') return subscriptions
    return subscriptions.filter((item) => item.status === activeTab.toLowerCase())
  }, [activeTab, subscriptions])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050000] text-white">
      <BackgroundFX />
      <AppHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[2.5rem] border border-yellow-400/20 bg-black/50 p-6 shadow-2xl shadow-red-950/40 backdrop-blur-xl md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
                <Crown className="h-4 w-4" />
                Creator Access
              </div>

              <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-[-0.04em] md:text-7xl">
                Memberships{' '}
                <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                  Vault
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
                Manage your creator memberships, unlock VIP content, renew access,
                and keep your favorite creators earning inside MaiPlay.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[430px]">
              <StatCard icon={Check} label="Active" value={activeCount.toString()} />
              <StatCard icon={Lock} label="Expired" value={expiredCount.toString()} />
              <StatCard icon={Gift} label="Total" value={`${subscriptions.length}`} />
            </div>
          </div>
        </section>

        <section className="mt-6 flex gap-3 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'shrink-0 rounded-full border px-5 py-3 text-sm font-black transition-all',
                activeTab === tab
                  ? 'border-yellow-300 bg-gradient-to-r from-yellow-300 to-red-500 text-black shadow-xl shadow-yellow-500/20'
                  : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-200',
              )}
            >
              {tab}
            </button>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-5 md:grid-cols-2">
            {visibleSubscriptions.length > 0 ? (
              visibleSubscriptions.map((subscription) => (
                <SubscriptionCard key={subscription.id} subscription={subscription} />
              ))
            ) : (
              <EmptyState />
            )}
          </div>

          <aside className="space-y-5">
            <GlossyPanel title="Membership Power">
              <div className="space-y-3">
                <PerkRow icon={Play} title="Exclusive Drops" text="Unlock creator-only videos, movies, music, and bonus posts." />
                <PerkRow icon={Bell} title="Priority Alerts" text="Get notified first when subscribed creators post or go live." />
                <PerkRow icon={ShieldCheck} title="VIP Identity" text="Show loyalty with badges, access tiers, and supporter status." />
              </div>
            </GlossyPanel>

            <GlossyPanel title="Recommended Tiers">
              <div className="space-y-3">
                <TierRow name="Bronze Access" price="500 coins" />
                <TierRow name="Gold Access" price="1,500 coins" hot />
                <TierRow name="Legend Access" price="5,000 coins" />
              </div>
            </GlossyPanel>
          </aside>
        </section>
      </main>
    </div>
  )
}

function SubscriptionCard({
  subscription,
}: {
  subscription: SubscriptionItem
}) {
  const active = subscription.status === 'active'
  const creatorName = subscription.creator?.display_name || subscription.creator?.username || 'Creator'
  const planName = subscription.plan?.name || 'Membership'
  const priceLabel = subscription.plan ? `${subscription.plan.price_coins.toLocaleString()} coins` : 'Pricing unavailable'
  const nextRenew = subscription.end_date
    ? `Ends ${new Date(subscription.end_date).toLocaleDateString()}`
    : 'Renewal date pending'
  const features = subscription.plan?.features || []

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/10 bg-black/45 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-1 hover:border-yellow-400/30">
      <div className="relative min-h-[210px] overflow-hidden rounded-t-[2rem] bg-gradient-to-br from-yellow-400/10 via-black/30 to-red-900/20 p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(250,204,21,0.18),transparent_35%)]" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-black text-xl font-black text-yellow-300">
              {creatorName.slice(0, 2).toUpperCase()}
            </div>

            <div>
              <h2 className="text-2xl font-black">{creatorName}</h2>
              <p className="text-sm text-zinc-300">{subscription.creator?.username ? `@${subscription.creator.username}` : 'Creator membership'}</p>
            </div>
          </div>

          <span
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em]',
              active
                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                : 'border-red-400/30 bg-red-500/15 text-red-200',
            )}
          >
            {subscription.status}
          </span>
        </div>

        <div className="relative z-10 mt-10">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-200">
            {planName}
          </p>
          <h3 className="mt-2 text-3xl font-black">{priceLabel}</h3>
          <p className="mt-1 text-sm text-zinc-300">{nextRenew}</p>
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/55 p-5">
        <div className="mb-5 flex flex-wrap gap-2">
          {features.length > 0 ? (
            features.map((feature: string) => (
              <span
                key={feature}
                className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-200"
              >
                {feature}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
              No plan features available
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button className="rounded-2xl bg-yellow-400 font-black text-black hover:bg-yellow-300">
            <Eye className="mr-2 h-4 w-4" />
            View Creator
          </Button>

          <Button
            variant="outline"
            className="rounded-2xl border-white/15 bg-black/35 font-black text-white hover:bg-white/10"
          >
            <Settings className="mr-2 h-4 w-4" />
            Manage
          </Button>
        </div>
      </div>
    </article>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
      <Icon className="h-5 w-5 text-yellow-300" />
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  )
}

function GlossyPanel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-2xl shadow-yellow-950/10 backdrop-blur-2xl">
      <h3 className="mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[0.28em] text-yellow-300">
        <Gem className="h-4 w-4" />
        {title}
      </h3>
      {children}
    </section>
  )
}

function PerkRow({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <Icon className="h-5 w-5 text-yellow-300" />
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-1 text-sm text-zinc-400">{text}</p>
    </div>
  )
}

function TierRow({
  name,
  price,
  hot,
}: {
  name: string
  price: string
  hot?: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div>
        <p className="font-black">{name}</p>
        <p className="text-sm text-zinc-400">{price}/mo</p>
      </div>

      {hot ? (
        <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black">
          HOT
        </span>
      ) : (
        <Star className="h-5 w-5 text-yellow-300" />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="col-span-full rounded-[2rem] border border-yellow-400/20 bg-black/45 p-12 text-center shadow-2xl shadow-yellow-950/10 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400/10 text-4xl">
        👑
      </div>
      <h2 className="mt-6 text-3xl font-black">No memberships here yet</h2>
      <p className="mx-auto mt-3 max-w-md text-zinc-400">
        Subscribe to creators to unlock exclusive drops, VIP badges, private
        perks, and early access content.
      </p>
      <Button className="mt-6 rounded-2xl bg-yellow-400 font-black text-black hover:bg-yellow-300">
        Discover Creators
      </Button>
    </div>
  )
}

function BackgroundFX() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-48 left-1/2 h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-red-700/25 blur-[120px]" />
      <div className="absolute top-32 -left-32 h-[520px] w-[520px] rounded-full bg-yellow-500/15 blur-[110px]" />
      <div className="absolute bottom-0 right-0 h-[650px] w-[650px] rounded-full bg-red-950/50 blur-[130px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,230,120,0.12),transparent_32%),linear-gradient(135deg,rgba(120,0,0,0.42),transparent_45%),linear-gradient(180deg,rgba(0,0,0,0.15),#050000_80%)]" />
    </div>
  )
}