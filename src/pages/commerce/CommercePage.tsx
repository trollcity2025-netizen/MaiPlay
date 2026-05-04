import { useMemo, useState } from 'react'
import { AppHeader } from '../../components/layout/AppHeader'
import { useAuthAccount } from '../../auth/AuthAccountProvider'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

type TabKey = 'storefront' | 'products' | 'perks' | 'live-orders' | 'my-orders' | 'settings'

const DISCLAIMER =
  'MaiPlay does not collect or manage payments for creator merch. All merch payments are handled directly by the creator or their chosen payment provider. If a payment, refund, or dispute issue occurs, buyers must contact the creator, their payment provider, or their financial institution.'

const ORDER_STATUSES = [
  'pending_creator_review',
  'accepted',
  'preparing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'disputed',
  'refunded_externally',
] as const

export function CommercePage() {
  const { account } = useAuthAccount()
  const [activeTab, setActiveTab] = useState<TabKey>('storefront')

  const merch = useQuery({
    queryKey: ['creator-merch', account?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_merch_items')
        .select('*')
        .eq('creator_id', account!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(account?.id),
  })

  const sellingOrders = useQuery({
    queryKey: ['creator-merch-selling-orders', account?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_merch_orders')
        .select('*')
        .eq('creator_id', account!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(account?.id),
  })

  const myOrders = useQuery({
    queryKey: ['creator-merch-my-orders', account?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_merch_orders')
        .select('*')
        .eq('buyer_id', account!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(account?.id),
  })

  const stats = useMemo(() => {
    const orders = sellingOrders.data ?? []
    return {
      activeProducts: (merch.data ?? []).filter((item: any) => item.status === 'active' || !item.status).length,
      pending: orders.filter((order: any) => order.status === 'pending_creator_review').length,
      trackingNeeded: orders.filter((order: any) => ['accepted', 'preparing'].includes(order.status)).length,
      shipped: orders.filter((order: any) => order.status === 'shipped').length,
      completed: orders.filter((order: any) => order.status === 'completed').length,
    }
  }, [merch.data, sellingOrders.data])

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-[#080204] px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-red-950/70 via-black to-yellow-950/30 p-6 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-yellow-400">MaiPlay Commerce</p>
            <h1 className="mt-3 text-3xl font-black sm:text-5xl">Creator Merch Center</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-300">{DISCLAIMER}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Active Products" value={stats.activeProducts} />
              <StatCard label="Pending Orders" value={stats.pending} />
              <StatCard label="Need Tracking" value={stats.trackingNeeded} />
              <StatCard label="Shipped" value={stats.shipped} />
              <StatCard label="Completed" value={stats.completed} />
            </div>
          </section>

          <nav className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-2">
            {[
              ['storefront', 'Storefront'],
              ['products', 'Products'],
              ['perks', 'Perks'],
              ['live-orders', 'Live Orders'],
              ['my-orders', 'My Orders'],
              ['settings', 'Settings'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabKey)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition ${
                  activeTab === key
                    ? 'bg-yellow-400 text-black'
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <section className="mt-6">
            {activeTab === 'storefront' && <Storefront items={merch.data ?? []} loading={merch.isLoading} />}
            {activeTab === 'products' && <Products items={merch.data ?? []} loading={merch.isLoading} />}
            {activeTab === 'perks' && <Perks />}
            {activeTab === 'live-orders' && (
              <OrdersPanel
                title="Creator Live Orders"
                description="Manage orders from buyers. Tracking is required before marking an order shipped."
                orders={sellingOrders.data ?? []}
                loading={sellingOrders.isLoading}
                sellerView
              />
            )}
            {activeTab === 'my-orders' && (
              <OrdersPanel
                title="My Orders"
                description="Orders you purchased from other creators."
                orders={myOrders.data ?? []}
                loading={myOrders.isLoading}
              />
            )}
            {activeTab === 'settings' && <CommerceSettings />}
          </section>
        </div>
      </main>
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <p className="text-xs uppercase tracking-widest text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-yellow-400">{value}</p>
    </div>
  )
}

function Storefront({ items, loading }: { items: any[]; loading: boolean }) {
  if (loading) return <LoadingCard text="Loading storefront..." />

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {items.length === 0 ? (
        <EmptyCard title="No merch listed yet" text="Create products so fans can view your merch." />
      ) : (
        items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="aspect-video overflow-hidden rounded-2xl bg-black/60">
              {item.image_url || item.images?.[0] ? (
                <img src={item.image_url ?? item.images[0]} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">No image</div>
              )}
            </div>

            <div className="mt-4">
              <h2 className="text-lg font-black">{item.name ?? 'Untitled Product'}</h2>
              <p className="mt-1 text-sm text-zinc-400">{item.description ?? 'No description provided.'}</p>
              <p className="mt-3 text-xl font-black text-yellow-400">
                {item.currency ?? 'USD'} {item.price_amount ?? item.price ?? '0.00'}
              </p>
              <p className="mt-3 rounded-xl border border-red-400/20 bg-red-950/30 p-3 text-xs text-red-100">
                Payment is handled outside MaiPlay by the creator.
              </p>
            </div>
          </article>
        ))
      )}
    </div>
  )
}

function Perks() {
  const { user } = useAuthAccount()

  const userPerks = useQuery({
    queryKey: ['user-perks', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('user_perks')
        .select('*')
        .eq('user_id', user.id)
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(user?.id),
  })

  const hasOfflineDownloads = userPerks.data?.some((p: any) => p.perk_type === 'offline_downloads' && p.active)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black">Perks</h2>
        <p className="mt-2 text-zinc-400">Unlock premium features with MAI coins</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-yellow-400/20 bg-black/40 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/10">
              📥
            </div>
            <div>
              <h3 className="font-black">Offline Downloads</h3>
              <p className="text-sm text-zinc-400">Download videos for offline viewing</p>
            </div>
          </div>
          <p className="text-sm text-zinc-300 mb-4">
            Download any short or movie to watch offline. Each download costs $5, split 50/50 with the creator.
          </p>
          {hasOfflineDownloads ? (
            <div className="rounded-xl bg-green-500/20 border border-green-500/30 px-4 py-2 text-sm text-green-300">
              ✅ Unlocked
            </div>
          ) : (
            <button
              onClick={() => {
                // TODO: Purchase perk for 5000 coins
                alert('Purchase offline downloads perk for 5,000 MAI coins')
              }}
              className="w-full rounded-xl bg-yellow-500 px-4 py-2 text-sm font-black text-black hover:bg-yellow-400"
            >
              Unlock for 5,000 Coins
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Products({ items, loading }: { items: any[]; loading: boolean }) {
  if (loading) return <LoadingCard text="Loading products..." />

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black">Manage Products</h2>
          <p className="mt-1 text-sm text-zinc-400">Add, edit, hide, or sell out merch listings.</p>
        </div>
        <button className="rounded-xl bg-yellow-400 px-4 py-2 font-black text-black hover:bg-yellow-300">
          Add Product
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
        {items.length === 0 ? (
          <EmptyCard title="No products found" text="Start by adding your first merch item." />
        ) : (
          items.map((item) => (
            <div key={item.id} className="grid gap-3 border-b border-white/10 p-4 last:border-b-0 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <p className="font-bold">{item.name ?? 'Untitled Product'}</p>
                <p className="text-sm text-zinc-400">{item.status ?? 'active'}</p>
              </div>
              <p className="text-sm text-zinc-300">
                {item.currency ?? 'USD'} {item.price_amount ?? item.price ?? '0.00'}
              </p>
              <div className="flex gap-2 sm:justify-end">
                <button className="rounded-lg border border-white/10 px-3 py-1 text-sm">Edit</button>
                <button className="rounded-lg border border-red-400/30 px-3 py-1 text-sm text-red-200">Hide</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function OrdersPanel({
  title,
  description,
  orders,
  loading,
  sellerView = false,
}: {
  title: string
  description: string
  orders: any[]
  loading: boolean
  sellerView?: boolean
}) {
  if (loading) return <LoadingCard text="Loading orders..." />

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-1 text-sm text-zinc-400">{description}</p>

      <div className="mt-5 space-y-4">
        {orders.length === 0 ? (
          <EmptyCard title="No orders yet" text="Orders will appear here when created." />
        ) : (
          orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm text-zinc-400">Order</p>
                  <h3 className="font-black">{order.product_name ?? order.product_id ?? 'Merch Order'}</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Qty: {order.quantity ?? 1} · Created: {formatDate(order.created_at)}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InfoBlock label="Carrier" value={order.carrier ?? 'Not added'} />
                <InfoBlock label="Tracking" value={order.tracking_number ?? 'Not added'} />
                <InfoBlock label="Tracking URL" value={order.tracking_url ?? 'Not added'} />
              </div>

              {sellerView && (
                <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-950/20 p-4">
                  <p className="text-sm font-bold text-yellow-300">Shipping requirement</p>
                  <p className="mt-1 text-xs text-yellow-100">
                    Carrier and tracking number are required before this order can be marked shipped.
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <input className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm" placeholder="Carrier" />
                    <input className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm" placeholder="Tracking number" />
                    <input className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm" placeholder="Tracking URL optional" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {ORDER_STATUSES.map((status) => (
                      <button key={status} className="rounded-lg border border-white/10 px-3 py-1 text-xs text-zinc-200">
                        {status.replaceAll('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-4 rounded-xl border border-red-400/20 bg-red-950/30 p-3 text-xs text-red-100">
                For payment disputes, contact the creator, payment provider, or your financial institution.
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  )
}

function CommerceSettings() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-2xl font-black">Commerce Settings</h2>
      <p className="mt-1 text-sm text-zinc-400">Set your store details, support contact, policies, and payment provider note.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Store Name" placeholder="Your merch store name" />
        <Field label="Support Contact" placeholder="Email or support link" />
        <Field label="External Payment Provider" placeholder="PayPal, Cash App, Shopify, etc." />
        <Field label="Default Payment Link" placeholder="External checkout/payment URL" />
        <Field label="Processing Time" placeholder="Example: Ships within 5-7 business days" />
        <Field label="Store Status" placeholder="Open / Closed" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <TextArea label="Shipping Policy" placeholder="Explain shipping costs, timing, and tracking." />
        <TextArea label="Return / Refund Policy" placeholder="Explain your refund and return terms." />
      </div>

      <label className="mt-5 flex gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-950/20 p-4 text-sm text-yellow-100">
        <input type="checkbox" className="mt-1" />
        <span>
          I understand I am fully responsible for merch payments, fulfillment, shipping, refunds, disputes, and customer
          support. MaiPlay does not manage merch payments.
        </span>
      </label>

      <button className="mt-5 rounded-xl bg-yellow-400 px-5 py-3 font-black text-black hover:bg-yellow-300">
        Save Commerce Settings
      </button>
    </div>
  )
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-zinc-300">{label}</span>
      <input
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-3 text-sm outline-none focus:border-yellow-400"
        placeholder={placeholder}
      />
    </label>
  )
}

function TextArea({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-zinc-300">{label}</span>
      <textarea
        className="mt-2 min-h-32 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-3 text-sm outline-none focus:border-yellow-400"
        placeholder={placeholder}
      />
    </label>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 break-words text-sm text-zinc-200">{value}</p>
    </div>
  )
}

function OrderStatusBadge({ status }: { status?: string }) {
  return (
    <span className="rounded-full border border-yellow-400/30 bg-yellow-950/30 px-3 py-1 text-xs font-bold text-yellow-300">
      {(status ?? 'pending_creator_review').replaceAll('_', ' ')}
    </span>
  )
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-8 text-center">
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{text}</p>
    </div>
  )
}

function LoadingCard({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400">
      {text}
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString()
}