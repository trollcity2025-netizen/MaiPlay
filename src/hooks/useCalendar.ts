import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface CalendarEvent {
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
  creator?: {
    username: string
    display_name: string
  }
}

export function useCalendarEvents(month?: Date) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['calendar-events', month?.toISOString()],
    queryFn: async () => {
      if (!month) return []
      
      const start = new Date(month.getFullYear(), month.getMonth(), 1)
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0)
      
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
    enabled: !!month,
  })

  const createMutation = useMutation({
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
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (event: Partial<CalendarEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(event)
        .eq('id', event.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })

  return {
    events: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    createEvent: createMutation.mutate,
    updateEvent: updateMutation.mutate,
    deleteEvent: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useUpcomingEvents(limit = 10) {
  return useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`*`)
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true })
        .limit(limit)

      if (error) throw error
      return data as CalendarEvent[]
    },
  })
}