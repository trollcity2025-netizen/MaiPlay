import { useState } from 'react'
import { useMaiWallet } from '../../hooks/useMaiWallet'
import { Button } from './button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { Calendar, Check, ChevronLeft, ChevronRight, Gift, Lock } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DailyLoginCalendarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DailyLoginCalendar({ open, onOpenChange }: DailyLoginCalendarProps) {
  const { rewards, todayReward, claimReward, isClaiming, claimError } = useMaiWallet()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

  const startDate = new Date(monthStart)
  startDate.setDate(startDate.getDate() - monthStart.getDay())

  const endDate = new Date(monthEnd)
  endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()))

  const calendarDays = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const normalizedDate = new Date(currentDate)
    normalizedDate.setHours(0, 0, 0, 0)

    const isCurrentMonth = currentDate.getMonth() === currentMonth.getMonth()
    const isToday = normalizedDate.getTime() === today.getTime()
    const isFuture = normalizedDate.getTime() > today.getTime()
    const hasReward = rewards.some(reward => reward.reward_date === dateStr)

    calendarDays.push({
      date: new Date(currentDate),
      dateStr,
      isCurrentMonth,
      isToday,
      isFuture,
      hasReward
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  const handleClaim = async () => {
    try {
      await claimReward()
    } catch (error) {
      console.error('Failed to claim reward:', error)
    }
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const canClaimToday = !todayReward && !isClaiming

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border border-yellow-400/30 bg-black p-0 text-white shadow-2xl shadow-red-950/50">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-black to-yellow-950/40" />
          <div className="absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-yellow-400/20 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-52 w-52 rounded-full bg-red-600/20 blur-3xl" />

          <div className="relative p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-wide text-yellow-300">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-300/40 bg-yellow-400/10 shadow-lg shadow-yellow-500/20">
                  <Calendar className="h-5 w-5" />
                </span>
                Daily MAI Rewards
              </DialogTitle>
            </DialogHeader>

            <div className="mt-5 rounded-3xl border border-yellow-300/30 bg-gradient-to-br from-yellow-300/20 via-red-600/10 to-black p-4 shadow-xl shadow-yellow-500/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-yellow-200/70">
                    Today&apos;s Reward
                  </p>
                  <p className="mt-1 text-3xl font-black text-yellow-200">
                    +10 MAI Coins
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    Log in daily to keep your MAI streak moving.
                  </p>
                </div>

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-yellow-300/40 bg-black/40 shadow-lg shadow-yellow-500/20">
                  <Gift className="h-8 w-8 text-yellow-300" />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={prevMonth}
                className="h-9 w-9 rounded-xl border-yellow-300/30 bg-black/40 p-0 text-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-200">
                {currentMonth.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>

              <Button
                variant="outline"
                size="sm"
                onClick={nextMonth}
                className="h-9 w-9 rounded-xl border-yellow-300/30 bg-black/40 p-0 text-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1.5 rounded-2xl border border-white/10 bg-black/35 p-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-yellow-200/70"
                >
                  {day}
                </div>
              ))}

              {calendarDays.map(day => (
                <div
                  key={day.dateStr}
                  className={cn(
                    'relative flex aspect-square items-center justify-center rounded-xl border text-sm font-bold transition-all',
                    day.isCurrentMonth
                      ? 'border-white/10 bg-white/[0.04] text-white'
                      : 'border-transparent text-white/20',
                    day.hasReward &&
                      day.isCurrentMonth &&
                      'border-yellow-300/50 bg-yellow-300/15 text-yellow-200 shadow-md shadow-yellow-500/10',
                    day.isToday &&
                      day.isCurrentMonth &&
                      'z-10 border-yellow-300 bg-yellow-300/20 text-yellow-100 ring-2 ring-yellow-300/60 shadow-lg shadow-yellow-500/30',
                    day.isFuture && 'opacity-45'
                  )}
                >
                  {day.hasReward && day.isCurrentMonth ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-300 text-black shadow-md shadow-yellow-500/30">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : day.isFuture && day.isCurrentMonth ? (
                    <Lock className="h-3.5 w-3.5 text-white/35" />
                  ) : (
                    <span>{day.date.getDate()}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 text-center">
              {todayReward ? (
                <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/10 p-4">
                  <Check className="mx-auto mb-2 h-8 w-8 text-yellow-300" />
                  <p className="font-bold text-yellow-200">Reward claimed today!</p>
                  <p className="mt-1 text-sm text-white/60">
                    Come back tomorrow for more MAI Coins.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-red-500/20 bg-black/35 p-4">
                  <Gift className="mx-auto mb-2 h-8 w-8 text-yellow-300" />
                  <p className="mb-4 font-bold text-yellow-200">
                    Claim your daily 10 MAI Coins.
                  </p>

                  <Button
                    onClick={handleClaim}
                    disabled={!canClaimToday}
                    className="w-full rounded-2xl bg-gradient-to-r from-yellow-500 via-yellow-300 to-amber-500 font-black text-black shadow-lg shadow-yellow-500/20 hover:from-red-600 hover:via-yellow-400 hover:to-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isClaiming ? 'Claiming...' : 'Claim 10 MAI Coins'}
                  </Button>

                  {claimError && (
                    <p className="mt-3 text-sm font-medium text-red-300">
                      Failed to claim reward. Please try again.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/50">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded border border-yellow-300/50 bg-yellow-300/20" />
                <span>Claimed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded border border-white/10 bg-white/[0.04]" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-white/35" />
                <span>Locked</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}