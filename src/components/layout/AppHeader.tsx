import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Camera,
  ChevronRight,
  Crown,
  LogOut,
  Menu,
  MessageCircle,
  Music2,
  Plus,
  Search,
  Sparkles,
  Upload,
  User,
  Wallet,
  Cloud,
  X,
} from 'lucide-react'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useAuthAccount } from '../../auth/AuthAccountProvider'
import { supabase } from '../../lib/supabase'
import { MaiBalanceDisplay } from '../ui/mai-balance-display'

type SearchUserResult = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  role: string | null
}

type AppHeaderProps = {
  fixed?: boolean
}

const MIN_SEARCH_LENGTH = 3
const SEARCH_DEBOUNCE_MS = 250

function escapePostgrestSearchValue(value: string) {
  return value.replace(/[%_]/g, '\\$&').replace(/'/g, "''")
}

function getInitials(account?: {
  display_name?: string | null
  username?: string | null
}) {
  const value = account?.display_name || account?.username || 'MAI'
  return value.slice(0, 2).toUpperCase()
}

export function AppHeader({ fixed = false }: AppHeaderProps) {
  const { loading, user, account, signOut } = useAuthAccount()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [burstId, setBurstId] = useState(0)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [activeResultIndex, setActiveResultIndex] = useState(0)

  const desktopSearchRef = useRef<HTMLFormElement | null>(null)
  const mobileSearchRef = useRef<HTMLFormElement | null>(null)

  const trimmedQuery = query.trim()
  const trimmedDebouncedQuery = debouncedQuery.trim()
  const canSearch = trimmedQuery.length >= MIN_SEARCH_LENGTH

  const isCreator = Boolean(account?.is_creator || account?.role === 'creator')
  const isStaff = account?.role === 'admin' || account?.role === 'moderator'

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    setActiveResultIndex(0)
  }, [trimmedDebouncedQuery])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node

      if (
        desktopSearchRef.current?.contains(target) ||
        mobileSearchRef.current?.contains(target)
      ) {
        return
      }

      setShowSearchDropdown(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        setShowSearchDropdown(false)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen])

  const userSearchQuery = useQuery({
    queryKey: ['mai-header-search-users', trimmedDebouncedQuery],
    enabled: trimmedDebouncedQuery.length >= MIN_SEARCH_LENGTH,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
    queryFn: async (): Promise<SearchUserResult[]> => {
      const safeQuery = escapePostgrestSearchValue(trimmedDebouncedQuery)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, role, user_id')
        .or(
          `username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%,user_id.eq.${safeQuery}`,
        )
        .order('display_name', { ascending: true, nullsFirst: false })
        .limit(8)

      if (error) {
        console.error('[AppHeader Search Error]', {
          code: error.code,
          message: error.message,
          details: error.details,
        })

        throw error
      }

      return (data ?? []) as SearchUserResult[]
    },
  })

  const searchResults = userSearchQuery.data ?? []

  const shouldShowDropdown =
    showSearchDropdown &&
    canSearch &&
    !userSearchQuery.isLoading &&
    searchResults.length > 0

  const shouldShowNoResults =
    showSearchDropdown &&
    canSearch &&
    !userSearchQuery.isLoading &&
    trimmedDebouncedQuery.length >= MIN_SEARCH_LENGTH &&
    searchResults.length === 0

  const headerClassName = fixed
    ? 'fixed left-0 right-0 top-0 z-40 border-b border-yellow-500/10 bg-black/85 backdrop-blur-2xl'
    : 'sticky top-0 z-40 border-b border-yellow-500/10 bg-black/85 backdrop-blur-2xl'

  const desktopNavItems = useMemo(
    () => [
      { to: '/messages', label: 'Messages' },
      { to: '/creator-hub', label: 'Creator Hub', creatorOnly: true },
    ],
    [],
  )

  const triggerHeaderFx = () => {
    setBurstId((value) => value + 1)
  }

  const closeMenus = () => {
    setMobileMenuOpen(false)
    setShowSearchDropdown(false)
  }

  const handleSearchInputChange = (value: string) => {
    setQuery(value)
    setShowSearchDropdown(value.trim().length >= MIN_SEARCH_LENGTH)
  }

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    triggerHeaderFx()

    const trimmed = query.trim()
    if (trimmed.length < MIN_SEARCH_LENGTH) return

    closeMenus()
    navigate(`/home?search=${encodeURIComponent(trimmed)}`)
  }

  const handleSelectUser = (result: SearchUserResult) => {
    if (!result.username) return

    triggerHeaderFx()
    closeMenus()
    setQuery('')
    setDebouncedQuery('')
    navigate(`/profile/${result.username}`)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!shouldShowDropdown) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveResultIndex((index) =>
        index >= searchResults.length - 1 ? 0 : index + 1,
      )
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveResultIndex((index) =>
        index <= 0 ? searchResults.length - 1 : index - 1,
      )
    }

    if (event.key === 'Enter') {
      const selectedResult = searchResults[activeResultIndex]

      if (selectedResult) {
        event.preventDefault()
        handleSelectUser(selectedResult)
      }
    }

    if (event.key === 'Escape') {
      setShowSearchDropdown(false)
    }
  }

  const handleSignOut = async () => {
    triggerHeaderFx()
    await signOut()
    closeMenus()
    navigate('/')
  }

  if (loading) return null

  return (
    <header className={headerClassName}>
      <HeaderFx burstId={burstId} />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-28 w-[640px] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-24 w-72 rounded-full bg-red-600/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(250,204,21,0.08),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="flex h-[72px] items-center justify-between gap-2 px-3 lg:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              to={user ? '/home' : '/'}
              onClick={triggerHeaderFx}
              className="group relative flex shrink-0 items-center gap-2"
              aria-label="MaiPlay Home"
            >
              <span className="absolute -inset-2 rounded-2xl bg-yellow-400/0 blur-xl transition group-hover:bg-yellow-400/20" />
              <span className="relative text-2xl font-black tracking-tight">
                <span className="text-red-500">Mai</span>
                <span className="text-yellow-400">Play</span>
              </span>
              <Sparkles className="relative h-4 w-4 text-yellow-300 opacity-90" />
            </Link>

            {user && (
              <nav className="hidden items-center gap-1 xl:flex" aria-label="Main navigation">
                {desktopNavItems
                  .filter((item) => !item.creatorOnly || isCreator)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={triggerHeaderFx}
                      className={({ isActive }) =>
                        [
                          'rounded-full px-3 py-2 text-sm font-bold transition',
                          isActive
                            ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/20'
                            : 'text-zinc-300 hover:bg-white/10 hover:text-yellow-300',
                        ].join(' ')
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
              </nav>
            )}

            {user && (
              <div className="hidden min-w-[240px] max-w-lg flex-1 items-center rounded-2xl border border-yellow-500/20 bg-black/70 px-3 py-2 shadow-lg shadow-yellow-950/20 md:flex">
                <SearchForm
                  refEl={desktopSearchRef}
                  query={query}
                  onChange={handleSearchInputChange}
                  onSubmit={handleSearch}
                  onFocus={() => setShowSearchDropdown(canSearch)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search creators..."
                  inputClassName="h-10 w-full rounded-none border-0 bg-transparent pl-10 pr-3 text-white outline-none placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                  isLoading={userSearchQuery.isLoading}
                  shouldShowDropdown={shouldShowDropdown}
                  shouldShowNoResults={shouldShowNoResults}
                  results={searchResults}
                  activeResultIndex={activeResultIndex}
                  onSelectUser={handleSelectUser}
                />
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/wallet/buy"
                  onClick={triggerHeaderFx}
                  className="hidden items-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-500 to-red-500 px-4 py-2 text-sm font-black text-black shadow-lg shadow-yellow-500/20 transition hover:scale-[1.03] lg:flex"
                >
                  <Plus className="h-4 w-4" />
                  Mai Wallet
                </Link>

                <div className="hidden lg:block">
                  <MaiBalanceDisplay />
                </div>

                {isCreator && (
                  <IconButton
                    icon={Upload}
                    to="/upload/short"
                    label="Upload"
                    onClick={triggerHeaderFx}
                  />
                )}

                <IconButton
                  icon={Bell}
                  to="/notifications"
                  label="Notifications"
                  onClick={triggerHeaderFx}
                />

                <Button
                  type="button"
                  onClick={handleSignOut}
                  className="hidden h-10 items-center gap-2 rounded-xl border border-red-500/30 bg-red-600/15 px-3 text-sm font-black text-red-200 shadow-lg shadow-red-950/20 transition hover:bg-red-600 hover:text-white lg:inline-flex"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>

                <Link
                  to={`/profile/${account?.username || 'me'}`}
                  onClick={triggerHeaderFx}
                  className="group h-11 w-11 overflow-hidden rounded-full border border-red-500/40 bg-zinc-900 shadow-lg shadow-red-950/30 transition hover:border-yellow-400/60"
                  aria-label="Open profile"
                >
                  {account?.avatar_url ? (
                    <img
                      src={account.avatar_url}
                      alt="Profile"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-700 via-red-500 to-yellow-400 text-sm font-black text-black">
                      {getInitials(account)}
                    </div>
                  )}
                </Link>
              </>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link to="/login" onClick={triggerHeaderFx}>
                  <Button
                    variant="ghost"
                    className="rounded-full text-zinc-200 hover:bg-white/10 hover:text-yellow-300"
                  >
                    Sign In
                  </Button>
                </Link>

                <Link to="/register" onClick={triggerHeaderFx}>
                  <Button className="rounded-full bg-gradient-to-r from-yellow-300 via-yellow-500 to-red-500 px-5 font-black text-black shadow-lg shadow-yellow-500/20 transition hover:scale-105">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                triggerHeaderFx()
                setMobileMenuOpen((open) => !open)
              }}
              className="rounded-full border border-yellow-400/25 bg-white/5 p-2 text-white shadow-lg shadow-yellow-500/10 transition hover:border-yellow-400/50 hover:bg-yellow-400/10 md:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mx-3 mb-3 mt-2 overflow-hidden rounded-3xl border border-yellow-400/20 bg-black/95 p-3 shadow-2xl shadow-yellow-500/10 backdrop-blur-2xl md:hidden">
            {user && (
              <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <Link
                  to={`/profile/${account?.username || 'me'}`}
                  onClick={() => {
                    triggerHeaderFx()
                    closeMenus()
                  }}
                  className="h-12 w-12 overflow-hidden rounded-full border border-yellow-400/30 bg-zinc-900"
                >
                  {account?.avatar_url ? (
                    <img
                      src={account.avatar_url}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-700 to-yellow-400 text-sm font-black text-black">
                      {getInitials(account)}
                    </div>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">
                    {account?.display_name || account?.username || 'Mai Creator'}
                  </p>
                  <p className="truncate text-xs text-zinc-400">
                    @{account?.username || 'me'}
                  </p>
                </div>

                {isCreator && (
                  <div className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-yellow-300">
                    Creator
                  </div>
                )}
              </div>
            )}

            {user && (
              <SearchForm
                refEl={mobileSearchRef}
                query={query}
                onChange={handleSearchInputChange}
                onSubmit={handleSearch}
                onFocus={() => setShowSearchDropdown(canSearch)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search creators..."
                inputClassName="h-10 rounded-2xl border-yellow-400/25 bg-black/70 pl-10 pr-3 text-white placeholder:text-zinc-500 focus-visible:ring-yellow-400/40"
                isLoading={userSearchQuery.isLoading}
                shouldShowDropdown={shouldShowDropdown}
                shouldShowNoResults={shouldShowNoResults}
                results={searchResults}
                activeResultIndex={activeResultIndex}
                onSelectUser={handleSelectUser}
                mobile
              />
            )}

{user ? (
               <div className="space-y-3">
                 <MobileSection title="Quick Access">
                   <MobileNav icon={MessageCircle} to="/messages" label="Messages" onClick={triggerHeaderFx} closeMenu={closeMenus} />
                 </MobileSection>

                 {isCreator && (
                    <MobileSection title="Creator">
                      <MobileNav icon={Crown} to="/creator-hub" label="Creator Hub" onClick={triggerHeaderFx} closeMenu={closeMenus} />
                      <MobileNav icon={Cloud} to="/creator-hub/cloud" label="My Cloud" onClick={triggerHeaderFx} closeMenu={closeMenus} />
                      <MobileNav icon={Upload} to="/upload/short" label="Upload Short" onClick={triggerHeaderFx} closeMenu={closeMenus} />
                      <MobileNav icon={Music2} to="/upload/music" label="Upload Music" onClick={triggerHeaderFx} closeMenu={closeMenus} />
                      <MobileNav icon={Wallet} to="/commerce" label="Commerce" onClick={triggerHeaderFx} closeMenu={closeMenus} />
                    </MobileSection>
                  )}

<MobileSection title="Account">
                    <MobileNav icon={Wallet} to="/wallet" label="Wallet" onClick={triggerHeaderFx} closeMenu={closeMenus} />
                    <MobileNav icon={Plus} to="/wallet/buy" label="Buy MAI Coins" onClick={triggerHeaderFx} closeMenu={closeMenus} />
                    <MobileNav icon={Sparkles} to="/rewards" label="Rewards" onClick={triggerHeaderFx} closeMenu={closeMenus} />
                    <MobileNav icon={Crown} to="/leaderboards" label="Leaderboards" onClick={triggerHeaderFx} closeMenu={closeMenus} />
                  </MobileSection>

                  {isStaff && (
                  <MobileSection title="Staff">
                    <MobileNav icon={Crown} to="/admin" label="Admin Dashboard" onClick={triggerHeaderFx} closeMenu={closeMenus} />
                  </MobileSection>
                )}

                <div className="rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-3">
                  <MaiBalanceDisplay />
                </div>

                <Button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full rounded-2xl bg-red-600 font-black text-white hover:bg-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <MobileNav icon={User} to="/login" label="Sign In" onClick={triggerHeaderFx} closeMenu={closeMenus} />
                <MobileNav icon={Sparkles} to="/register" label="Sign Up" onClick={triggerHeaderFx} closeMenu={closeMenus} />
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

function SearchForm({
  refEl,
  query,
  onChange,
  onSubmit,
  onFocus,
  onKeyDown,
  placeholder,
  inputClassName,
  isLoading,
  shouldShowDropdown,
  shouldShowNoResults,
  results,
  activeResultIndex,
  onSelectUser,
  mobile = false,
}: {
  refEl: React.MutableRefObject<HTMLFormElement | null>
  query: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onFocus: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  placeholder: string
  inputClassName: string
  isLoading: boolean
  shouldShowDropdown: boolean
  shouldShowNoResults: boolean
  results: SearchUserResult[]
  activeResultIndex: number
  onSelectUser: (result: SearchUserResult) => void
  mobile?: boolean
}) {
  const trimmed = query.trim()

  return (
    <form
      ref={refEl}
      onSubmit={onSubmit}
      className={mobile ? 'relative mb-3' : 'relative w-full'}
      role="search"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-yellow-300/70" />

      <Input
        value={query}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClassName}
        aria-label="Search MaiPlay"
        autoComplete="off"
      />

      {trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH && (
        <SearchPanel>
          <p className="text-xs text-zinc-400">
            Type at least {MIN_SEARCH_LENGTH} characters to search.
          </p>
        </SearchPanel>
      )}

      {isLoading && trimmed.length >= MIN_SEARCH_LENGTH && (
        <SearchPanel>
          <p className="text-xs font-bold text-yellow-300">Searching...</p>
        </SearchPanel>
      )}

      {shouldShowNoResults && (
        <SearchPanel>
          <p className="text-sm text-zinc-400">No creators found for “{trimmed}”.</p>
        </SearchPanel>
      )}

      {shouldShowDropdown && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-yellow-400/20 bg-black/95 shadow-2xl shadow-yellow-500/10 backdrop-blur-2xl">
          {results.map((result, index) => {
            const active = index === activeResultIndex

            return (
              <button
                key={result.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelectUser(result)}
                className={[
                  'flex w-full items-center gap-3 p-3 text-left transition-colors',
                  active ? 'bg-yellow-400/15' : 'hover:bg-yellow-400/10',
                ].join(' ')}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
                  {result.avatar_url ? (
                    <img
                      src={result.avatar_url}
                      alt={result.username || 'Creator'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-700 to-yellow-400 text-xs font-black text-black">
                      {(result.display_name || result.username || 'MA').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">
                    {result.display_name || result.username || 'Mai Creator'}
                  </p>
                  <p className="truncate text-sm text-zinc-400">
                    @{result.username || 'unknown'}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-yellow-300/70" />
              </button>
            )
          })}
        </div>
      )}
    </form>
  )
}

function SearchPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-yellow-400/20 bg-black/95 p-3 shadow-2xl shadow-yellow-500/10 backdrop-blur-2xl">
      {children}
    </div>
  )
}

function HeaderFx({ burstId }: { burstId: number }) {
  if (!burstId) return null

  return (
    <div key={burstId} className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 animate-[maiFlash_520ms_ease-out] bg-white/0" />

      <Camera className="absolute left-1/2 top-3 h-7 w-7 -translate-x-1/2 animate-[maiCameraPop_800ms_ease-out] text-white" />

      <Music2 className="absolute left-[18%] top-8 h-5 w-5 animate-[maiNoteOne_1100ms_ease-out] text-yellow-300" />
      <Music2 className="absolute left-[32%] top-5 h-4 w-4 animate-[maiNoteTwo_1200ms_ease-out] text-red-300" />
      <Music2 className="absolute right-[28%] top-8 h-5 w-5 animate-[maiNoteThree_1050ms_ease-out] text-yellow-200" />
      <Music2 className="absolute right-[16%] top-6 h-4 w-4 animate-[maiNoteFour_1150ms_ease-out] text-white" />

      <style>{`
        @keyframes maiFlash {
          0% { background: rgba(255,255,255,0); }
          12% { background: rgba(255,255,255,0.75); }
          28% { background: rgba(255,230,150,0.22); }
          100% { background: rgba(255,255,255,0); }
        }

        @keyframes maiCameraPop {
          0% { opacity: 0; transform: translate(-50%, -8px) scale(0.65) rotate(-8deg); filter: blur(2px); }
          18% { opacity: 1; transform: translate(-50%, 0) scale(1.15) rotate(4deg); filter: blur(0); }
          55% { opacity: 1; transform: translate(-50%, -3px) scale(1) rotate(0deg); }
          100% { opacity: 0; transform: translate(-50%, -20px) scale(0.8) rotate(8deg); }
        }

        @keyframes maiNoteOne {
          0% { opacity: 0; transform: translateY(8px) scale(0.7) rotate(-10deg); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translate(-18px, -58px) scale(1.25) rotate(22deg); }
        }

        @keyframes maiNoteTwo {
          0% { opacity: 0; transform: translateY(10px) scale(0.6) rotate(10deg); }
          18% { opacity: 1; }
          100% { opacity: 0; transform: translate(14px, -52px) scale(1.15) rotate(-24deg); }
        }

        @keyframes maiNoteThree {
          0% { opacity: 0; transform: translateY(9px) scale(0.7) rotate(8deg); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translate(20px, -60px) scale(1.25) rotate(-18deg); }
        }

        @keyframes maiNoteFour {
          0% { opacity: 0; transform: translateY(8px) scale(0.65) rotate(-8deg); }
          16% { opacity: 1; }
          100% { opacity: 0; transform: translate(-10px, -54px) scale(1.1) rotate(20deg); }
        }
      `}</style>
    </div>
  )
}

function MobileSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <p className="mb-1 px-2 text-[11px] font-black uppercase tracking-[0.2em] text-yellow-300/70">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

function MobileNav({
  icon: Icon,
  to,
  label,
  onClick,
  closeMenu,
}: {
  icon: React.ElementType
  to: string
  label: string
  onClick: () => void
  closeMenu: () => void
}) {
  return (
    <Link
      to={to}
      onClick={() => {
        onClick()
        closeMenu()
      }}
      className="block"
    >
      <Button
        variant="ghost"
        className="h-11 w-full justify-between rounded-2xl text-white hover:bg-yellow-400/10 hover:text-yellow-300"
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-yellow-300/80" />
          {label}
        </span>
        <ChevronRight className="h-4 w-4 text-zinc-500" />
      </Button>
    </Link>
  )
}

function IconButton({
  icon: Icon,
  to,
  label,
  onClick,
}: {
  icon: React.ElementType
  to: string
  label: string
  onClick?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 shadow-lg shadow-black/20 transition hover:border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-300"
    >
      <Icon className="h-4 w-4" />
    </Link>
  )
}