import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Flame,
  Radio,
  Shield,
  Sparkles,
  Trophy,
  Upload,
  Users,
  Zap,
} from 'lucide-react'
import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'

export function LivePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030303] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(160,0,0,0.38),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(255,200,0,0.10),transparent_28%),linear-gradient(180deg,#040404_0%,#050000_48%,#000_100%)]" />
        <div className="absolute left-0 top-0 h-full w-[420px] bg-gradient-to-r from-red-950/35 to-transparent" />
      </div>

      <AppHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-black/50 shadow-2xl shadow-red-950/20">
          <div className="relative min-h-[320px] p-6 sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(239,68,68,0.32),transparent_34%),linear-gradient(135deg,rgba(127,29,29,0.6),rgba(0,0,0,0.82)_58%,rgba(113,63,18,0.24))]" />

            <div className="relative max-w-4xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                <Radio className="h-3.5 w-3.5" />
                MaiPlay Live
              </div>

              <h1 className="max-w-4xl text-5xl font-black uppercase leading-tight sm:text-6xl">
                Go live.
                <br />
                <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                  Earn in real time.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                Stream directly to your fans, receive MAI coin gifts, grow your audience,
                and push toward your next cashout milestone.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/creator-hub/live/setup">
                  <Button className="rounded-xl bg-yellow-400 px-6 py-3 font-black text-black shadow-lg shadow-yellow-500/20 hover:bg-yellow-300">
                    <Radio className="mr-2 h-4 w-4" />
                    Go Live Now
                  </Button>
                </Link>

                <Link to="/upload">
                  <Button
                    variant="outline"
                    className="rounded-xl border-white/15 bg-black/40 px-6 py-3 font-black text-white hover:bg-white/10"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload First
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <LiveFeatureCard
            icon={Zap}
            title="Instant Gifts"
            text="Fans can support creators with MAI coins while the stream is live."
          />
          <LiveFeatureCard
            icon={Trophy}
            title="Top Earners"
            text="Live creators can climb earnings boards and drive competition."
          />
          <LiveFeatureCard
            icon={Shield}
            title="Moderated Chat"
            text="BroadOfficers and moderators help keep streams controlled."
          />
          <LiveFeatureCard
            icon={Sparkles}
            title="Cashout Progress"
            text="Every gift moves creators closer to the next payout tier."
          />
        </section>

        <section className="mb-8 rounded-[2rem] border border-yellow-400/20 bg-black/45 p-6 shadow-2xl shadow-red-950/20">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Flame className="h-5 w-5 text-yellow-400" />
                <h2 className="text-2xl font-black">Live Now</h2>
              </div>
              <p className="text-sm text-zinc-400">
                Active streams will appear here once creators go live.
              </p>
            </div>

            <Link to="/creator-hub/live/setup">
              <Button
                variant="outline"
                className="rounded-xl border-yellow-400/30 bg-black/30 text-yellow-200 hover:bg-yellow-400/10"
              >
                Start Stream
              </Button>
            </Link>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/30 bg-red-500/10">
              <Radio className="h-8 w-8 text-red-300" />
            </div>

            <h3 className="text-2xl font-black text-white">
              No live creators yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
              Be the first creator to go live, earn MAI coins, and claim the top live spot.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/creator-hub/live/setup">
                <Button className="rounded-xl bg-yellow-400 px-6 py-3 font-black text-black hover:bg-yellow-300">
                  <Radio className="mr-2 h-4 w-4" />
                  Go Live
                </Button>
              </Link>

              <Link to="/calendar">
                <Button
                  variant="outline"
                  className="rounded-xl border-white/15 bg-black/40 px-6 py-3 font-black text-white hover:bg-white/10"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Schedule Live
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
          <div className="mb-5 flex items-center gap-2">
            <Users className="h-5 w-5 text-yellow-400" />
            <h2 className="text-2xl font-black">Why Go Live?</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard
              title="Earn Faster"
              text="Live creators can receive gifts in real time and build momentum toward cashout tiers."
            />
            <InfoCard
              title="Build Fans"
              text="Talk directly to supporters, answer questions, and turn viewers into loyal fans."
            />
            <InfoCard
              title="Create Events"
              text="Use lives for premieres, drops, Q&A sessions, watch parties, and creator shows."
            />
          </div>
        </section>
      </main>
    </div>
  )
}

function LiveFeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: any
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-yellow-400/30 hover:bg-yellow-400/10">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p>
    </div>
  )
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
      <h3 className="font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p>
    </div>
  )
}