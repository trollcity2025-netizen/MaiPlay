import { useState, useMemo } from 'react'
import { Calendar as CalendarIcon, Clock, Video, Music, Film, Plus, ChevronLeft, ChevronRight, Radio, Trash2, Edit2 } from 'lucide-react'
import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'

interface CalendarEvent {
  id: string
  creator_id: string
  content_type: 'live' | 'short' | 'movie' | 'track' | 'album'
  content_id?: string
  title: string
  description?: string
  scheduled_date: string
  scheduled_time?: string
  scheduled_at?: string
  duration_minutes?: number
  status: string
  visibility: string
}

const contentTypeConfig: Record<CalendarEvent['content_type'], { label: string; icon: any; color: string; border: string }> = {
  live: { label: 'Live Stream', icon: Radio, color: 'from-red-500/20 to-yellow-500/20', border: 'border-red-500/30' },
  short: { label: 'Short', icon: Video, color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30' },
  movie: { label: 'Movie', icon: Film, color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' },
  track: { label: 'Track', icon: Music, color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30' },
  album: { label: 'Album', icon: Music, color: 'from-indigo-500/20 to-violet-500/20', border: 'border-indigo-500/30' },
}

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const queryClient = useQueryClient()

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', currentMonth.toISOString()],
    queryFn: async () => {
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`*`, { count: 'exact' })
        .gte('scheduled_date', start.toISOString().split('T')[0])
        .lte('scheduled_date', end.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true })

      if (error) throw error
      return data as CalendarEvent[]
    },
  })

  const createEventMutation = useMutation({
    mutationFn: async (event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(event)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      setIsDialogOpen(false)
      setEditingEvent(null)
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

  const startDate = new Date(monthStart)
  startDate.setDate(startDate.getDate() - monthStart.getDay())

  const endDate = new Date(monthEnd)
  endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()))

  const calendarDays = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const normalizedDate = new Date(currentDate)
    normalizedDate.setHours(0, 0, 0, 0)

    const isCurrentMonth = currentDate.getMonth() === currentMonth.getMonth()
    const isToday = normalizedDate.getTime() === today.getTime()
    const isFuture = normalizedDate.getTime() >= today.getTime()
    const dayEvents = events.filter((e: CalendarEvent) => e.scheduled_date === dateStr)

    calendarDays.push({
      date: new Date(currentDate),
      dateStr,
      isCurrentMonth,
      isToday,
      isFuture,
      events: dayEvents,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleAddEvent = (date: Date) => {
    setSelectedDate(date)
    setEditingEvent(null)
    setIsDialogOpen(true)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event)
    setSelectedDate(new Date(event.scheduled_date))
    setIsDialogOpen(true)
  }

  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter((e: CalendarEvent) => new Date(e.scheduled_date) >= now || (new Date(e.scheduled_date).getTime() === now.getTime() && e.scheduled_time))
      .sort((a: CalendarEvent, b: CalendarEvent) => {
        const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time || '00:00'}`)
        const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time || '00:00'}`)
        return dateA.getTime() - dateB.getTime()
      })
      .slice(0, 10)
  }, [events])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050000] text-white">
      <BackgroundFX />
      <AppHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[2.5rem] border border-yellow-400/20 bg-black/50 p-6 shadow-2xl shadow-red-950/40 backdrop-blur-xl md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
                <CalendarIcon className="h-4 w-4" />
                Content Calendar
              </div>

              <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-[-0.04em] md:text-7xl">
                Schedule Your{' '}
                <span className="bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                  Drops
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
                Plan and announce your upcoming live streams, shorts, movies, tracks, and albums.
                Your followers will see scheduled content and get notified when it goes live.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[430px]">
              <StatCard icon={CalendarIcon} label="Scheduled" value={events.length.toString()} />
              <StatCard icon={Video} label="Content Types" value="5" />
              <StatCard icon={Clock} label="This Month" value={events.filter((e: CalendarEvent) => e.scheduled_date.startsWith(currentMonth.toISOString().slice(0, 7))).length.toString()} />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-[-0.02em]">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevMonth}
                  className="h-9 w-9 rounded-xl border-yellow-300/30 bg-black/40 p-0 text-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextMonth}
                  className="h-9 w-9 rounded-xl border-yellow-300/30 bg-black/40 p-0 text-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-[2rem] border border-white/10 bg-black/45 p-4 shadow-2xl shadow-yellow-950/10 backdrop-blur-xl">
              <div className="grid grid-cols-7 gap-1.5">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-yellow-200/70">
                    {day}
                  </div>
                ))}

                {calendarDays.map(day => {
                  const eventCount = day.events.length
                  const hasEvents = eventCount > 0

                  return (
                    <div
                      key={day.dateStr}
                      className={cn(
                        'relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border text-sm font-bold transition-all',
                        day.isCurrentMonth
                          ? 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'
                          : 'border-transparent text-white/20',
                        hasEvents && 'border-yellow-300/50 bg-yellow-300/15 text-yellow-200 shadow-md shadow-yellow-500/10',
                        day.isToday && 'z-10 border-yellow-300 bg-yellow-300/20 text-yellow-100 ring-2 ring-yellow-300/60 shadow-lg shadow-yellow-500/30',
                      )}
                      onClick={() => handleAddEvent(day.date)}
                    >
                      <span>{day.date.getDate()}</span>
                      {hasEvents && (
                        <div className="absolute bottom-1 flex gap-0.5">
                          {day.events.slice(0, 3).map(event => {
                            const config = contentTypeConfig[event.content_type]
                            return (
                              <div
                                key={event.id}
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full',
                                  config.border.replace('border-', 'bg-').replace('/30', '/60')
                                )}
                              />
                            )
                          })}
                          {eventCount > 3 && <span className="text-[8px] text-yellow-300">+{eventCount - 3}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {selectedDate && (
              <div className="mt-8">
                <h3 className="mb-4 text-xl font-black uppercase tracking-[-0.02em]">
                  Events for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </h3>

                {events.filter((e: CalendarEvent) => e.scheduled_date === selectedDate.toISOString().split('T')[0]).length > 0 ? (
                  <div className="space-y-3">
                    {events
                      .filter((e: CalendarEvent) => e.scheduled_date === selectedDate.toISOString().split('T')[0])
                      .map(event => {
                        const config = contentTypeConfig[event.content_type]
                        const Icon = config.icon
                        return (
                          <div key={event.id} className={cn('flex items-center justify-between rounded-2xl border p-4 backdrop-blur-xl', config.color, config.border)}>
                            <div className="flex items-center gap-4">
                              <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border', config.border, 'bg-black/30')}>
                                <Icon className="h-6 w-6 text-yellow-300" />
                              </div>
                              <div>
                                <p className="font-black">{event.title}</p>
                                <p className="text-sm text-zinc-400">{config.label} • {event.scheduled_time || 'All day'}</p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditEvent(event)} className="text-yellow-300 hover:text-yellow-200">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteEventMutation.mutate(event.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/45 p-6 text-center">
                    <p className="text-zinc-400">No events scheduled for this date.</p>
                    <Button onClick={() => setIsDialogOpen(true)} className="mt-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-red-500 font-black text-black hover:from-yellow-300 hover:to-red-400">
                      <Plus className="mr-2 h-4 w-4" />
                      Schedule New Content
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <GlossyPanel title="Upcoming Releases">
              {upcomingEvents.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {upcomingEvents.map(event => {
                    const config = contentTypeConfig[event.content_type]
                    const Icon = config.icon
                    return (
                      <div key={event.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <Icon className="h-5 w-5 text-yellow-300 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{event.title}</p>
                          <p className="text-xs text-zinc-400">{event.scheduled_date} {event.scheduled_time && `at ${event.scheduled_time}`}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">No upcoming releases scheduled.</p>
              )}
            </GlossyPanel>

            <GlossyPanel title="Content Types">
              <div className="space-y-2">
                {Object.entries(contentTypeConfig).map(([type, config]) => {
                  const Icon = config.icon
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-yellow-300" />
                      <span className="font-bold">{config.label}</span>
                    </div>
                  )
                })}
              </div>
            </GlossyPanel>
          </aside>
        </section>
      </main>

      <ScheduleEventDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedDate={selectedDate}
        editingEvent={editingEvent}
        onSubmit={(data) => {
          if (editingEvent) {
            createEventMutation.mutate({ ...data, id: editingEvent.id } as any)
          } else {
            createEventMutation.mutate(data)
          }
        }}
      />
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
      <Icon className="h-5 w-5 text-yellow-300" />
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  )
}

function GlossyPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/45 p-5 shadow-2xl shadow-yellow-950/10 backdrop-blur-2xl">
      <h3 className="mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[0.28em] text-yellow-300">
        <CalendarIcon className="h-4 w-4" />
        {title}
      </h3>
      {children}
    </section>
  )
}

interface ScheduleEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date | null
  editingEvent?: CalendarEvent | null
  onSubmit: (data: any) => void
}

function ScheduleEventDialog({
  open,
  onOpenChange,
  selectedDate,
  editingEvent,
  onSubmit,
}: ScheduleEventDialogProps) {
  const [title, setTitle] = useState(editingEvent?.title || '')
  const [description, setDescription] = useState(editingEvent?.description || '')
  const [contentType, setContentType] = useState<CalendarEvent['content_type']>(editingEvent?.content_type || 'live')
  const [scheduledTime, setScheduledTime] = useState(editingEvent?.scheduled_time || '')
  const [durationMinutes, setDurationMinutes] = useState(editingEvent?.duration_minutes?.toString() || '60')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    onSubmit({
      title,
      description,
      content_type: contentType,
      scheduled_date: selectedDate?.toISOString().split('T')[0],
      scheduled_time: scheduledTime,
      duration_minutes: parseInt(durationMinutes),
      visibility: 'followers',
      status: 'scheduled',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-yellow-400/30 bg-black text-white">
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-wide">
            {editingEvent ? 'Edit Scheduled Content' : 'Schedule New Content'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-300">Date</label>
            <Input
              type="date"
              value={selectedDate?.toISOString().split('T')[0] || ''}
              readOnly
              className="rounded-xl border border-yellow-400/20 bg-black/40 px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-300">Content Type *</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as CalendarEvent['content_type'])}
              className="w-full rounded-xl border border-yellow-400/20 bg-black/40 px-4 py-3 text-white"
            >
              {Object.entries(contentTypeConfig).map(([type, config]) => (
                <option key={type} value={type}>{config.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-300">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title"
              required
              className="rounded-xl border border-yellow-400/20 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-300">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="rounded-xl border border-yellow-400/20 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-300">Time (Optional)</label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="rounded-xl border border-yellow-400/20 bg-black/40 px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-300">Duration (minutes)</label>
            <Input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              min="1"
              max="1440"
              className="rounded-xl border border-yellow-400/20 bg-black/40 px-4 py-3 text-white"
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-red-500 font-black text-black hover:from-yellow-300 hover:to-red-400"
            >
              {editingEvent ? 'Update Schedule' : 'Schedule Content'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BackgroundFX() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-48 left-1/2 h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-red-700/25 blur-[120px]" />
      <div className="absolute top-32 -left-32 h-[520px] w-[520px] rounded-full bg-yellow-500/15 blur-[110px]" />
      <div className="absolute bottom-0 right-0 h-[650px] w-[650px] rounded-full bg-red-950/50 blur-[130px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,230,120,0.12),transparent_32%),linear-gradient(135deg,rgba(120,0,0,0.42),transparent_45%),linear-gradient(180deg,rgba(0,0,0,0.15),#050000_80%)]" />
    </div>
  )
}