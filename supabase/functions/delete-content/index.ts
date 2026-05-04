import { serve } from 'https://deno.land/std@0.176.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * HARD DELETE CONTENT SERVICE
 * 
 * Permanently removes video/music content and all associated assets.
 * 
 * Deletion process:
 * 1. Authenticate user (admin/moderator only)
 * 2. Retrieve content metadata from Supabase
 * 3. Delete Mux asset (if mux_asset_id exists - for shorts/movies/music_videos)
 * 4. Delete all Supabase storage files:
 *    - audio_url (music files)
 *    - file_url (music files)
 *    - cover_url (thumbnails, covers)
 *    - album_cover_url (album covers)
 *    - mux_thumbnail_url (Mux-generated thumbnails)
 * 5. Delete upload sessions (for videos)
 * 6. Delete content row from database
 * 
 * STORAGE ARCHITECTURE:
 * - Shorts/movies/music_videos: Stored in Mux (identified by mux_asset_id)
 * - Music tracks: Stored in "music-files" bucket (identified by audio_url/file_url)
 * - Thumbnails/covers: Stored in various buckets (identified by *_url fields)
 */

const SB_URL = Deno.env.get('SB_URL')
const SB_SERVICE_ROLE_KEY = Deno.env.get('SB_SERVICE_ROLE_KEY')
const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID')
const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET')

if (!SB_URL || !SB_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase service role credentials')
}

const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

function parseStoragePath(url: string) {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname
    const signPrefix = '/storage/v1/object/sign/'
    const publicPrefix = '/storage/v1/object/public/'

    const extract = (prefix: string) => {
      const stripped = path.slice(prefix.length)
      const [bucket, ...rest] = stripped.split('/')
      return { bucket, path: rest.join('/') }
    }

    if (path.startsWith(signPrefix)) return extract(signPrefix)
    if (path.startsWith(publicPrefix)) return extract(publicPrefix)
    return null
  } catch {
    return null
  }
}

async function deleteSupabaseObject(url?: string) {
  if (!url) return
  const parsed = parseStoragePath(url)
  if (!parsed) return
  const { error } = await supabase.storage
    .from(parsed.bucket)
    .remove([parsed.path])
  if (error) {
    console.warn('Unable to delete storage object:', error.message)
  }
}

async function deleteAllStorageUrls(item: any) {
  // Delete all storage URLs that might exist on the item
  const storageFields = [
    'audio_url',
    'file_url',
    'cover_url',
    'album_cover_url',
    'thumbnail_url',
    'mux_thumbnail_url',
    'mux_preview_url',
  ]

  for (const field of storageFields) {
    if (item[field]) {
      await deleteSupabaseObject(item[field])
    }
  }
}

async function deleteMuxAsset(assetId: string) {
  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) return
  const auth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)
  const response = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text()
    console.warn('Mux asset delete failed', response.status, body)
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    return new Response(JSON.stringify({ error: 'Unable to verify user' }), { status: 401, headers: CORS_HEADERS })
  }

  const userId = authData.user.id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'Unable to load profile' }), { status: 403, headers: CORS_HEADERS })
  }

  if (!['admin', 'moderator'].includes(profile.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS_HEADERS })
  }

  const body = await req.json().catch(() => null)
  const contentType = body?.contentType as string
  const contentId = body?.contentId as string

  if (!contentType || !contentId) {
    return new Response(JSON.stringify({ error: 'Missing contentType or contentId' }), { status: 400, headers: CORS_HEADERS })
  }

  const tableName = contentType === 'music' ? 'music' : 'videos'
  const { data: item, error: itemError } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', contentId)
    .maybeSingle()

  if (itemError || !item) {
    return new Response(JSON.stringify({ error: 'Content not found' }), { status: 404, headers: CORS_HEADERS })
  }

  // Delete Mux asset if this is a video (shorts, movies, music_videos)
  if (item.mux_asset_id) {
    await deleteMuxAsset(item.mux_asset_id)
  }

  // Delete all storage URLs associated with this content
  // This handles music files, cover images, thumbnails, etc.
  await deleteAllStorageUrls(item)

  // Clean up related upload sessions for videos
  if (tableName === 'videos') {
    await supabase.from('mux_upload_sessions').delete().eq('video_id', contentId)
  }

  // Delete the content row from the database
  const { error: deleteError } = await supabase.from(tableName).delete().eq('id', contentId)
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: CORS_HEADERS })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS_HEADERS })
})
