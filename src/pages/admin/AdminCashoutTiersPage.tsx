import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../../components/layout/AppHeader'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { CashoutTier, MAI_CASHOUT_TIERS } from '../../config/maiEconomy'

const STORAGE_KEY = 'mai-cashout-tier-pricing'

export function AdminCashoutTiersPage() {
  const [tiers, setTiers] = useState<CashoutTier[]>(MAI_CASHOUT_TIERS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setTiers(JSON.parse(stored))
      }
    } catch {
      // ignore invalid local storage state
    }
  }, [])

  const updateTier = (index: number, field: keyof CashoutTier, value: string) => {
    setTiers((current) =>
      current.map((tier, idx) =>
        idx !== index
          ? tier
          : {
              ...tier,
              [field]: field === 'name' || field === 'feeLabel' ? value : Number(value),
            }
      )
    )
    setSaved(false)
  }

  const handleSave = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tiers))
    setSaved(true)
  }

  const handleReset = () => {
    setTiers(MAI_CASHOUT_TIERS)
    window.localStorage.removeItem(STORAGE_KEY)
    setSaved(true)
  }

  return (
    <div className="min-h-screen bg-[#070202] text-white">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section className="rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-red-950/80 via-black to-yellow-950/30 p-6 shadow-2xl">
          <h1 className="text-3xl font-black text-yellow-300">Cashout Tier Controls</h1>
          <p className="mt-2 text-sm text-zinc-300">Edit payout tiers and fees for creator cashouts. Save locally to validate your tier configuration instantly.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/admin">
              <Button variant="outline" className="border-white/20 text-white">
                Back to Admin Dashboard
              </Button>
            </Link>
            <Button onClick={handleSave} className="bg-yellow-400 font-black text-black hover:bg-yellow-300">
              Save Tiers
            </Button>
            <Button variant="outline" onClick={handleReset} className="border-red-400/30 text-red-300">
              Reset Defaults
            </Button>
          </div>
          {saved && <p className="mt-3 text-sm text-emerald-300">Tier settings saved locally.</p>}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {tiers.map((tier, idx) => (
            <Card key={tier.name + idx} className="border-white/10 bg-black/50 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-black text-yellow-300">{tier.name}</p>
                  <p className="text-sm text-zinc-400">{tier.feeLabel}</p>
                </div>
                <p className="text-xl font-black">${tier.payoutUsd}</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.24em] text-zinc-500">Coins required</label>
                  <Input
                    value={tier.coinsRequired}
                    type="number"
                    onChange={(e) => updateTier(idx, 'coinsRequired', e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.24em] text-zinc-500">Payout USD</label>
                  <Input
                    value={tier.payoutUsd}
                    type="number"
                    step="0.01"
                    onChange={(e) => updateTier(idx, 'payoutUsd', e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-xs uppercase tracking-[0.24em] text-zinc-500">Fee label</label>
                <Input
                  value={tier.feeLabel}
                  onChange={(e) => updateTier(idx, 'feeLabel', e.target.value)}
                  className="mt-2"
                />
              </div>
            </Card>
          ))}
        </section>
      </main>
    </div>
  )
}
