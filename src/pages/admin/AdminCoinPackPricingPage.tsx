import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../../components/layout/AppHeader'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { CoinPack, MAI_COIN_PACKS } from '../../config/maiEconomy'

const STORAGE_KEY = 'mai-coin-pack-pricing'

export function AdminCoinPackPricingPage() {
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>(MAI_COIN_PACKS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setCoinPacks(JSON.parse(stored))
      }
    } catch {
      // ignore invalid local storage state
    }
  }, [])

  const updatePack = (index: number, field: keyof CoinPack, value: string) => {
    setCoinPacks((current) =>
      current.map((item, idx) =>
        idx !== index ? item : { ...item, [field]: field === 'name' || field === 'tier' || field === 'bonusLabel' ? value : Number(value) }
      )
    )
    setSaved(false)
  }

  const handleSave = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(coinPacks))
    setSaved(true)
  }

  const handleReset = () => {
    setCoinPacks(MAI_COIN_PACKS)
    window.localStorage.removeItem(STORAGE_KEY)
    setSaved(true)
  }

  return (
    <div className="min-h-screen bg-[#070202] text-white">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section className="rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-red-950/80 via-black to-yellow-950/30 p-6 shadow-2xl">
          <h1 className="text-3xl font-black text-yellow-300">MAI Coin Pack Pricing</h1>
          <p className="mt-2 text-sm text-zinc-300">Review and update coin pack pricing. Changes are saved locally in the browser so admins can validate pricing flows immediately.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/admin">
              <Button variant="outline" className="border-white/20 text-white">
                Back to Admin Dashboard
              </Button>
            </Link>
            <Button onClick={handleSave} className="bg-yellow-400 font-black text-black hover:bg-yellow-300">
              Save Pricing
            </Button>
            <Button variant="outline" onClick={handleReset} className="border-red-400/30 text-red-300">
              Reset Defaults
            </Button>
          </div>
          {saved && <p className="mt-3 text-sm text-emerald-300">Pricing saved locally.</p>}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {coinPacks.map((pack, idx) => (
            <Card key={pack.name + idx} className="border-white/10 bg-black/50 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-black text-yellow-300">{pack.tier}</p>
                  <p className="text-sm text-zinc-400">{pack.name}</p>
                </div>
                <p className="text-xl font-black">{pack.coins.toLocaleString()} coins</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.24em] text-zinc-500">Coins</label>
                  <Input
                    value={pack.coins}
                    type="number"
                    onChange={(e) => updatePack(idx, 'coins', e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.24em] text-zinc-500">USD Price</label>
                  <Input
                    value={pack.priceUsd}
                    type="number"
                    step="0.01"
                    onChange={(e) => updatePack(idx, 'priceUsd', e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-xs uppercase tracking-[0.24em] text-zinc-500">Bonus label</label>
                <Input
                  value={pack.bonusLabel || ''}
                  onChange={(e) => updatePack(idx, 'bonusLabel', e.target.value)}
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
