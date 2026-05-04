import { useMemo, useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthAccount } from '../../auth/AuthAccountProvider'
import { AppHeader } from '../../components/layout/AppHeader'

const DAILY_LIVE_LIMIT_MINUTES = 60

const categories = [
  'entertainment',
  'music',
  'gaming',
  'business',
  'education',
  'comedy',
  'food',
  'cars',
]

function toIsoFromDateTimeLocal(value: string) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

function isValidUrl(value: string) {
  if (!value.trim()) return true

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function CreatorLiveSetupPage() {
  const { account } = useAuthAccount()
  const navigate = useNavigate()

  // Redirect non-creators/admins to external site
  useEffect(() => {
    if (account) {
      const isCreator = account.is_creator || account.role === 'creator'
      const isAdmin = account.role === 'admin'

      if (!isCreator && !isAdmin) {
        window.location.href = 'https://maitrollcity.com'
        return
      }
    }
  }, [account])

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('entertainment')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [startAt, setStartAt] = useState('')
  const [description, setDescription] = useState('')
  const [chatEnabled, setChatEnabled] = useState(true)
  const [allowCoHosts, setAllowCoHosts] = useState(true)
  const [tickerText, setTickerText] = useState('')

  const trimmedTitle = title.trim()
  const trimmedThumbnailUrl = thumbnailUrl.trim()
  const trimmedDescription = description.trim()
  const trimmedTickerText = tickerText.trim()

  const scheduledStartIso = useMemo(() => {
    return toIsoFromDateTimeLocal(startAt)
  }, [startAt])

  const thumbnailIsValid = isValidUrl(trimmedThumbnailUrl)

  const formError = useMemo(() => {
    if (!account?.id) return 'Sign in required.'
    if (!trimmedTitle) return 'Live title is required.'
    if (trimmedTitle.length < 3) return 'Live title must be at least 3 characters.'
    if (trimmedTitle.length > 100) return 'Live title must be 100 characters or less.'
    if (!category) return 'Category is required.'
    if (!thumbnailIsValid) return 'Thumbnail must be a valid http or https URL.'
    if (trimmedDescription.length > 500) return 'Description must be 500 characters or less.'
    if (trimmedTickerText.length > 140) return 'Ticker text must be 140 characters or less.'
    return null
  }, [
    account?.id,
    trimmedTitle,
    category,
    thumbnailIsValid,
    trimmedDescription,
    trimmedTickerText,
  ])

  const scheduleError = useMemo(() => {
    if (!startAt) return 'Scheduled start time is required.'
    if (!scheduledStartIso) return 'Scheduled start time is invalid.'

    const scheduledDate = new Date(scheduledStartIso)
    const now = new Date()

    if (scheduledDate.getTime() <= now.getTime()) {
      return 'Scheduled start time must be in the future.'
    }

    return null
  }, [startAt, scheduledStartIso])

  const createSession = useMutation({
    mutationFn: async (isLiveNow: boolean) => {
      if (!account?.id) throw new Error('Sign in required.')
      if (formError) throw new Error(formError)

      const now = new Date()
      const finalScheduledStartAt = isLiveNow ? now.toISOString() : scheduledStartIso

      if (!isLiveNow && !finalScheduledStartAt) {
        throw new Error('Scheduled start time is required.')
      }

      if (!isLiveNow && scheduleError) {
        throw new Error(scheduleError)
      }

      const payload = {
        creator_id: account.id,
        title: trimmedTitle,
        category,
        description: trimmedDescription || null,
        thumbnail_url: trimmedThumbnailUrl || null,
        scheduled_start_at: finalScheduledStartAt,
        status: isLiveNow ? 'live' : 'scheduled',
        started_at: isLiveNow ? now.toISOString() : null,
        scheduled_duration_minutes: DAILY_LIVE_LIMIT_MINUTES,
        chat_enabled: chatEnabled,
        cohosts_enabled: allowCoHosts,
        ticker_text: trimmedTickerText || null,
      }

      const { data, error } = await supabase
        .from('creator_live_sessions')
        .insert(payload)
        .select('id')
        .single()

      if (error) {
        console.error('[CreatorLiveSetupPage] Failed to create live session:', error)
        throw new Error(error.message || 'Failed to create live session.')
      }

      if (!data?.id) {
        throw new Error('Live session was created without an ID.')
      }

      if (isLiveNow) {
        try {
          const { error: initError } = await supabase.functions.invoke(
            'start-live-session',
            {
              body: { sessionId: data.id },
            },
          )

          if (initError) {
            console.warn('[CreatorLiveSetupPage] Failed to initialize live session, continuing anyway:', initError)
            // Don't throw error, just log and continue
          }
        } catch (error) {
          console.warn('[CreatorLiveSetupPage] Live session initialization failed, continuing anyway:', error)
          // Don't throw error, just log and continue
        }
      }

      return {
        sessionId: data.id,
        isLiveNow,
      }
    },
    onSuccess: (result) => {
      if (result.isLiveNow) {
        navigate(`/creator-hub/live/${result.sessionId}`)
        return
      }

      navigate('/creator-hub')
    },
  })

  const canSchedule =
    !createSession.isPending &&
    !formError &&
    !scheduleError &&
    !!scheduledStartIso

  // Check if user can go live (creators or admins only)
  const canGoLiveNow = !createSession.isPending && !formError && (account?.is_creator || account?.role === 'creator' || account?.role === 'admin')

  return (
    <div className="min-h-screen bg-[#070202] text-white">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-red-950/70 via-black to-yellow-950/20 p-6 shadow-2xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-yellow-400">
            MaiPlay Live
          </p>

          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
                Set up your creator broadcast
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
                Start now or schedule a live session. Each creator gets{' '}
                <span className="font-bold text-yellow-300">
                  {DAILY_LIVE_LIMIT_MINUTES} minutes per day
                </span>
                . Sessions are built for subscriber interaction, BroadOfficer
                moderation, co-host access, and MAI network discovery.
              </p>
            </div>

            <Link
              to="/creator-hub"
              className="inline-flex rounded-xl border border-yellow-400/30 bg-black/30 px-4 py-2 text-sm font-bold text-yellow-200 transition hover:bg-yellow-400/10"
            >
              Back to Creator Hub
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-[1.5rem] border border-white/10 bg-black/40 p-5 shadow-xl">
            <div className="mb-5">
              <h2 className="text-xl font-black">Live Details</h2>
              <p className="mt-1 text-sm text-zinc-400">
                These details appear on the live viewer page and creator discovery.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-200">
                  Live Title
                </span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60"
                  placeholder="Example: Friday Night MAI Creator Show"
                  value={title}
                  maxLength={100}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <span className="mt-1 block text-right text-xs text-zinc-500">
                  {trimmedTitle.length}/100
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-200">
                  Category
                </span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-yellow-400/60"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-200">
                  Description
                </span>
                <textarea
                  className="min-h-28 w-full resize-none rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60"
                  placeholder="Tell viewers what this live is about..."
                  value={description}
                  maxLength={500}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <span className="mt-1 block text-right text-xs text-zinc-500">
                  {trimmedDescription.length}/500
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-200">
                  Thumbnail URL
                </span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60"
                  placeholder="https://..."
                  value={thumbnailUrl}
                  onChange={(event) => setThumbnailUrl(event.target.value)}
                />
                {!thumbnailIsValid && (
                  <p className="mt-2 text-sm text-red-300">
                    Thumbnail must be a valid http or https URL.
                  </p>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-zinc-200">
                  Schedule Start Time
                </span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-yellow-400/60"
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                />
                {startAt && scheduleError && (
                  <p className="mt-2 text-sm text-red-300">{scheduleError}</p>
                )}
              </label>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[1.5rem] border border-yellow-400/20 bg-yellow-950/10 p-5">
              <h2 className="text-xl font-black">Broadcast Controls</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Configure viewer interaction before the live starts.
              </p>

              <div className="mt-5 space-y-4">
                <ToggleRow
                  title="Live Chat"
                  text="Allow viewers to chat during the broadcast."
                  checked={chatEnabled}
                  onChange={setChatEnabled}
                />

                <ToggleRow
                  title="Subscriber Co-Hosts"
                  text="Allow eligible subscribers to request co-host access."
                  checked={allowCoHosts}
                  onChange={setAllowCoHosts}
                />

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-zinc-200">
                    Global Ticker Text
                  </span>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60"
                    placeholder="Optional announcement..."
                    value={tickerText}
                    maxLength={140}
                    onChange={(event) => setTickerText(event.target.value)}
                  />
                  <span className="mt-1 block text-right text-xs text-zinc-500">
                    {trimmedTickerText.length}/140
                  </span>
                </label>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-black/40 p-5">
              <h2 className="text-xl font-black">Go Live</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Start immediately or schedule for later.
              </p>

              {(formError || createSession.error) && (
                <div className="mt-4 rounded-xl border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">
                  {createSession.error
                    ? (createSession.error as Error).message
                    : formError}
                </div>
              )}

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  className="rounded-xl bg-red-600 px-4 py-3 font-black text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => createSession.mutate(true)}
                  disabled={!canGoLiveNow}
                >
                  {createSession.isPending ? 'Starting...' : 'Go Live Now'}
                </button>

                <button
                  type="button"
                  className="rounded-xl bg-yellow-400 px-4 py-3 font-black text-black shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => createSession.mutate(false)}
                  disabled={!canSchedule}
                >
                  {createSession.isPending ? 'Scheduling...' : 'Schedule Live'}
                </button>
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-bold text-yellow-300">
                  Production reminder
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  BroadOfficers can disable chat, remove disruptive viewers, and
                  handle reports once the live session is active.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}

function ToggleRow({
  title,
  text,
  checked,
  onChange,
}: {
  title: string
  text: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 p-4 text-left transition hover:border-yellow-400/30"
    >
      <span>
        <span className="block font-bold text-white">{title}</span>
        <span className="mt-1 block text-sm text-zinc-400">{text}</span>
      </span>

      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? 'bg-yellow-400' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-black transition ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  )
}