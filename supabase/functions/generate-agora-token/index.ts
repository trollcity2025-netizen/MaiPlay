import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { RtcTokenBuilder, RtcRole } from 'https://esm.sh/agora-token@2.0.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { channelName, uid } = await req.json()

    if (!channelName) {
      throw new Error('channelName is required')
    }

    const agoraAppId = Deno.env.get('AGORA_APP_ID')
    const agoraAppCertificate = Deno.env.get('AGORA_APP_CERTIFICATE')

    if (!agoraAppId || !agoraAppCertificate) {
      throw new Error('Agora credentials not configured')
    }

    // Generate token with publisher role (for both host and audience)
    // Token expires in 24 hours
    const expirationTimeInSeconds = Math.floor(Date.now() / 1000) + 24 * 3600

    // Use buildTokenWithAccount for string UIDs (hosts), buildTokenWithUid for numeric (audience)
    let token: string
    if (uid) {
      token = RtcTokenBuilder.buildTokenWithAccount(
        agoraAppId,
        agoraAppCertificate,
        channelName,
        uid as string,
        RtcRole.PUBLISHER,
        expirationTimeInSeconds
      )
    } else {
      token = RtcTokenBuilder.buildTokenWithUid(
        agoraAppId,
        agoraAppCertificate,
        channelName,
        0, // anonymous uid
        RtcRole.PUBLISHER,
        expirationTimeInSeconds
      )
    }

    return new Response(
      JSON.stringify({ token }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error generating Agora token:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})