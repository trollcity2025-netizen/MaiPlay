import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Crown, Lock, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthAccount } from '../../auth/AuthAccountProvider'

interface Plan {
  id: string
  name: string
  price_coins: number
  features: string[]
  is_active: boolean
}

interface Props {
  creatorId: string
  recommendedTierName?: string
}

function formatPerkName(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function SubscriptionPanel({
  creatorId,
  recommendedTierName = 'VIP',
}: Props) {
  const queryClient = useQueryClient()
  const { account } = useAuthAccount()

  const tiersQuery = useQuery({
    queryKey: ['creator-subscription-tiers', creatorId],
    enabled: !!creatorId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('mai_circle_plans')
        .select('id, name, price_coins, features, is_active')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .order('price_coins', { ascending: true })

      if (error) {
        console.error('[SubscriptionPanel] Failed to load plans:', error)
        return []
      }

      return data ?? []
    },
  })

  const subscribeMutation = useMutation({
    mutationFn: async (tierId: string) => {
      if (!account?.id) throw new Error('Sign in required.')
      if (!creatorId) throw new Error('Creator not found.')

      const { data, error } = await supabase.functions.invoke(
        'subscribe_to_creator',
        {
          body: {
            creator_id: creatorId,
            tier_id: tierId,
          },
        },
      )

      if (error) {
        console.error('[SubscriptionPanel] Subscribe function failed:', error)
        throw new Error(error.message || 'Subscription failed.')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Subscription failed.')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', creatorId] })
      queryClient.invalidateQueries({ queryKey: ['mai-circle-plans', creatorId] })
      queryClient.invalidateQueries({ queryKey: ['mai-wallet'] })
    },
  })

  const plans = useMemo(() => tiersQuery.data ?? [], [tiersQuery.data])

  return (
    <section className="overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-red-950 via-black to-zinc-950 shadow-2xl shadow-red-950/20">
      <div className="border-b border-yellow-500/20 bg-black/30 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-400">
              Mai Coins Only
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Creator Membership
            </h2>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10">
            <Crown className="h-5 w-5 text-yellow-300" />
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Subscribe to unlock creator perks, badges, priority access, and
          exclusive community benefits.
        </p>
      </div>

      <div className="p-5">
        {tiersQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array(3)
              .fill(0)
              .map((_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-xl border border-white/10 bg-white/10"
                />
              ))}
          </div>
        ) : plans.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isRecommended =
                plan.name.toLowerCase() ===
                recommendedTierName.toLowerCase()

              const features = plan.features ?? []

              return (
                <article
                  key={tier.id}
                  className={`relative flex min-h-64 flex-col rounded-xl border p-4 transition duration-200 hover:-translate-y-1 ${
                    isRecommended
                      ? 'border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-500/10'
                      : 'border-white/10 bg-black/30 hover:border-yellow-400/30'
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-2 right-3 rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-black text-black">
                      Recommended
                    </span>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-black text-white">
                      {plan.name}
                    </h3>

                    <p className="mt-2 text-3xl font-black text-yellow-300">
                      {plan.price_coins.toLocaleString()}
                    </p>

                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                      MAI Coins / month
                    </p>
                  </div>

                  <ul className="mb-4 flex-1 space-y-2 text-sm text-yellow-100/90">
                    {features.length === 0 ? (
                      <li className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 shrink-0 text-yellow-300" />
                        Core Subscriber Badge
                      </li>
                    ) : (
                      features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 shrink-0 text-yellow-300" />
                          <span>{feature}</span>
                        </li>
                      ))
                    )}
                  </ul>

                  <button
                    type="button"
                    disabled={!account || subscribeMutation.isPending}
                    onClick={() => subscribeMutation.mutate(plan.id)}
                    className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-300 px-3 py-2 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {account ? (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {subscribeMutation.isPending ? 'Processing...' : 'Subscribe'}
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Sign In Required
                      </>
                    )}
                  </button>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-yellow-400/20 bg-black/30 p-6 text-center">
            <p className="font-black text-white">
              No active memberships yet.
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              This creator has not published membership tiers.
            </p>
          </div>
        )}

        {subscribeMutation.error && (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">
            {(subscribeMutation.error as Error).message}
          </div>
        )}
      </div>
    </section>
  )
}