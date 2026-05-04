import { Link } from 'react-router-dom'
import {
  Crown,
  Flame,
  Gift,
  Trophy,
  TrendingUp,
  Users,
} from 'lucide-react'
import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'

export function LeaderboardsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030303] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(160,0,0,0.38),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(255,200,0,0.10),transparent_28%),linear-gradient(180deg,#040404_0%,#050000_48%,#000_100%)]" />
      </div>

      <AppHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        {/* HERO */}
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-black/50 shadow-2xl shadow-red-950/20">
          <div className="relative p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(239,68,68,0.28),transparent_32%),linear-gradient(135deg,rgba(127,29,29,0.55),rgba(0,0,0,0.75)_55%,rgba(113,63,18,0.20))]" />

            <div className="relative max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-3 py-1 text-xs font-black text-black">
                <Trophy className="h-3.5 w-3.5" />
                Leaderboards
              </div>

              <h1 className="text-5xl font-black uppercase leading-tight">
                Top creators.
                <br />
                <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                  Real earnings.
                </span>
              </h1>

              <p className="mt-4 text-sm text-zinc-300 max-w-xl">
                Compete with creators across MaiPlay. Earn coins, climb the rankings,
                and dominate the spotlight.
              </p>
            </div>
          </div>
        </section>

        {/* CATEGORY TABS */}
        <section className="mb-8 flex flex-wrap gap-3">
          <Button className="bg-yellow-400 text-black font-bold">
            <Flame className="mr-2 h-4 w-4" />
            Trending
          </Button>
          <Button variant="outline" className="border-white/10 text-white">
            <Gift className="mr-2 h-4 w-4" />
            Top Earners
          </Button>
          <Button variant="outline" className="border-white/10 text-white">
            <TrendingUp className="mr-2 h-4 w-4" />
            Growth
          </Button>
          <Button variant="outline" className="border-white/10 text-white">
            <Users className="mr-2 h-4 w-4" />
            Fans
          </Button>
        </section>

        {/* EMPTY STATE (SMART, NOT DEAD) */}
        <section className="rounded-[2rem] border border-yellow-400/20 bg-black/50 p-10 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400/10 border border-yellow-400/30">
            <Crown className="h-8 w-8 text-yellow-300" />
          </div>

          <h2 className="text-2xl font-black">
            Be the first to dominate the leaderboard
          </h2>

          <p className="mt-3 text-zinc-400 max-w-md mx-auto">
            Go live, upload content, and earn MAI coins to claim your spot as a top creator.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link to="/creator-hub/live/setup">
              <Button className="bg-yellow-400 text-black font-bold">
                Go Live
              </Button>
            </Link>

            <Link to="/upload">
              <Button variant="outline" className="border-white/10 text-white">
                Upload Content
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}