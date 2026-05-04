import { useState } from 'react'
import { AppHeader } from '../components/layout/AppHeader'
import { cn } from '../lib/utils'

const days = [
  { day: 1, reward: 50 },
  { day: 2, reward: 75 },
  { day: 3, reward: 100 },
  { day: 4, reward: 150 },
  { day: 5, reward: 200 },
  { day: 6, reward: 300 },
  { day: 7, reward: 500 },
]

export function RewardsPage() {
  const [currentDay] = useState(1) // replace with backend later
  const [claimed] = useState(false)

  return (
    <div className="min-h-screen bg-background text-white">
      <AppHeader />

      {/* Hero */}
      <div className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-yellow-500/10 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-500 to-yellow-400 bg-clip-text text-transparent">
            Daily Rewards
          </h1>
          <p className="text-gray-400 mt-2">
            Log in daily to earn MAI coins and boost your account.
          </p>
        </div>
      </div>

      {/* Claim Card */}
      <div className="container mx-auto px-4 py-6">
        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-yellow-500/10 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">Today’s Reward</p>
              <h2 className="text-3xl font-bold mt-1">
                {days[currentDay - 1].reward} MAI
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Day {currentDay} of 7
              </p>
            </div>

            <button
              className={cn(
                'px-6 py-3 rounded-lg text-sm font-medium transition',
                claimed
                  ? 'bg-white/10 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-yellow-500 hover:opacity-90'
              )}
            >
              {claimed ? 'Claimed' : 'Claim Reward'}
            </button>
          </div>
        </div>
      </div>

      {/* Reward Calendar */}
      <div className="container mx-auto px-4 pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
          {days.map((item) => {
            const isActive = item.day === currentDay
            const isPast = item.day < currentDay

            return (
              <div
                key={item.day}
                className={cn(
                  'relative rounded-xl border p-4 text-center transition-all',
                  isActive
                    ? 'border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/20'
                    : isPast
                    ? 'border-white/10 bg-white/5 opacity-70'
                    : 'border-white/10 bg-white/5'
                )}
              >
                <p className="text-xs text-gray-400">Day {item.day}</p>
                <p className="text-lg font-semibold mt-1">
                  {item.reward}
                </p>
                <p className="text-xs text-gray-500">MAI</p>

                {isActive && (
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-yellow-500/10 to-transparent rounded-xl" />
                )}
              </div>
            )
          })}
        </div>

        {/* Bonus Note */}
        <div className="text-center mt-10">
          <p className="text-gray-500 text-sm">
            Maintain your streak to unlock higher rewards each day.
          </p>
        </div>
      </div>
    </div>
  )
}