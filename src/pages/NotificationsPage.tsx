import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  ChevronRight,
  AlertCircle,
  Coins,
  Crown,
  Film,
  Gift,
  Heart,
  Loader2,
  MessageCircle,
  Radio,
  Shield,
  UserPlus,
} from 'lucide-react'

import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import { useAuthAccount } from '../auth/AuthAccountProvider'

type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'gift'
  | 'coin'
  | 'video'
  | 'short'
  | 'movie'
  | 'live'
  | 'creator'
  | 'moderation'
  | 'system'
  | string

type NotificationRow = {
  id: string
  user_id: string
  actor_id?: string | null
  type?: NotificationType | null
  title?: string | null
  message?: string | null
  body?: string | null
  read?: boolean | null
  is_read?: boolean | null
  created_at?: string | null

  /**
   * These fields let every notification deep-link directly.
   * Kilo should map your backend notification insert logic into these.
   */
  reference_type?: string | null
  reference_id?: string | null
  entity_type?: string | null
  entity_id?: string | null
  target_type?: string | null
  target_id?: string | null
  link_url?: string | null
  url?: string | null
  metadata?: Record<string, any> | null
}

const typeConfig: Record<
  string,
  {
    label: string
    icon: any
    badgeClass: string
  }
> = {
  like: {
    label: 'Like',
    icon: Heart,
    badgeClass: 'bg-rose-500/15 text-rose-200 border-rose-400/30',
  },
  comment: {
    label: 'Comment',
    icon: MessageCircle,
    badgeClass: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
  },
  follow: {
    label: 'Follow',
    icon: UserPlus,
    badgeClass: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
  },
  gift: {
    label: 'Gift',
    icon: Gift,
    badgeClass: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
  },
  coin: {
    label: 'Coins',
    icon: Coins,
    badgeClass: 'bg-yellow-500/15 text-yellow-100 border-yellow-400/30',
  },
  video: {
    label: 'Video',
    icon: Film,
    badgeClass: 'bg-red-500/15 text-red-100 border-red-400/30',
  },
  short: {
    label: 'Short',
    icon: Film,
    badgeClass: 'bg-red-500/15 text-red-100 border-red-400/30',
  },
  movie: {
    label: 'Movie',
    icon: Crown,
    badgeClass: 'bg-purple-500/15 text-purple-100 border-purple-400/30',
  },
  live: {
    label: 'Live',
    icon: Radio,
    badgeClass: 'bg-red-600/20 text-red-100 border-red-400/30',
  },
  creator: {
    label: 'Creator',
    icon: Crown,
    badgeClass: 'bg-orange-500/15 text-orange-100 border-orange-400/30',
  },
  moderation: {
    label: 'Safety',
    icon: Shield,
    badgeClass: 'bg-blue-500/15 text-blue-100 border-blue-400/30',
  },
  system: {
    label: 'System',
    icon: AlertCircle,
    badgeClass: 'bg-zinc-500/15 text-zinc-200 border-zinc-400/30',
  },
}

function isUnread(notification: NotificationRow) {
  return notification.is_read === false || notification.read === false
}

function getNotificationText(notification: NotificationRow) {
  return (
    notification.message ||
    notification.body ||
    'Open this notification to view the referenced update.'
  )
}

function getReferenceType(notification: NotificationRow) {
  return (
    notification.reference_type ||
    notification.entity_type ||
    notification.target_type ||
    notification.metadata?.reference_type ||
    notification.metadata?.entity_type ||
    notification.metadata?.target_type ||
    notification.type ||
    'system'
  )
}

function getReferenceId(notification: NotificationRow) {
  return (
    notification.reference_id ||
    notification.entity_id ||
    notification.target_id ||
    notification.metadata?.reference_id ||
    notification.metadata?.entity_id ||
    notification.metadata?.target_id ||
    notification.metadata?.video_id ||
    notification.metadata?.short_id ||
    notification.metadata?.movie_id ||
    notification.metadata?.stream_id ||
    notification.metadata?.creator_id ||
    notification.metadata?.profile_id ||
    null
  )
}

function buildNotificationHref(notification: NotificationRow) {
  const explicitUrl =
    notification.link_url ||
    notification.url ||
    notification.metadata?.link_url ||
    notification.metadata?.url

  if (explicitUrl && typeof explicitUrl === 'string') return explicitUrl

  const refType = String(getReferenceType(notification)).toLowerCase()
  const refId = getReferenceId(notification)

  if (!refId) return '/notifications'

  const routeMap: Record<string, string> = {
    profile: `/profile/${refId}`,
    user: `/profile/${refId}`,
    creator: `/creator/${refId}`,
    creator_profile: `/creator/${refId}`,

    video: `/watch/${refId}`,
    short: `/shorts/${refId}`,
    shorts: `/shorts/${refId}`,
    movie: `/movies/${refId}`,
    film: `/movies/${refId}`,

    live: `/live/${refId}`,
    stream: `/live/${refId}`,
    broadcast: `/live/${refId}`,

    comment: `/watch/${notification.metadata?.video_id || refId}`,
    gift: `/wallet`,
    coin: `/wallet`,
    payout: `/wallet`,

    report: `/support`,
    ticket: `/support`,
    moderation: `/support`,
    system: `/notifications`,
  }

  return routeMap[refType] || `/notifications/${notification.id}`
}

function formatNotificationTime(date?: string | null) {
  if (!date) return ''

  const created = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return created.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: created.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuthAccount()

  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unreadCount = useMemo(
    () => notifications.filter((notification) => isUnread(notification)).length,
    [notifications]
  )

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    let mounted = true

    async function loadNotifications() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!mounted) return

      if (error) {
        setError(error.message)
        setNotifications([])
      } else {
        setNotifications((data || []) as NotificationRow[])
      }

      setLoading(false)
    }

    loadNotifications()

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadNotifications()
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  async function markAsRead(notification: NotificationRow) {
    if (!isUnread(notification)) return

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, read: true, is_read: true }
          : item
      )
    )

    await supabase
      .from('notifications')
      .update({ read: true, is_read: true })
      .eq('id', notification.id)
  }

  async function openNotification(notification: NotificationRow) {
    await markAsRead(notification)
    navigate(buildNotificationHref(notification))
  }

  async function markAllAsRead() {
    if (!user?.id || unreadCount === 0) return

    setMarkingAllRead(true)

    const { error } = await supabase
      .from('notifications')
      .update({ read: true, is_read: true })
      .eq('user_id', user.id)

    if (!error) {
      setNotifications((current) =>
        current.map((item) => ({ ...item, read: true, is_read: true }))
      )
    }

    setMarkingAllRead(false)
  }

  return (
    <div className="min-h-screen bg-[#050202] text-white">
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-red-500/20 bg-gradient-to-br from-[#210505] via-[#090303] to-black shadow-2xl shadow-red-950/30">
          <div className="border-b border-white/10 bg-white/[0.03] p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-yellow-200">
                  <Bell className="h-3.5 w-3.5" />
                  MaiPlay Alerts
                </div>

                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Notifications
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
                  Every alert links directly to its source — videos, shorts,
                  movies, lives, creators, gifts, wallet activity, and support.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center">
                  <p className="text-2xl font-black text-yellow-200">
                    {unreadCount}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Unread
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={markingAllRead || unreadCount === 0}
                  className="rounded-2xl bg-gradient-to-r from-yellow-500 to-red-600 font-bold text-black hover:opacity-90 disabled:opacity-40"
                >
                  {markingAllRead ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Mark all read
                </Button>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-5">
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-yellow-300" />
                  <p className="mt-3 text-sm text-zinc-400">
                    Loading notifications...
                  </p>
                </div>
              </div>
            ) : error ? (
               <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                 <AlertCircle className="mx-auto h-9 w-9 text-red-300" />
                 <h2 className="mt-3 text-lg font-bold">
                  Notifications could not load
                </h2>
                <p className="mt-1 text-sm text-red-100/70">{error}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-500/10">
                  <Bell className="h-8 w-8 text-yellow-200" />
                </div>
                <h2 className="mt-5 text-2xl font-black">
                  No notifications yet
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                  When someone follows you, gifts you, comments, joins your
                  creator world, or interacts with your content, it will appear
                  here with a direct link.
                </p>
                <Link
                  to="/"
                  className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black hover:bg-yellow-100"
                >
                  Explore MaiPlay
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const notificationType = String(
                    notification.type || 'system'
                  ).toLowerCase()

                  const config = typeConfig[notificationType] || typeConfig.system
                  const Icon = config.icon
                  const unread = isUnread(notification)
                  const href = buildNotificationHref(notification)

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={cn(
                        'group flex w-full items-center gap-4 rounded-3xl border p-4 text-left transition-all duration-200',
                        unread
                          ? 'border-yellow-400/30 bg-gradient-to-r from-yellow-500/10 via-red-500/10 to-transparent shadow-lg shadow-yellow-950/20'
                          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border',
                          config.badgeClass
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {unread && (
                            <span className="h-2.5 w-2.5 rounded-full bg-yellow-300 shadow-lg shadow-yellow-300/40" />
                          )}

                          <h3 className="truncate text-base font-extrabold text-white">
                            {notification.title || config.label}
                          </h3>

                          <span
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]',
                              config.badgeClass
                            )}
                          >
                            {config.label}
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-400">
                          {getNotificationText(notification)}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span>{formatNotificationTime(notification.created_at)}</span>
                          <span>•</span>
                          <span className="text-yellow-200/80">
                            Opens direct reference
                          </span>
                          {href !== '/notifications' && (
                            <>
                              <span>•</span>
                              <span className="truncate text-zinc-500">
                                {href}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-yellow-200" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}