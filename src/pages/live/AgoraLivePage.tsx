import { useCallback, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { SubscriptionPanel } from '../../components/subscription/SubscriptionPanel'
import { LivePlayer } from '../../components/live/LivePlayer'
import { LiveChat } from '../../components/live/LiveChat'
import { BroadOfficerPanel } from '../../components/live/BroadOfficerPanel'
import { GlobalTicker } from '../../components/live/GlobalTicker'
import { CoHostAccessGate } from '../../components/live/CoHostAccessGate'
import { useAuth } from '../../hooks/useAuth'
import { AppHeader } from '../../components/layout/AppHeader'
import { PLACEHOLDER_THUMBNAIL } from '../../config/placeholders'

type LiveSession = {
  id: string
  creator_id: string
  title?: string | null
  status?: string | null
  mux_live_playback_id?: string | null
  agora_channel?: string | null
  [key: string]: unknown
}

type RelatedVideo = {
  id: string
  title: string | null
  video_type: string | null
  mux_thumbnail_url: string | null
}

const PLACEHOLDER_THUMBNAIL_URL = PLACEHOLDER_THUMBNAIL

export function AgoraLivePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { user } = useAuth()

  const cleanSessionId = sessionId?.trim()

  const sessionQuery = useQuery({
    queryKey: ['live-session', cleanSessionId],
    enabled: !!cleanSessionId,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async (): Promise<LiveSession | null> => {
      if (!cleanSessionId) return null

      const { data, error } = await supabase
        .from('creator_live_sessions')
        .select('*')
        .eq('id', cleanSessionId)
        .maybeSingle()

      if (error) {
        console.error('[AgoraLivePage] Failed to load live session:', error)
        return null
      }

      return data as LiveSession | null
    },
  })

  const creatorId = sessionQuery.data?.creator_id ?? null
  const liveSessionId = sessionQuery.data?.id ?? null

  // Creator is always the host in AgoraLivePage
  const isHost = true

  const broadOfficerQuery = useQuery({
    queryKey: ['broadofficer-status', user?.id ?? 'guest', creatorId],
    enabled: !!user?.id && !!creatorId && !isHost,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async (): Promise<boolean> => {
      if (!user?.id || !creatorId) return false

      const { data, error } = await supabase
        .from('creator_broadofficers')
        .select('id')
        .eq('creator_id', creatorId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('[AgoraLivePage] Failed to check BroadOfficer status:', error)
        return false
      }

      return !!data
    },
  })

  const relatedVideosQuery = useQuery({
    queryKey: ['live-related-videos', creatorId],
    enabled: !!creatorId,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async (): Promise<RelatedVideo[]> => {
      if (!creatorId) return []

      const { data, error } = await supabase
        .from('videos')
        .select('id,title,video_type,mux_thumbnail_url')
        .eq('creator_id', creatorId)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(8)

      if (error) {
        console.error('[AgoraLivePage] Failed to load related videos:', error)
        return []
      }

      return (data ?? []) as RelatedVideo[]
    },
  })

   const isBroadOfficer = useMemo(() => {
     return isHost || !!broadOfficerQuery.data
   }, [isHost, broadOfficerQuery.data])

   const handleHostJoined = useCallback(() => {
     console.info('[AgoraLivePage] Host joined live session:', liveSessionId)
   }, [liveSessionId])

   const handleHostLeft = useCallback(() => {
     console.info('[AgoraLivePage] Host left live session:', liveSessionId)
   }, [liveSessionId])

   if (!cleanSessionId) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-black p-6 text-white">
          Invalid live session.
        </main>
      </>
    )
  }

  if (sessionQuery.isLoading) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-black p-6 text-white">
          Loading live...
        </main>
      </>
    )
  }

  if (!sessionQuery.data || !liveSessionId || !creatorId) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-black p-6 text-white">
          Live session unavailable or ended.
        </main>
      </>
    )
  }

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="lg:col-span-2">
            <GlobalTicker liveSessionId={liveSessionId} />
          </div>

          <section className="min-w-0 space-y-4">
             <LivePlayer
               session={sessionQuery.data!}
               isHost={isHost}
               onHostJoined={handleHostJoined}
               onHostLeft={handleHostLeft}
             />

            {isBroadOfficer && !isHost && (
              <BroadOfficerPanel creatorId={creatorId} liveSessionId={liveSessionId} />
            )}

            {!isHost && (
              <CoHostAccessGate creatorId={creatorId}>
                <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 shadow-lg shadow-blue-950/10">
                  <h3 className="mb-2 font-semibold text-blue-300">
                    VIP Co-Host Access
                  </h3>
                  <p className="mb-3 text-sm text-gray-300">
                    Request to join as a co-host during this live session.
                  </p>
                  <button
                    type="button"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black"
                  >
                    Request Co-Host Access
                  </button>
                </div>
              </CoHostAccessGate>
            )}

            <section className="rounded-xl border border-yellow-400/20 bg-zinc-950/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">
                  Previous Shorts and Movies
                </h2>
              </div>

              {relatedVideosQuery.isLoading ? (
                <p className="text-sm text-gray-400">Loading videos...</p>
              ) : relatedVideosQuery.data?.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {relatedVideosQuery.data.map((video) => (
                    <Link
                      key={video.id}
                      to={`/video/${video.id}`}
                      className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition hover:border-yellow-400/40"
                    >
                      <div className="aspect-video overflow-hidden bg-zinc-800">
                         <img
                           src={video.mux_thumbnail_url || PLACEHOLDER_THUMBNAIL_URL}
                           alt={video.title || 'Creator video'}
                           loading="lazy"
                           className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                           onError={(event) => {
                             event.currentTarget.src = PLACEHOLDER_THUMBNAIL_URL
                           }}
                         />
                      </div>

                      <div className="p-2">
                        <p className="truncate text-xs font-medium text-gray-100">
                          {video.title || 'Untitled video'}
                        </p>
                        {video.video_type && (
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">
                            {video.video_type}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  No previous public videos yet.
                </p>
              )}
            </section>
          </section>

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
            <LiveChat
              liveSessionId={liveSessionId}
              creatorId={creatorId}
              isBroadOfficer={isBroadOfficer}
            />

            <SubscriptionPanel creatorId={creatorId} />
          </aside>
        </div>
      </main>
    </>
  )
}

function IconCircle({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-xl transition hover:border-red-400/50 hover:bg-white/10 ${className}`}
    >
      {children}
    </button>
  )
}

function LiveAction({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
}) {
  return (
    <button type="button" className="flex shrink-0 flex-col items-center gap-2">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-xl transition ${
          active
            ? 'border-red-400 bg-red-600 text-white shadow-[0_0_25px_rgba(239,68,68,0.45)]'
            : 'border-white/10 bg-black/60 text-white hover:bg-white/10'
        }`}
      >
        <span className="h-5 w-5">{icon}</span>
      </span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  )
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
      <div className="mb-5 flex items-center gap-2">
        {icon}
        <h3 className="font-black">{title}</h3>
      </div>
      {children}
    </div>
  )
}