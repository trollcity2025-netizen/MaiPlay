import { Button } from '../components/ui/button'
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle,
  Clapperboard,
  Coins,
  Crown,
  Film,
  Flame,
  Gift,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/layout/AppHeader'

const creatorBenefits = [
  {
    icon: Play,
    title: 'Shorts that build momentum',
    description:
      'Start with fast, addictive shorts designed for discovery, audience growth, and repeat viewing.',
  },
  {
    icon: Film,
    title: 'Movies unlock with proof',
    description:
      'Premium uploads unlock through growth, community support, or creator fast-track approval.',
  },
  {
    icon: Coins,
    title: 'Earn from every fan action',
    description:
      'Gifts, boosts, subscriptions, and MAI ads turn attention into direct creator value.',
  },
]

const platformPillars = [
  {
    value: '10',
    label: 'Founding creators',
    description: 'A focused launch class instead of flooding the platform with noise.',
  },
  {
    value: '100%',
    label: 'Human-created content',
    description: 'MaiPlay is built for original creators, not AI-content farms.',
  },
  {
    value: 'PayPal',
    label: 'Simple payouts',
    description: 'Creator payments start with a clean PayPal-first payout flow.',
  },
]

const featureRows = [
  {
    icon: Crown,
    title: 'Creator-owned presence',
    description:
      'Profiles, badges, calendars, fanbases, merch, and premium videos become one creator universe.',
  },
  {
    icon: Gift,
    title: 'Fan-powered unlocks',
    description:
      'Fans do not just watch. They help creators unlock bigger releases, visibility, and status.',
  },
  {
    icon: ShieldCheck,
    title: 'Moderated growth',
    description:
      'Admin reports, support tickets, broadofficers, and human review keep the platform cleaner as it scales.',
  },
]

const tierProgression = [
  'MaiPlay Tier Progression (Simplified System) 👉 Top performers only.',
]

const cashoutTiers = [
  { tier: 'Tier 1', coins: '5,000', usd: '$25' },
  { tier: 'Tier 2', coins: '10,000', usd: '$50' },
  { tier: 'Tier 3', coins: '25,000', usd: '$125' },
  { tier: 'Tier 4', coins: '50,000', usd: '$250' },
  { tier: 'Tier 5', coins: '100,000', usd: '$500' },
  { tier: 'Tier 6', coins: '200,000', usd: '$1000' },
]

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050101] text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,209,77,0.18),transparent_34%),radial-gradient(circle_at_20%_20%,rgba(220,38,38,0.18),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(124,58,237,0.14),transparent_32%),linear-gradient(180deg,#050101_0%,#120404_45%,#050101_100%)]" />
        <div className="absolute left-1/2 top-0 h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black" />
      </div>

      <AppHeader fixed />

      <main className="relative z-10">
        <section className="relative flex min-h-screen items-center px-4 pb-20 pt-28">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-7 inline-flex items-center rounded-full border border-yellow-400/40 bg-black/50 px-4 py-2 text-sm font-black text-yellow-300 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl">
                <Sparkles className="mr-2 h-4 w-4" />
                Powered by MAI · Creator-first streaming
              </div>

              <h1 className="max-w-5xl text-5xl font-black leading-[0.92] tracking-tight sm:text-6xl md:text-7xl xl:text-8xl">
                The next home for{' '}
                <span className="bg-gradient-to-r from-yellow-300 via-yellow-500 to-red-500 bg-clip-text text-transparent">
                  creators, shorts, and movies.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-zinc-200 sm:text-xl">
                MaiPlay is a creator-first platform where you earn from your first video—shorts build your audience, fans fund your growth, and movies unlock as you scale
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link to="/register">
                  <Button className="group h-14 w-full rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-500 to-red-500 px-8 text-base font-black text-black shadow-2xl shadow-yellow-500/25 transition-all hover:scale-[1.03] hover:shadow-yellow-400/40 sm:w-auto">
                    <Play className="mr-2 h-5 w-5 fill-black" />
                    Apply as Creator
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>

                <Link to="/home">
                  <Button
                    variant="outline"
                    className="h-14 w-full rounded-2xl border-white/20 bg-white/10 px-8 text-base font-black text-white backdrop-blur-xl transition-all hover:scale-[1.03] hover:bg-white/15 sm:w-auto"
                  >
                    <Clapperboard className="mr-2 h-5 w-5" />
                    Watch MaiPlay
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-zinc-300">
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  <CheckCircle className="mr-2 h-4 w-4 text-yellow-300" />
                  10 founding creators
                </span>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  <CheckCircle className="mr-2 h-4 w-4 text-yellow-300" />
                  Human creations only
                </span>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  <CheckCircle className="mr-2 h-4 w-4 text-yellow-300" />
                  PayPal-first payouts
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-yellow-400/25 via-red-500/15 to-purple-500/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-black/55 p-4 shadow-2xl backdrop-blur-2xl">
                <div className="rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-red-950/40 to-black p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-300">
                        MaiPlay Preview
                      </p>
                      <h2 className="mt-1 text-2xl font-black">Creator Theater</h2>
                    </div>
                    <div className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                      LIVE SOON
                    </div>
                  </div>

                  <div className="relative aspect-video overflow-hidden rounded-2xl border border-yellow-400/20 bg-black">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(250,204,21,0.32),transparent_28%),radial-gradient(circle_at_70%_70%,rgba(220,38,38,0.38),transparent_28%),linear-gradient(135deg,#160202,#0a0a0a)]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-yellow-300/50 bg-yellow-400 text-black shadow-2xl shadow-yellow-500/40">
                        <Play className="ml-1 h-9 w-9 fill-black" />
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/65 p-4 backdrop-blur-xl">
                      <p className="text-sm font-black text-white">Featured Creator Drop</p>
                      <p className="mt-1 text-xs text-zinc-300">
                        Shorts · Movie unlock progress · Fan boosts active
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {platformPillars.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                      >
                        <p className="text-2xl font-black text-yellow-300">{item.value}</p>
                        <p className="mt-1 text-xs font-bold text-white">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-black/45 px-4 py-18 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.28em] text-yellow-300">
                  Why MaiPlay wins
                </p>
                <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
                  Not another video site. A creator economy engine.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-zinc-300">
                YouTube is massive. Netflix is premium. MaiPlay is built to combine creator
                distribution, fan funding, and premium releases into one focused ecosystem.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {creatorBenefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="group rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.03] p-7 shadow-2xl transition-all hover:-translate-y-1 hover:border-yellow-400/40 hover:bg-white/[0.1]"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-red-500 text-black shadow-xl shadow-yellow-500/20">
                    <benefit.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-black text-white">{benefit.title}</h3>
                  <p className="mt-3 leading-7 text-zinc-300">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-24">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[2rem] border border-yellow-400/25 bg-gradient-to-br from-yellow-500/15 via-red-500/10 to-black p-8 shadow-2xl">
              <Trophy className="mb-6 h-12 w-12 text-yellow-300" />
              <h2 className="text-4xl font-black">Founding creator launch</h2>
              <p className="mt-4 leading-7 text-zinc-200">
                MaiPlay starts exclusive: 10 creators, shorts first, premium movie uploads earned
                through growth, gifts, milestones, or approved fast-track.
              </p>
              <p className="mt-4 leading-7 text-zinc-200 font-black text-yellow-300">
                {tierProgression[0]}
              </p>
              <Link to="/register">
                <Button className="mt-8 h-13 rounded-2xl bg-yellow-400 px-7 font-black text-black hover:bg-yellow-300">
                  Claim Creator Spot
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {platformPillars.map((pillar) => (
                <div
                  key={pillar.label}
                  className="rounded-[2rem] border border-white/10 bg-black/50 p-7 backdrop-blur-xl"
                >
                  <p className="text-5xl font-black text-yellow-300">{pillar.value}</p>
                  <h3 className="mt-4 text-xl font-black">{pillar.label}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-zinc-950/70 px-4 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-[0.28em] text-yellow-300">
                Platform features
              </p>
              <h2 className="mt-3 text-4xl font-black md:text-6xl">
                Built like a premium network, not a basic upload page.
              </h2>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {featureRows.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-white/10 bg-black/55 p-7 backdrop-blur-xl"
                >
                  <feature.icon className="h-9 w-9 text-yellow-300" />
                  <h3 className="mt-6 text-2xl font-black">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-zinc-300">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-red-400/20 bg-red-950/20 p-7">
                <Flame className="h-9 w-9 text-red-300" />
                <h3 className="mt-5 text-2xl font-black">Shorts → Fans → Movies</h3>
                <p className="mt-3 leading-7 text-zinc-300">
                  Creators build demand first. Then fans help push the creator toward premium
                  movie-level uploads and bigger visibility.
                </p>
              </div>

              <div className="rounded-3xl border border-yellow-400/20 bg-yellow-950/10 p-7">
                <BadgeCheck className="h-9 w-9 text-yellow-300" />
                <h3 className="mt-5 text-2xl font-black">Status that matters</h3>
                <p className="mt-3 leading-7 text-zinc-300">
                  Badges, creator levels, founding status, fan memberships, and subscriptions make
                  the platform feel alive from day one.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-black/45 px-4 py-24 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.28em] text-yellow-300">
                  Cashout Tiers
                </p>
                <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
                  Weekly Pay - PayPal Account Required
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-zinc-300">
                Earn coins through gifts, boosts, subscriptions, and MAI ads. Cash out weekly with PayPal.
                If you have an issue with PayPal, contact trollcity2025@gmail.com (customer support email).
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {cashoutTiers.map((tier) => (
                <div
                  key={tier.tier}
                  className="group rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.03] p-7 shadow-2xl transition-all hover:-translate-y-1 hover:border-yellow-400/40 hover:bg-white/[0.1]"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-red-500 text-black shadow-xl shadow-yellow-500/20">
                    <Coins className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-black text-white">{tier.tier}</h3>
                  <p className="mt-3 leading-7 text-zinc-300">{tier.coins} coins = {tier.usd}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden px-4 py-28">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/15 via-red-500/10 to-purple-500/15" />
          <div className="relative mx-auto max-w-5xl rounded-[2rem] border border-yellow-400/30 bg-black/70 p-8 text-center shadow-2xl shadow-yellow-500/10 backdrop-blur-2xl md:p-14">
            <div className="mx-auto mb-7 flex h-18 w-18 items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-300 to-red-500 text-black shadow-2xl shadow-yellow-500/30">
              <Zap className="h-9 w-9" />
            </div>

            <h2 className="text-4xl font-black tracking-tight md:text-6xl">
              Build the creator network they cannot ignore.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
              Join MaiPlay early as a creator or viewer and help shape a video platform where
              attention, ownership, and fan support actually connect.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/register">
                <Button className="h-14 w-full rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-500 to-red-500 px-8 text-base font-black text-black shadow-2xl shadow-yellow-500/25 hover:scale-[1.03] sm:w-auto">
                  <Users className="mr-2 h-5 w-5" />
                  Create Free Account
                </Button>
              </Link>

              <Link to="/home">
                <Button
                  variant="outline"
                  className="h-14 w-full rounded-2xl border-white/20 bg-white/10 px-8 text-base font-black text-white backdrop-blur-xl hover:scale-[1.03] hover:bg-white/15 sm:w-auto"
                >
                  Start Watching
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <p className="mt-7 flex items-center justify-center text-sm font-medium text-zinc-300">
              <Lock className="mr-2 h-4 w-4 text-yellow-300" />
              Creator-first. Human-made. MAI-powered.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}