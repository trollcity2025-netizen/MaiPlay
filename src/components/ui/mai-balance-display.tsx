import { Coins, Loader2 } from 'lucide-react'
import { useMaiWallet } from '../../hooks/useMaiWallet'
import { cn } from '../../lib/utils'

interface MaiBalanceDisplayProps {
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function MaiBalanceDisplay({
  className,
  showIcon = true,
  size = 'md',
}: MaiBalanceDisplayProps) {
  const { wallet, walletLoading } = useMaiWallet()

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  if (walletLoading) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-black/50 text-yellow-300 shadow-lg shadow-yellow-500/10 backdrop-blur-xl',
          sizeClasses[size],
          className
        )}
      >
        {showIcon && <Loader2 className="h-4 w-4 animate-spin" />}
        <span className="h-3 w-12 animate-pulse rounded-full bg-yellow-300/30" />
      </div>
    )
  }

  const balance = wallet?.mai_coins ?? 0

  return (
    <div
      className={cn(
        'group inline-flex items-center gap-2 rounded-full border border-yellow-400/35 bg-gradient-to-r from-yellow-400/20 via-black/60 to-red-500/20 font-black text-yellow-200 shadow-lg shadow-yellow-500/10 backdrop-blur-xl transition-all hover:scale-105 hover:border-yellow-300 hover:shadow-yellow-400/25',
        sizeClasses[size],
        className
      )}
      title={`${balance.toLocaleString()} MAI Coins`}
    >
      {showIcon && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-black shadow-md shadow-yellow-400/25">
          <Coins className="h-3.5 w-3.5" />
        </span>
      )}

      <span className="tabular-nums">{balance.toLocaleString()}</span>
      <span className="text-[10px] font-black tracking-wider text-yellow-300/80">MAI</span>
    </div>
  )
}