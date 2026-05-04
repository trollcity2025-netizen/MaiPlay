import { useState } from 'react'
import {
  Coins,
  TrendingUp,
  Lock,
  Unlock,
  Crown,
  Gift,
  Film,
  Zap,
} from 'lucide-react'
import { Progress } from '../ui/progress'
import { Button } from '../ui/button'
import { useUnlockProgress } from '../../hooks/useUnlock'
import { UnlockModal } from './UnlockModal'

interface CreatorUnlockCardProps {
  creatorId: string
  isOwnProfile?: boolean
}

function getUnlockLabel(unlockType?: string | null) {
  if (unlockType === 'community') return 'Community Support'
  if (unlockType === 'growth') return 'Growth Milestone'
  if (unlockType === 'fast_track') return 'Fast Track'
  return 'Creator Unlock'
}

function clampPercent(value?: number | null) {
  return Math.min(Math.max(Number(value ?? 0), 0), 100)
}

export function CreatorUnlockCard({
  creatorId,
  isOwnProfile = false,
}: CreatorUnlockCardProps) {
  const { status, isLoading } = useUnlockProgress(creatorId)
  const [showModal, setShowModal] = useState(false)

  if (isLoading || !status) {
    return (
      <div className="rounded-2xl border border-yellow-500/10 bg-black/50 p-5">
        <div className="h-5 w-44 animate-pulse rounded bg-white/10" />
        <div className="mt-5 h-3 w-full animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-white/10" />
      </div>
    )
  }

  if (status.isUnlocked) {
    return (
      <div className="overflow-hidden rounded-2xl border border-yellow-400/40 bg-gradient-to-br from-yellow-950/40 via-black to-red-950/40 p-5 shadow-[0_0_40px_rgba(250,204,21,0.16)]">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400/15">
            <Unlock className="h-5 w-5 text-yellow-300" />
          </div>

          <div>
            <h3 className="font-black text-yellow-300">Movies Unlocked</h3>
            <p className="text-xs text-zinc-400">
              Unlocked via {getUnlockLabel(status.unlockType)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-yellow-500/15 bg-black/40 p-3 text-sm text-zinc-300">
          This creator can now upload full-length movies on MaiPlay.
        </div>
      </div>
    )
  }

  const communityPercent = clampPercent(status.communityProgress)
  const growthPercent = clampPercent(status.growthProgress)

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-yellow-500/15 bg-gradient-to-br from-black via-red-950/20 to-black p-5 shadow-[0_0_35px_rgba(185,28,28,0.16)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-yellow-200">
              <Film className="h-3.5 w-3.5" />
              Movie Unlock
            </div>

            <h3 className="flex items-center gap-2 text-lg font-black text-white">
              <Lock className="h-4 w-4 text-yellow-300" />
              Movie Upload Locked
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              Unlock movies through community gifts, creator growth, or fast-track approval.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            className="shrink-0 rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 font-black text-black shadow-[0_0_20px_rgba(250,204,21,0.25)] hover:scale-105"
          >
            {isOwnProfile ? 'Unlock Options' : 'Support Unlock'}
          </Button>
        </div>

        <div className="space-y-4">
          <UnlockProgressRow
            icon={<Coins className="h-4 w-4 text-yellow-300" />}
            title="Community Support"
            percent={communityPercent}
            color="yellow"
            leftText={`${(status.coinsProgress ?? 0).toLocaleString()} / 50,000 coins`}
            rightText={`${status.giftersCount ?? 0} / 50 gifters`}
          />

          <UnlockProgressRow
            icon={<TrendingUp className="h-4 w-4 text-green-300" />}
            title="Growth Milestone"
            percent={growthPercent}
            color="green"
            leftText="1,000 subscribers"
            rightText="100,000 views"
          />

          <div className="grid gap-2 pt-1 sm:grid-cols-3">
            <MiniUnlockStat
              icon={<Gift className="h-4 w-4" />}
              label="Community"
              value="50K Coins"
            />
            <MiniUnlockStat
              icon={<Crown className="h-4 w-4" />}
              label="Growth"
              value="1K Subs"
            />
            <MiniUnlockStat
              icon={<Zap className="h-4 w-4" />}
              label="Fast Track"
              value="Instant"
            />
          </div>
        </div>
      </div>

      {showModal && (
        <UnlockModal
          creatorId={creatorId}
          status={status}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

function UnlockProgressRow({
  icon,
  title,
  percent,
  color,
  leftText,
  rightText,
}: {
  icon: React.ReactNode
  title: string
  percent: number
  color: 'yellow' | 'green'
  leftText: string
  rightText: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="mb-2 flex justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-bold text-zinc-200">
          {icon}
          {title}
        </span>

        <span
          className={
            color === 'yellow'
              ? 'font-black text-yellow-300'
              : 'font-black text-green-300'
          }
        >
          {percent}%
        </span>
      </div>

      <Progress value={percent} className="h-2" />

      <div className="mt-2 flex justify-between gap-3 text-xs text-zinc-500">
        <span>{leftText}</span>
        <span>{rightText}</span>
      </div>
    </div>
  )
}

function MiniUnlockStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-yellow-500/10 bg-yellow-500/5 p-3">
      <div className="mb-1 text-yellow-300">{icon}</div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="text-sm font-black text-white">{value}</p>
    </div>
  )
}