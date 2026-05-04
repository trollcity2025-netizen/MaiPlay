export type VideoType = 'short' | 'movie' | 'live' | string

export interface MaiAlgorithmVideo {
  id: string
  title?: string | null
  description?: string | null
  category?: string | null
  video_type?: VideoType | null
  creator_id?: string | null
  created_at?: string | null

  view_count?: number | null
  like_count?: number | null
  comment_count?: number | null
  share_count?: number | null
  save_count?: number | null
  boost_score?: number | null
  gift_count?: number | null
  gift_coin_total?: number | null
  watch_time_seconds?: number | null
  duration_seconds?: number | null

  moderation_status?: string | null
  upload_status?: string | null
  visibility?: string | null

  profiles?: {
    id?: string | null
    username?: string | null
    display_name?: string | null
    subscriber_count?: number | null
    fan_count?: number | null
    verified?: boolean | null
  } | null
}

export interface MaiAlgorithmViewer {
  id?: string | null
  preferred_categories?: string[] | null
  followed_creator_ids?: string[] | null
  blocked_creator_ids?: string[] | null
  watched_video_ids?: string[] | null
  liked_video_ids?: string[] | null
}

export interface MaiAlgorithmOptions {
  now?: Date
  maxAgeDays?: number
  includeWatched?: boolean
  creatorDiversityPenalty?: boolean
}

const DEFAULT_OPTIONS: Required<MaiAlgorithmOptions> = {
  now: new Date(),
  maxAgeDays: 90,
  includeWatched: true,
  creatorDiversityPenalty: true,
}

function safeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function logScore(value: number): number {
  return Math.log10(Math.max(value, 0) + 1)
}

function getAgeHours(createdAt?: string | null, now = new Date()): number {
  if (!createdAt) return 9999

  const created = new Date(createdAt)

  if (Number.isNaN(created.getTime())) return 9999

  return Math.max(0, (now.getTime() - created.getTime()) / 36e5)
}

function getFreshnessScore(createdAt?: string | null, now = new Date()): number {
  const ageHours = getAgeHours(createdAt, now)

  if (ageHours <= 1) return 1
  if (ageHours <= 6) return 0.92
  if (ageHours <= 24) return 0.82
  if (ageHours <= 72) return 0.68
  if (ageHours <= 168) return 0.48
  if (ageHours <= 720) return 0.24

  return 0.08
}

function getCompletionScore(video: MaiAlgorithmVideo): number {
  const watchTime = safeNumber(video.watch_time_seconds)
  const duration = safeNumber(video.duration_seconds)

  if (!watchTime || !duration) return 0

  return clamp(watchTime / duration, 0, 1)
}

function getEngagementScore(video: MaiAlgorithmVideo): number {
  const views = safeNumber(video.view_count)

  const likes = safeNumber(video.like_count)
  const comments = safeNumber(video.comment_count)
  const shares = safeNumber(video.share_count)
  const saves = safeNumber(video.save_count)

  if (views <= 0) {
    return logScore(likes * 2 + comments * 3 + shares * 4 + saves * 5)
  }

  const weighted =
    likes * 2 +
    comments * 3 +
    shares * 5 +
    saves * 6

  return clamp(weighted / Math.max(views, 1), 0, 2)
}

function getEconomyScore(video: MaiAlgorithmVideo): number {
  const boostScore = safeNumber(video.boost_score)
  const giftCount = safeNumber(video.gift_count)
  const giftCoins = safeNumber(video.gift_coin_total)

  return (
    logScore(boostScore) * 2.2 +
    logScore(giftCount) * 1.4 +
    logScore(giftCoins) * 1.8
  )
}

function getCreatorScore(video: MaiAlgorithmVideo): number {
  const fanCount = safeNumber(video.profiles?.fan_count)
  const subscriberCount = safeNumber(video.profiles?.subscriber_count)
  const verifiedBonus = video.profiles?.verified ? 1.2 : 0

  return (
    logScore(fanCount) * 0.8 +
    logScore(subscriberCount) * 1.2 +
    verifiedBonus
  )
}

function getPersonalizationScore(
  video: MaiAlgorithmVideo,
  viewer?: MaiAlgorithmViewer | null,
): number {
  if (!viewer) return 0

  let score = 0

  const preferredCategories = viewer.preferred_categories ?? []
  const followedCreators = viewer.followed_creator_ids ?? []
  const likedVideos = viewer.liked_video_ids ?? []

  if (video.category && preferredCategories.includes(video.category)) {
    score += 3
  }

  if (video.creator_id && followedCreators.includes(video.creator_id)) {
    score += 4
  }

  if (likedVideos.includes(video.id)) {
    score += 0.5
  }

  return score
}

function getQualityGate(video: MaiAlgorithmVideo): boolean {
  if (video.visibility && video.visibility !== 'public') return false
  if (video.upload_status && video.upload_status !== 'ready') return false
  if (video.moderation_status && video.moderation_status !== 'approved') return false

  return true
}

function shouldHideForViewer(
  video: MaiAlgorithmVideo,
  viewer?: MaiAlgorithmViewer | null,
  includeWatched = true,
): boolean {
  if (!viewer) return false

  if (video.creator_id && viewer.blocked_creator_ids?.includes(video.creator_id)) {
    return true
  }

  if (!includeWatched && viewer.watched_video_ids?.includes(video.id)) {
    return true
  }

  return false
}

export function scoreMaiVideo(
  video: MaiAlgorithmVideo,
  viewer?: MaiAlgorithmViewer | null,
  options?: MaiAlgorithmOptions,
): number {
  const finalOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  if (!getQualityGate(video)) return -Infinity

  if (shouldHideForViewer(video, viewer, finalOptions.includeWatched)) {
    return -Infinity
  }

  const freshnessScore = getFreshnessScore(video.created_at, finalOptions.now)
  const engagementScore = getEngagementScore(video)
  const economyScore = getEconomyScore(video)
  const creatorScore = getCreatorScore(video)
  const personalizationScore = getPersonalizationScore(video, viewer)
  const completionScore = getCompletionScore(video)

  const viewScore = logScore(safeNumber(video.view_count))

  const typeBoost =
    video.video_type === 'short'
      ? 1.15
      : video.video_type === 'movie'
        ? 1.05
        : video.video_type === 'live'
          ? 1.25
          : 1

  const rawScore =
    freshnessScore * 18 +
    engagementScore * 22 +
    economyScore * 16 +
    creatorScore * 8 +
    personalizationScore * 14 +
    completionScore * 10 +
    viewScore * 4

  return rawScore * typeBoost
}

export function rankMaiVideos(
  videos: MaiAlgorithmVideo[],
  viewer?: MaiAlgorithmViewer | null,
  options?: MaiAlgorithmOptions,
): MaiAlgorithmVideo[] {
  const finalOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  const creatorSeenCount = new Map<string, number>()

  return videos
    .map((video) => {
      let score = scoreMaiVideo(video, viewer, finalOptions)

      if (
        finalOptions.creatorDiversityPenalty &&
        video.creator_id &&
        Number.isFinite(score)
      ) {
        const seenCount = creatorSeenCount.get(video.creator_id) ?? 0
        score -= seenCount * 8
        creatorSeenCount.set(video.creator_id, seenCount + 1)
      }

      return {
        video,
        score,
      }
    })
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.video)
}

export function getMaiSpotlightVideos(
  videos: MaiAlgorithmVideo[],
  viewer?: MaiAlgorithmViewer | null,
  limit = 5,
): MaiAlgorithmVideo[] {
  return rankMaiVideos(videos, viewer, {
    includeWatched: true,
    creatorDiversityPenalty: true,
    maxAgeDays: 30,
  }).slice(0, limit)
}

export function getTrendingMaiVideos(
  videos: MaiAlgorithmVideo[],
  viewer?: MaiAlgorithmViewer | null,
  limit = 20,
): MaiAlgorithmVideo[] {
  return rankMaiVideos(videos, viewer, {
    includeWatched: true,
    creatorDiversityPenalty: true,
    maxAgeDays: 14,
  }).slice(0, limit)
}

export function getForYouMaiVideos(
  videos: MaiAlgorithmVideo[],
  viewer?: MaiAlgorithmViewer | null,
  limit = 50,
): MaiAlgorithmVideo[] {
  return rankMaiVideos(videos, viewer, {
    includeWatched: false,
    creatorDiversityPenalty: true,
    maxAgeDays: 90,
  }).slice(0, limit)
}