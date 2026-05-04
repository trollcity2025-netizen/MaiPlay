import { useState } from 'react'
import { AppHeader } from '../components/layout/AppHeader'
import { cn } from '../lib/utils'

const tabs = ['Overview', 'Transactions', 'Payouts']

export function WalletPage() {
  const [activeTab, setActiveTab] = useState('Overview')

  return (
    <div className="min-h-screen bg-background text-white">
      <AppHeader />

      {/* Hero */}
      <div className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-yellow-500/10 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-500 to-yellow-400 bg-clip-text text-transparent">
            MAI Wallet
          </h1>
          <p className="text-gray-400 mt-2">
            Manage your coins, earnings, and payouts across the MAI network.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-4 flex gap-3 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              activeTab === tab
                ? 'bg-gradient-to-r from-red-600 to-yellow-500 text-white shadow-lg shadow-yellow-500/20'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Wallet Content */}
      <div className="container mx-auto px-4 pb-10 space-y-6">

        {/* Balance Card */}
        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-yellow-500/10 pointer-events-none" />

          <div className="relative z-10">
            <p className="text-sm text-gray-400">Total Balance</p>
            <h2 className="text-3xl font-bold mt-1">0 MAI</h2>
            <p className="text-xs text-gray-500 mt-1">
              ≈ $0.00 USD
            </p>

            <div className="flex gap-3 mt-6">
              <button className="flex-1 py-2 rounded-lg bg-gradient-to-r from-red-600 to-yellow-500 text-sm font-medium hover:opacity-90 transition">
                Add Funds
              </button>
              <button className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition">
                Cash Out
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Earned', value: '0 MAI' },
            { label: 'Spent', value: '0 MAI' },
            { label: 'Pending', value: '0 MAI' },
            { label: 'Withdrawn', value: '0 MAI' }
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className="text-lg font-semibold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Transactions Preview */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-semibold mb-4">Recent Activity</h3>

          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between text-sm border-b border-white/5 pb-2"
              >
                <div>
                  <p className="text-white">Transaction</p>
                  <p className="text-xs text-gray-400">Details</p>
                </div>
                <p className="text-gray-300">+0 MAI</p>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        <div className="text-center pt-6">
          <p className="text-gray-500 text-sm">
            Your wallet activity will appear here once you start earning or spending MAI.
          </p>
        </div>

      </div>
    </div>
  )
}