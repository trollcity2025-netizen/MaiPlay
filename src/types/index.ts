// User Types
export interface User {
  id: string
  email: string
  username: string
  created_at: string
  updated_at: string
}

// Profile Types
export interface Profile {
  id: string
  user_id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  subscriber_count: number
  total_views: number
  short_views: number
  is_creator: boolean
  creator_level: 'bronze' | 'silver' | 'gold'
  can_upload_movies: boolean
  unlock_type: 'community' | 'growth' | 'paid' | null
  unlock_unlocked_at: string | null
  role: 'user' | 'creator' | 'moderator' | 'admin'
  moderation_status: 'active' | 'flagged' | 'suspended' | 'banned'
  created_at: string
}

// Video Types
export type VideoType = 'short' | 'movie' | 'music' | 'music_video'
export type VideoCategory = 'music' | 'cars' | 'business' | 'gaming' | 'education' | 'entertainment' | 'music_video' | 'music_album'
export type VideoVisibility = 'draft' | 'public' | 'private' | 'hidden' | 'deleted'
export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'rejected' | 'deleted'
export type UploadStatus = 'created' | 'uploading' | 'processing' | 'ready' | 'errored' | 'invalid' | 'deleted'

// New Content Types
export type TrackType = 'instrumental' | 'full' | null
export type AlbumType = 'single' | 'album'

export interface Track {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: 'music' | 'cars' | 'business' | 'gaming' | 'education' | 'entertainment' | null
  audio_url: string
  cover_art_url: string | null
  track_type: TrackType
  view_count: number
  like_count: number
  comment_count: number
  gift_count: number
  boost_score: number
  moderation_status: ModerationStatus
  upload_status: UploadStatus
  visibility: VideoVisibility
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Album {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: 'music_album' | null
  cover_art_url: string | null
  view_count: number
  like_count: number
  comment_count: number
  gift_count: number
  boost_score: number
  moderation_status: ModerationStatus
  upload_status: UploadStatus
  created_at: string
  updated_at: string
}

export interface AlbumTrack {
  id: string
  album_id: string
  track_id: string
  track_number: number
  created_at: string
}

export interface Short {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: 'music' | 'cars' | 'business' | 'gaming' | 'education' | 'entertainment' | null
  // Mux fields
  mux_upload_id: string | null
  mux_asset_id: string | null
  mux_playback_id: string | null
  mux_status: string | null
  mux_duration_seconds: number | null
  mux_aspect_ratio: string | null
  mux_thumbnail_url: string | null
  mux_preview_url: string | null
  mux_stream_url: string | null
  // Engagement metrics
  view_count: number
  like_count: number
  comment_count: number
  gift_count: number
  boost_score: number
  // Timestamps
  moderation_status: ModerationStatus
  upload_status: UploadStatus
  created_at: string
  updated_at: string
  video_type?: string
  profiles?: Profile
}

export interface Movie {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: 'music' | 'cars' | 'business' | 'gaming' | 'education' | 'entertainment' | null
  // Mux fields
  mux_upload_id: string | null
  mux_asset_id: string | null
  mux_playback_id: string | null
  mux_status: string | null
  mux_duration_seconds: number | null
  mux_aspect_ratio: string | null
  mux_thumbnail_url: string | null
  mux_preview_url: string | null
  mux_stream_url: string | null
  // Engagement metrics
  view_count: number
  like_count: number
  comment_count: number
  gift_count: number
  boost_score: number
  // Timestamps
  moderation_status: ModerationStatus
  upload_status: UploadStatus
  created_at: string
  updated_at: string
  video_type?: string
  profiles?: Profile
}

export interface Live {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: 'music' | 'cars' | 'business' | 'gaming' | 'education' | 'entertainment' | null
  agora_channel: string | null
  mux_live_playback_id: string | null
  scheduled_start_at: string
  scheduled_duration_minutes: number
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  started_at: string | null
  ended_at: string | null
  // Engagement metrics
  view_count: number
  like_count: number
  comment_count: number
  gift_count: number
  boost_score: number
  // Timestamps
  moderation_status: ModerationStatus
  upload_status: UploadStatus
  created_at: string
  updated_at: string
}

export interface Video {
  id: string
  creator_id: string
  title: string
  description: string | null
  category: VideoCategory | null
  video_type: VideoType
  visibility: VideoVisibility
  moderation_status: ModerationStatus
  upload_status: UploadStatus
  // Mux fields (for shorts, movies, music_videos)
  mux_upload_id: string | null
  mux_asset_id: string | null
  mux_playback_id: string | null
  mux_status: string | null
  mux_duration_seconds: number | null
  mux_aspect_ratio: string | null
  mux_thumbnail_url: string | null
  mux_preview_url: string | null
  mux_stream_url: string | null
  // Storage fields (for music tracks and cover images)
  audio_url: string | null
  file_url: string | null
  cover_url: string | null
  album_cover_url: string | null
  thumbnail_url: string | null
  // Engagement metrics
  view_count: number
  like_count: number
  comment_count: number
  gift_count: number
  boost_score: number
  // Timestamps
  created_at: string
  updated_at: string
  published_at: string | null
  deleted_at: string | null
  profiles?: Profile
}

export interface MuxUploadSession {
  id: string
  user_id: string
  video_id: string | null
  mux_upload_id: string
  upload_url: string
  status: string
  intended_video_type: VideoType
  created_at: string
  expires_at: string | null
  completed_at: string | null
}

export interface VideoView {
  id: string
  video_id: string
  viewer_user_id: string | null
  anonymous_session_id: string | null
  playback_id: string | null
  watch_seconds: number
  completed: boolean
  percent_watched: number | null
  source: string | null
  created_at: string
}

export interface VideoGift {
  id: string
  video_id: string
  sender_id: string
  receiver_id: string
  amount: number
  message: string | null
  created_at: string
}

export interface VideoBoost {
  id: string
  video_id: string
  user_id: string
  amount: number
  expires_at: string
  created_at: string
}

// Subscription Types
export interface SubscriptionTier {
  id: string
  name: string
  price_coins: number
  perks: {
    messages?: boolean
    badges?: string[]
    exclusive_content?: boolean
    early_access?: boolean
  }
}

export interface Subscription {
  id: string
  subscriber_id: string
  creator_id: string
  created_at: string
}

// Coin Types
export type CoinTransactionType = 'purchase' | 'gift' | 'boost' | 'subscription'
export interface CoinTransaction {
  id: string
  user_id: string
  amount: number
  type: CoinTransactionType
  reference_id: string | null
  created_at: string
}

// Earning Types
export interface CreatorEarning {
  id: string
  creator_id: string
  amount: number
  source: 'ads' | 'gifts' | 'subscription'
  reference_id: string | null
  created_at: string
}

// Payout Types
export interface Payout {
  id: string
  creator_id: string
  paypal_email: string
  amount: number
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}

// Comment Types
export interface VideoComment {
  id: string
  video_id: string
  user_id: string
  content: string
  timestamp: number
  created_at: string
  profiles?: Profile
}

// Room Types
export interface RoomMessage {
  id: string
  room_id: string
  user_id: string
  content: string
  created_at: string
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[]
  nextCursor?: string
  hasMore: boolean
}