import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SB_URL') ?? '',
      Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''
    )

    const { sessionId } = await req.json()

    if (!sessionId) {
      throw new Error('sessionId is required')
    }

    // Generate unique Agora channel name (skip if no Agora credentials)
    const agoraChannel = `live-${sessionId}`
    const agoraAppId = Deno.env.get('AGORA_APP_ID')

    // Create Mux live stream (skip if no Mux credentials)
    let muxLivePlaybackId = null
    const muxTokenId = Deno.env.get('MUX_TOKEN_ID')
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')

    if (muxTokenId && muxTokenSecret) {
      const muxResponse = await fetch('https://api.mux.com/video/v1/live-streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`
        },
        body: JSON.stringify({
          playback_policy: ['public'],
          new_asset_settings: {
            playback_policy: ['public']
          }
        })
      })

      if (!muxResponse.ok) {
        console.warn('Failed to create Mux live stream, continuing without Mux')
      } else {
        const muxData = await muxResponse.json()
        muxLivePlaybackId = muxData.data.playback_ids.find((id: any) => id.policy === 'public')?.id
      }
    } else {
      console.warn('Mux credentials not found, skipping Mux stream creation')
    }

    // Update the session with Agora channel and Mux playback ID
    const updateData: any = {}
    if (agoraChannel) updateData.agora_channel = agoraChannel
    if (muxLivePlaybackId) updateData.mux_live_playback_id = muxLivePlaybackId

    const { error } = await supabaseClient
      .from('creator_live_sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})