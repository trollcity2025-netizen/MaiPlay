import { createClient } from '@supabase/supabase-js'
import { Mux } from 'npm:@mux/mux-node'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mux token should be set as MUX_TOKEN_SECRET in Supabase function secrets
const muxToken = process.env.MUX_TOKEN_SECRET || process.env.VITE_MUX_TOKEN_SECRET

if (!muxToken) {
  throw new Error('MUX_TOKEN_SECRET environment variable is required')
}

const mux = new Mux({
  token: muxToken,
})

export const runtime = 'edge'

export default async (request: Request): Promise<Response> => {
  const { videoId } = await request.json()

  if (!videoId) {
    return new Response(JSON.stringify({ error: 'videoId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // 1. Get the video record from database
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('mux_playback_id, mux_asset_id')
      .eq('id', videoId)
      .single()

    if (fetchError || !video) {
      return new Response(JSON.stringify({ error: 'Video not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Delete from Mux (both asset and playback)
    const deletions = []
    if (video.mux_asset_id) {
      deletions.push(
        mux.Assets.destroy(video.mux_asset_id).catch((err: Error) => {
          console.warn(`Failed to delete asset ${video.mux_asset_id}:`, err.message)
        })
      )
    }
    if (video.mux_playback_id) {
      deletions.push(
        mux.Playbacks.remove(video.mux_playback_id).catch((err: Error) => {
          console.warn(`Failed to delete playback ${video.mux_playback_id}:`, err.message)
        })
      )
    }
    await Promise.all(deletions)

    // 3. Delete from database
    const { error: deleteError } = await supabase.from('videos').delete().eq('id', videoId)

    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ success: true, message: 'Video deleted from Mux and database' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error deleting video:', error)
    return new Response(JSON.stringify({ error: 'Failed to delete video' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
