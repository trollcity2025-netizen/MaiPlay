import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { 
  Track, 
  Album, 
  AlbumTrack, 
  Short, 
  Movie, 
  Live, 
  VideoView, 
  VideoGift, 
  VideoBoost 
} from '../types'

// ========================================
// TRACKS (Public & Creator)
// ========================================
export const useTracks = (limit?: number) => {
  return useQuery<Track[]>({
    queryKey: ['tracks', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*, profiles:creator_id(*)')
        .eq('visibility', 'public')
        .eq('upload_status', 'ready')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(limit || 20)

      if (error) throw error
      return data ?? []
    },
    enabled: true
  })
}

export const useCreatorTracks = () => {
  return useQuery<Track[]>({
    queryKey: ['creator-tracks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: true
  })
}

// ========================================
// ALBUMS (Public & Creator)
// ========================================
export const usePublicAlbums = (limit?: number) => {
  return useQuery<Album[]>({
    queryKey: ['albums', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('albums')
        .select('*, profiles:creator_id(*)')
        .eq('visibility', 'public')
        .eq('upload_status', 'ready')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(limit || 20)

      if (error) throw error
      return data ?? []
    },
    enabled: true
  })
}

export const useCreatorAlbums = () => {
  return useQuery<Album[]>({
    queryKey: ['creator-albums'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: true
  })
}

export const useAlbumTracks = (albumId: string) => {
  return useQuery<AlbumTrack[]>({
    queryKey: ['album-tracks', albumId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_tracks')
        .select(`
          *,
          track:tracks(*)
        `)
        .eq('album_id', albumId)
        .order('track_number', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    enabled: !!albumId
  })
}

// ========================================
// SHORTS (Public & Creator)
// ========================================
export const useShorts = () => {
  return useQuery<Short[]>({
    queryKey: ['shorts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shorts')
        .select('*, profiles:creator_id(*)')
        .eq('visibility', 'public')
        .eq('upload_status', 'ready')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: true
  })
}

export const useCreatorShorts = () => {
  return useQuery<Short[]>({
    queryKey: ['creator-shorts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('shorts')
        .select('*')
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: true
  })
}

// ========================================
// MOVIES (Public & Creator)
// ========================================
export const useMovies = () => {
  return useQuery<Movie[]>({
    queryKey: ['movies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*, profiles:creator_id(*)')
        .eq('visibility', 'public')
        .eq('upload_status', 'ready')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: true
  })
}

export const useCreatorMovies = () => {
  return useQuery<Movie[]>({
    queryKey: ['creator-movies'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: true
  })
}

// ========================================
// LIVES (Public & Creator)
// ========================================
export const useLives = () => {
  return useQuery<Live[]>({
    queryKey: ['lives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lives')
        .select('*, profiles:creator_id(*)')
        .eq('status', 'live')
        .order('scheduled_start_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: true
  })
}

export const useUpcomingLives = () => {
  return useQuery<Live[]>({
    queryKey: ['upcoming-lives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lives')
        .select('*, profiles:creator_id(*)')
        .eq('status', 'scheduled')
        .order('scheduled_start_at', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    enabled: true
  })
}

export const useCreatorLives = () => {
  return useQuery<Live[]>({
    queryKey: ['creator-lives'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('lives')
        .select('*')
        .eq('creator_id', profile.id)
        .order('scheduled_start_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: true
  })
}

// ========================================
// SINGLE ITEM QUERIES
// ========================================
export const useTrack = (trackId: string) => {
  return useQuery<Track | null>({
    queryKey: ['track', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*, profiles:creator_id(*)')
        .eq('id', trackId)
        .single()

      if (error) throw error
      return data as Track
    },
    enabled: !!trackId
  })
}

export const useAlbum = (albumId: string) => {
  return useQuery<Album | null>({
    queryKey: ['album', albumId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('albums')
        .select('*, profiles:creator_id(*)')
        .eq('id', albumId)
        .single()

      if (error) throw error
      return data as Album
    },
    enabled: !!albumId
  })
}

export const useShort = (shortId: string) => {
  return useQuery<Short | null>({
    queryKey: ['short', shortId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shorts')
        .select('*, profiles:creator_id(*)')
        .eq('id', shortId)
        .single()

      if (error) throw error
      return data as Short
    },
    enabled: !!shortId
  })
}

export const useMovie = (movieId: string) => {
  return useQuery<Movie | null>({
    queryKey: ['movie', movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*, profiles:creator_id(*)')
        .eq('id', movieId)
        .single()

      if (error) throw error
      return data as Movie
    },
    enabled: !!movieId
  })
}

export const useLive = (liveId: string) => {
  return useQuery<Live | null>({
    queryKey: ['live', liveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lives')
        .select('*, profiles:creator_id(*)')
        .eq('id', liveId)
        .single()

      if (error) throw error
      return data as Live
    },
    enabled: !!liveId
  })
}

// ========================================
// VIDEO VIEWS, GIFTS, BOOSTS (for videos table)
// ========================================
export const useVideoViews = (videoId: string) => {
  return useQuery<VideoView[]>({
    queryKey: ['video-views', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_views')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!videoId
  })
}

export const useVideoGifts = (videoId: string) => {
  return useQuery<VideoGift[]>({
    queryKey: ['video-gifts', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_gifts')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!videoId
  })
}

export const useVideoBoosts = (videoId: string) => {
  return useQuery<VideoBoost[]>({
    queryKey: ['video-boosts', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_boosts')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!videoId
  })
}

// ========================================
// DELETE MUTATIONS
// ========================================
export const useDeleteTrack = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (trackId: string) => {
      const { error } = await supabase
        .from('tracks')
        .update({
          visibility: 'deleted',
          moderation_status: 'deleted',
          deleted_at: new Date().toISOString(),
        } as any)
        .eq('id', trackId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-tracks'] })
    }
  })
}

export const useDeleteAlbum = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (albumId: string) => {
      const { error } = await supabase
        .from('albums')
        .update({
          visibility: 'deleted',
          moderation_status: 'deleted',
          deleted_at: new Date().toISOString(),
        } as any)
        .eq('id', albumId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-albums'] })
    }
  })
}

export const useDeleteShort = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (shortId: string) => {
      const { error } = await supabase
        .from('shorts')
        .update({
          visibility: 'deleted',
          moderation_status: 'deleted',
          deleted_at: new Date().toISOString(),
        } as any)
        .eq('id', shortId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-shorts'] })
    }
  })
}

export const useDeleteMovie = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (movieId: string) => {
      const { error } = await supabase
        .from('movies')
        .update({
          visibility: 'deleted',
          moderation_status: 'deleted',
          deleted_at: new Date().toISOString(),
        } as any)
        .eq('id', movieId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-movies'] })
    }
  })
}

export const useDeleteLive = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (liveId: string) => {
      const { error } = await supabase
        .from('lives')
        .update({
          status: 'cancelled',
        } as any)
        .eq('id', liveId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-lives'] })
    }
  })
}

// ========================================
// LEGACY VIDEO HOOKS (for shorts/movies still using videos table if needed)
// ========================================
export const useVideo = (videoId: string) => {
  return useQuery({
    queryKey: ['video', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*, profiles:creator_id(*)')
        .eq('id', videoId)
        .single()

      if (error) throw error
      return data as any // Video type with profiles
    },
    enabled: !!videoId
  })
}

export const usePublishVideo = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from('videos')
        .update({
          visibility: 'public',
          published_at: new Date().toISOString(),
        })
        .eq('id', videoId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-videos'] })
    }
  })
}

export const useDeleteVideo = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from('videos')
        .update({
          visibility: 'deleted',
          moderation_status: 'deleted',
          deleted_at: new Date().toISOString(),
        })
        .eq('id', videoId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-videos'] })
    }
  })
}
