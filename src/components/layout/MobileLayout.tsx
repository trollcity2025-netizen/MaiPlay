import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Radio, User, Zap } from 'lucide-react'
import { AppHeader } from './layout/AppHeader'
import { cn } from '../lib/utils'

interface MobileLayoutProps {
  children: React.ReactNode
  className?: string
}

export function MobileLayout({ children, className }: MobileLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030303] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(160,0,0,0.32),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(255,200,0,0.08),transparent_28%),linear-gradient(180deg,#040404_0%,#050000_48%,#000_100%)]" />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-scroll {
            -webkit-overflow-scrolling: touch;
          }

          .mobile-safe-area {
            padding-top: env(safe-area-inset-top);
            padding-bottom: calc(env(safe-area-inset-bottom) + 76px);
          }
        }
      `}</style>

      <div className="relative z-10">
        <AppHeader />

        <main
          className={cn(
            'mobile-safe-area mobile-scroll w-full px-4 py-4 md:mx-auto md:max-w-7xl md:px-6 md:py-8',
            className,
          )}
        >
          {children}
        </main>

        <MobileBottomNav />
      </div>
    </div>
  )
}

function MobileBottomNav() {
  const location = useLocation()

  const items = [
    {
      to: '/',
      icon: Home,
      label: 'Home',
      active: location.pathname === '/' || location.pathname === '/home',
    },
    {
      to: '/shorts',
      icon: Zap,
      label: 'Shorts',
      active: location.pathname.startsWith('/shorts'),
    },
    {
      to: '/live',
      icon: Radio,
      label: 'Live',
      active: location.pathname.startsWith('/live'),
    },
    {
      to: '/profile/me',
      icon: User,
      label: 'Profile',
      active: location.pathname.startsWith('/profile'),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-yellow-400/20 bg-black/90 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
        {items.map((item) => (
          <MobileNavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  )
}

function MobileNavItem({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string
  icon: any
  label: string
  active: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl px-3 py-2 text-[11px] font-bold transition',
        active
          ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
          : 'text-zinc-400 hover:bg-white/5 hover:text-white',
      )}
    >
      <Icon className="mb-1 h-5 w-5" />
      <span>{label}</span>
    </Link>
  )
}