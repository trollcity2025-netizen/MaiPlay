import { useState } from 'react'
import { AppHeader } from '../components/layout/AppHeader'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { PayPalButtons } from '@paypal/react-paypal-js'
import { useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Coins,
  Crown,
  Download,
  Gift,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
  Zap,
} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import { MAI_COIN_PACKS, CoinPack } from '../config/maiEconomy'

const tabs = ['Coins', 'Perks'] as const
type StoreTab = (typeof tabs)[number]

const VIP_PERK = {
  id: 'mai_vip_offline_monthly',
  name: 'MaiPlay VIP + Offline',
  priceUsd: 5,
  coinPrice: 1000,
  durationDays: 30,
  creatorDmLimit: 5,
  creatorPayoutUsd: 4,
}

export function StorePage() {
  const [activeTab, setActiveTab] = useState<StoreTab>('Coins')
  const [message, setMessage] = useState<string | null>(null)
  const [processingPerk, setProcessingPerk] = useState(false)
  const queryClient = useQueryClient()

  const handleCoinPurchase = async (pack: CoinPack, orderId: string, details: any) => {
    setMessage('Processing your payment...')

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      setMessage('Sign in again to complete the purchase.')
      return
    }

    try {
      // 1. Record the transaction
      const { error: txError } = await supabase.from('mai_coin_transactions').insert({
        user_id: authData.user.id,
        amount: pack.coins,
        transaction_type: 'purchase',
        source: 'paypal',
        metadata: {
          orderId,
          coins: pack.coins,
          packName: pack.name,
          tier: pack.tier,
          paypalStatus: details.status,
        },
      })

      if (txError) throw txError

      // 2. Get or create wallet, then credit coins
      const { data: wallet, error: walletError } = await supabase
        .from('mai_wallets')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle()

      if (walletError && walletError.code !== 'PGRST116') throw walletError

      if (wallet) {
        // Update existing wallet
        const { error: updateError } = await supabase
          .from('mai_wallets')
          .update({
            mai_coins: wallet.mai_coins + pack.coins,
            lifetime_earned: wallet.lifetime_earned + pack.coins,
            updated_at: new Date().toISOString(),
          })
          .eq('id', wallet.id)

        if (updateError) throw updateError
      } else {
        // Create new wallet
        const { error: createError } = await supabase.from('mai_wallets').insert({
          user_id: authData.user.id,
          mai_coins: pack.coins,
          lifetime_earned: pack.coins,
          lifetime_spent: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (createError) throw createError
      }

      // 3. Invalidate cache and show success
      queryClient.invalidateQueries({ queryKey: ['mai-wallet'] })
      queryClient.invalidateQueries({ queryKey: ['mai-transactions'] })
      setMessage(
        `✅ Payment complete — ${pack.coins.toLocaleString()} MAI coins credited to your account!`,
      )
    } catch (error: any) {
      console.error(error)
      setMessage('Payment processing error. Please contact support.')
    }
  }

  const handlePerkPayPalPurchase = async (orderId: string, details: any) => {
    setMessage('Activating your VIP + Offline perk...')

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      setMessage('Sign in again to complete the perk purchase.')
      return
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + VIP_PERK.durationDays)

    const { error } = await supabase.from('user_perks').insert({
      user_id: authData.user.id,
      perk_key: VIP_PERK.id,
      perk_name: VIP_PERK.name,
      status: 'active',
      source: 'paypal',
      price_usd: VIP_PERK.priceUsd,
      coin_price: null,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      metadata: {
        orderId,
        paypalStatus: details.status,
        offline_downloads: true,
        vip_creator_dm: true,
        creator_dm_limit: VIP_PERK.creatorDmLimit,
        creator_payout_usd: VIP_PERK.creatorPayoutUsd,
        user_price_usd: VIP_PERK.priceUsd,
      },
    })

    if (error) {
      console.error(error)
      setMessage('Payment succeeded, but perk activation failed. Please contact support.')
      return
    }

    queryClient.invalidateQueries({ queryKey: ['user-perks'] })
    setMessage('VIP + Offline activated for 30 days.')
  }

  const handlePerkCoinPurchase = async () => {
    setProcessingPerk(true)
    setMessage('Activating perk with MAI coins...')

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      setMessage('Sign in again to complete the perk purchase.')
      setProcessingPerk(false)
      return
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + VIP_PERK.durationDays)

    /*
      Kilo should replace this with an RPC that atomically:
      1. checks paid coin balance
      2. deducts VIP_PERK.coinPrice
      3. creates user_perks row
      4. creates mai_coin_transactions row
    */

    const { error } = await supabase.from('user_perks').insert({
      user_id: authData.user.id,
      perk_key: VIP_PERK.id,
      perk_name: VIP_PERK.name,
      status: 'active',
      source: 'coins',
      price_usd: null,
      coin_price: VIP_PERK.coinPrice,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      metadata: {
        offline_downloads: true,
        vip_creator_dm: true,
        creator_dm_limit: VIP_PERK.creatorDmLimit,
        creator_payout_usd: VIP_PERK.creatorPayoutUsd,
        user_price_usd: VIP_PERK.priceUsd,
      },
    })

    if (error) {
      console.error(error)
      setMessage('Perk purchase failed. Make sure user_perks exists and coin deduction is wired.')
      setProcessingPerk(false)
      return
    }

    queryClient.invalidateQueries({ queryKey: ['user-perks'] })
    queryClient.invalidateQueries({ queryKey: ['mai-wallet'] })
    setMessage('VIP + Offline activated for 30 days using MAI coins.')
    setProcessingPerk(false)
  }

  const handlePayPalError = (error: unknown) => {
    console.error('PayPal error', error)
    setMessage('There was a problem processing your PayPal payment. Please try again.')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050000] text-white">
      <BackgroundFX />
      <AppHeader />

      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-4 py-10">
        <section className="overflow-hidden rounded-[2.5rem] border border-yellow-400/20 bg-black/55 p-6 shadow-2xl shadow-red-950/40 backdrop-blur-xl md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
                <Sparkles className="h-4 w-4" />
                Mai Store
              </div>

              <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-[-0.04em] md:text-7xl">
                Power Your{' '}
                <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                  MaiPlay
                </span>
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300">
                Buy MAI coins, unlock monthly perks, support creators, download
                content for offline watching, and access VIP creator messaging.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[430px]">
              <StatCard icon={Coins} label="Coins" value="Gifts" />
              <StatCard icon={Download} label="Offline" value="VIP" />
              <StatCard icon={MessageCircle} label="DMs" value="5 Creators" />
            </div>
          </div>
        </section>

        <section className="flex gap-3 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'shrink-0 rounded-full border px-6 py-3 text-sm font-black transition-all',
                activeTab === tab
                  ? 'border-yellow-300 bg-gradient-to-r from-yellow-300 to-red-500 text-black shadow-xl shadow-yellow-500/20'
                  : 'border-white/10 bg-white/[0.04] text-zinc-300 hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-200',
              )}
            >
              {tab}
            </button>
          ))}
        </section>

        {activeTab === 'Coins' ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <InfoCard
                icon={ShieldCheck}
                title="Secure Payments"
                text="Coin purchases are processed securely through PayPal."
              />
              <InfoCard
                icon={Zap}
                title="Instant Utility"
                text="Use coins for gifts, boosts, creator support, and perks."
              />
              <InfoCard
                icon={Gift}
                title="Creator Economy"
                text="Coins fuel the fan-powered MAI creator ecosystem."
              />
            </section>

            <section>
              <h2 className="mb-6 text-3xl font-black">Coin Packs</h2>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {MAI_COIN_PACKS.map((pack) => (
                  <Card
                    key={`${pack.tier}-${pack.coins}`}
                    className="flex flex-col justify-between rounded-[2rem] border-yellow-400/20 bg-black/55 p-6 text-white shadow-2xl shadow-yellow-950/10 backdrop-blur-xl transition hover:scale-[1.02] hover:border-yellow-400/40"
                  >
                    <div>
                      <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                        {pack.tier}
                      </p>

                      <h3 className="mb-1 text-lg font-black text-yellow-300">
                        {pack.name}
                      </h3>

                      <p className="text-4xl font-black">
                        {pack.coins.toLocaleString()}
                      </p>
                      <p className="mb-4 text-sm text-zinc-400">MAI coins</p>

                      <p className="mb-2 text-2xl font-black">
                        ${pack.priceUsd.toFixed(2)}
                      </p>

                      {pack.bonusLabel ? (
                        <p className="text-sm font-bold text-emerald-300">
                          {pack.bonusLabel}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-5 overflow-hidden rounded-xl">
                      <PayPalButtons
                        style={{
                          layout: 'vertical',
                          color: 'gold',
                          shape: 'rect',
                          label: 'paypal',
                        }}
                        createOrder={(data, actions) => {
                          return actions.order.create({
                            purchase_units: [
                              {
                                amount: {
                                  value: pack.priceUsd.toFixed(2),
                                  currency_code: 'USD',
                                },
                                description: `${pack.coins.toLocaleString()} MAI Coins - ${pack.name}`,
                              },
                            ],
                          })
                        }}
                        onApprove={(data, actions) => {
                          return actions.order.capture().then((details) => {
                            return handleCoinPurchase(pack, data.orderID, details)
                          })
                        }}
                        onError={handlePayPalError}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="overflow-hidden rounded-[2.5rem] border-yellow-400/25 bg-black/60 text-white shadow-2xl shadow-yellow-950/20 backdrop-blur-xl">
              <div className="relative bg-gradient-to-br from-red-950/80 via-black to-yellow-950/40 p-8">
                <div className="absolute right-8 top-8 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-yellow-200">
                  30 Days
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-red-600 text-black shadow-xl shadow-yellow-500/20">
                  <Crown className="h-8 w-8" />
                </div>

                <h2 className="mt-6 text-4xl font-black">
                  {VIP_PERK.name}
                </h2>
                <p className="mt-3 max-w-2xl text-zinc-300">
                  Unlock offline downloads and VIP creator messaging for one
                  month. Message up to 5 creators monthly. Creators can disable
                  chats at any time.
                </p>

                <div className="mt-6 flex flex-wrap items-end gap-4">
                  <div>
                    <p className="text-sm text-zinc-400">PayPal price</p>
                    <p className="text-5xl font-black text-yellow-300">
                      ${VIP_PERK.priceUsd}
                    </p>
                  </div>

                  <div className="mb-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                    <p className="text-xs text-zinc-400">Coin price</p>
                    <p className="font-black text-white">
                      {VIP_PERK.coinPrice.toLocaleString()} coins
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-6 md:grid-cols-2">
                <PerkFeature
                  icon={Download}
                  title="Offline Downloads"
                  text="Download eligible purchases and saved content to watch offline on device."
                />
                <PerkFeature
                  icon={MessageCircle}
                  title="VIP Creator DMs"
                  text="DM up to 5 creators per month with unlimited messages during active access."
                />
                <PerkFeature
                  icon={Wallet}
                  title="$4 Creator Value"
                  text="$4 worth of the $5 VIP value is credited toward creator support when users DM creators."
                />
                <PerkFeature
                  icon={Lock}
                  title="Creator Controls"
                  text="Creators can turn off chats or DMs at any time for safety and boundaries."
                />
              </div>

              <div className="grid gap-4 border-t border-white/10 p-6 lg:grid-cols-2">
                <Button
                  type="button"
                  onClick={handlePerkCoinPurchase}
                  disabled={processingPerk}
                  className="h-14 rounded-2xl bg-gradient-to-r from-yellow-300 to-red-500 font-black text-black hover:scale-[1.02]"
                >
                  <Coins className="mr-2 h-5 w-5" />
                  {processingPerk ? 'Processing...' : `Buy with ${VIP_PERK.coinPrice.toLocaleString()} Coins`}
                </Button>

                <div className="overflow-hidden rounded-2xl">
                  <PayPalButtons
                    style={{
                      layout: 'vertical',
                      color: 'gold',
                      shape: 'rect',
                      label: 'paypal',
                    }}
                    createOrder={(data, actions) => {
                      return actions.order.create({
                        purchase_units: [
                          {
                            amount: {
                              value: VIP_PERK.priceUsd.toFixed(2),
                              currency_code: 'USD',
                            },
                            description: `${VIP_PERK.name} - 30 Day Access`,
                          },
                        ],
                      })
                    }}
                    onApprove={(data, actions) => {
                      return actions.order.capture().then((details) => {
                        return handlePerkPayPalPurchase(data.orderID, details)
                      })
                    }}
                    onError={handlePayPalError}
                  />
                </div>
              </div>
            </Card>

            <aside className="space-y-5">
              <SidePanel title="VIP Rules">
                <RuleRow text="Perk lasts 1 month from purchase date." />
                <RuleRow text="User can DM up to 5 creators per month." />
                <RuleRow text="DMs are unlimited with those selected creators during active access." />
                <RuleRow text="Creators may disable chats or DMs at any time." />
                <RuleRow text="Offline downloads only apply to eligible content." />
              </SidePanel>

              <SidePanel title="Best For">
                <RuleRow text="Fans who travel or watch without internet." />
                <RuleRow text="Supporters who want creator access." />
                <RuleRow text="Users who want premium utility without buying large coin packs." />
              </SidePanel>
            </aside>
          </section>
        )}

        {message ? (
          <section className="rounded-2xl border border-yellow-400/20 bg-black/50 p-5 text-sm text-zinc-200 shadow-xl shadow-yellow-950/10">
            <p>{message}</p>
          </section>
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-zinc-400">
          <p className="mb-2 font-bold text-yellow-300">Important</p>
          <ul className="space-y-1">
            <li>• All purchases are final once completed through PayPal or coins.</li>
            <li>• Coins are non-transferable and tied to your account.</li>
            <li>• Offline downloads require an active perk and eligible content rights.</li>
            <li>• Creator DMs depend on creator availability and creator chat settings.</li>
          </ul>
        </section>
      </main>
    </div>
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

function InfoCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType
  title: string
  text: string
}) {
  return (
    <Card className="rounded-[2rem] border-white/10 bg-black/50 p-5 text-white shadow-xl shadow-yellow-950/10">
      <Icon className="h-6 w-6 text-yellow-300" />
      <p className="mt-3 font-black text-yellow-300">{title}</p>
      <p className="mt-2 text-sm text-zinc-400">{text}</p>
    </Card>
  )
}

function PerkFeature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <Icon className="h-6 w-6 text-yellow-300" />
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-2 text-sm text-zinc-400">{text}</p>
    </div>
  )
}

function SidePanel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="rounded-[2rem] border-white/10 bg-black/50 p-5 text-white shadow-xl shadow-yellow-950/10">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.25em] text-yellow-300">
        <Star className="h-4 w-4" />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </Card>
  )
}

function RuleRow({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
      <p className="text-sm text-zinc-300">{text}</p>
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