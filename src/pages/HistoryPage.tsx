import { useMemo, useState } from 'react'
import {
  Clock,
  Flame,
  History,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Video,
  Zap,
} from 'lucide-react'

import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { cn } from '../lib/utils'

const tabs = ['All', 'Shorts', 'Movies'] as const
type Tab = (typeof tabs)[number]

const historyItems: any[] = []

export function HistoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')

  const filteredItems = useMemo(() => {
    return historyItems.filter((item) => {
      const matchesTab = activeTab === 'All' || item.type === activeTab
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.creator.toLowerCase().includes(search.toLowerCase()) ||
        item.type.toLowerCase().includes(search.toLowerCase())

      return matchesTab && matchesSearch
    })
  }, [activeTab, search])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050000] text-white">
      <BackgroundFX />
      <AppHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[2.5rem] border border-yellow-400/20 bg-black/50 p-6 shadow-2xl shadow-red-950/40 backdrop-blur-xl md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
                <History className="h-4 w-4" />
                Playback Timeline
              </div>

              <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-[-0.04em] md:text-7xl">
                Watch{' '}
                <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                  History
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
                Resume what you started, revisit creator drops, and keep your
                MaiPlay viewing timeline organized across shorts and movies.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[430px]">
              <StatCard icon={History} label="Watched" value={`${historyItems.length}`} />
              <StatCard icon={Clock} label="Hours" value="0" />
              <StatCard icon={Zap} label="Completed" value="0" />
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-yellow-300/70" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your watch history..."
                className="h-14 rounded-2xl border-yellow-400/20 bg-black/60 pl-12 text-white placeholder:text-zinc-500 focus-visible:ring-yellow-400/40"
              />
            </div>

            <Button className="h-14 rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-red-500 font-black text-black shadow-2xl shadow-yellow-500/20 hover:scale-[1.02]">
              <RotateCcw className="mr-2 h-5 w-5" />
              Resume Last
            </Button>
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
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => <HistoryCard key={item.id} item={item} />)
            ) : (
              <EmptyState />
            )}
          </div>

          <aside className="space-y-5">
            <GlossyPanel title="Viewing Insights">
              <InsightRow icon={Flame} title="Hot Rewatches" text="Content you replay or nearly finish can surface here." />
              <InsightRow icon={Clock} title="Resume Queue" text="Pick up unfinished movies and creator drops instantly." />
              <InsightRow icon={Video} title="Timeline Control" text="Clear individual items or organize by content type." />
            </GlossyPanel>

            <GlossyPanel title="History Breakdown">
              <CategoryRow label="Shorts watched" value="2" />
              <CategoryRow label="Movies watched" value="1" />
              <CategoryRow label="Completed" value="1" />
            </GlossyPanel>
          </aside>
        </section>
      </main>
    </div>
  )
}

function HistoryCard({ item }: { item: (typeof historyItems)[number] }) {
  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/10 bg-black/45 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-1 hover:border-yellow-400/30">
      <div className={cn('relative aspect-video bg-gradient-to-br p-5', item.glow)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(250,204,21,0.18),transparent_35%)]" />

        <div className="absolute left-4 top-4 z-10 rounded-full border border-yellow-400/30 bg-black/60 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-yellow-200">
          {item.type}
        </div>

        <div className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-black text-zinc-200">
          {item.duration}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-yellow-300/40 bg-black/55 text-yellow-200 shadow-2xl shadow-yellow-500/30 backdrop-blur-md transition group-hover:scale-110">
            <Play className="ml-1 h-9 w-9" fill="currentColor" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-yellow-400"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/55 p-5">
        <h2 className="line-clamp-2 text-2xl font-black group-hover:text-yellow-300">
          {item.title}
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          {item.creator} • {item.watched}
        </p>

        <p className="mt-2 text-xs font-bold text-yellow-300">
          {item.progress}% watched
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button className="rounded-2xl bg-yellow-400 font-black text-black hover:bg-yellow-300">
            <Play className="mr-2 h-4 w-4" fill="black" />
            Resume
          </Button>

          <Button
            variant="outline"
            className="rounded-2xl border-white/15 bg-black/35 font-black text-white hover:bg-red-600/20 hover:text-red-200"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
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
        <Sparkles className="h-4 w-4" />
        {title}
      </h3>
      {children}
    </section>
  )
}

function InsightRow({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType
  title: string
  text: string
}) {
  return (
    <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 last:mb-0">
      <Icon className="h-5 w-5 text-yellow-300" />
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-1 text-sm text-zinc-400">{text}</p>
    </div>
  )
}

function CategoryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 last:mb-0">
      <span className="font-black">{label}</span>
      <span className="text-sm text-yellow-300">{value}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="col-span-full rounded-[2rem] border border-yellow-400/20 bg-black/45 p-12 text-center shadow-2xl shadow-yellow-950/10 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400/10 text-4xl">
        🕘
      </div>
      <h2 className="mt-6 text-3xl font-black">No watch history yet</h2>
      <p className="mx-auto mt-3 max-w-md text-zinc-400">
        Your watched shorts, movies, and creator drops will appear here
        automatically once you start watching.
      </p>
      <Button className="mt-6 rounded-2xl bg-yellow-400 font-black text-black hover:bg-yellow-300">
        Discover Content
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