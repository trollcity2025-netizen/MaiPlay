import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ACRCLOUD_HOST = Deno.env.get("ACRCLOUD_HOST")!
const ACRCLOUD_ACCESS_KEY = Deno.env.get("ACRCLOUD_ACCESS_KEY")!
const ACRCLOUD_ACCESS_SECRET = Deno.env.get("ACRCLOUD_ACCESS_SECRET")!
const SB_URL = Deno.env.get("SB_URL")!
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

async function generateSignature(stringToSign: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(stringToSign))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY)

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { video_id, audio_url, track_number } = await req.json()

    if (!video_id || !audio_url) {
      return new Response(JSON.stringify({ error: "Missing required fields: video_id, audio_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Fetch video
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", video_id)
      .single()

    if (videoError || !video) {
      return new Response(JSON.stringify({ error: "Video not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Verify ownership
    if (video.creator_id !== profile.id) {
      return new Response(JSON.stringify({ error: "Unauthorized: not video owner" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Download audio
    const audioResponse = await fetch(audio_url)
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`)
    }
    const audioBlob = await audioResponse.blob()

    // Prepare ACRCloud request
    const timestamp = Math.floor(Date.now() / 1000)
    const sampleBytes = audioBlob.size
    const stringToSign = `POST\n/v1/identify\n${ACRCLOUD_ACCESS_KEY}\naudio\n1\n${timestamp}`
    const signature = await generateSignature(stringToSign, ACRCLOUD_ACCESS_SECRET)

    const formData = new FormData()
    formData.append("sample", audioBlob, "audio.mp3")
    formData.append("access_key", ACRCLOUD_ACCESS_KEY)
    formData.append("sample_bytes", sampleBytes.toString())
    formData.append("timestamp", timestamp.toString())
    formData.append("signature", signature)
    formData.append("data_type", "audio")
    formData.append("signature_version", "1")

    // Send to ACRCloud
    const acrResponse = await fetch(`https://${ACRCLOUD_HOST}/v1/identify`, {
      method: "POST",
      body: formData,
    })

    let acrResult
    let copyrightStatus: string
    let fingerprintId: string | null = null
    let copyrightMatch: any = null

    if (acrResponse.ok) {
      acrResult = await acrResponse.json()
      const metadata = acrResult.metadata

      if (metadata && metadata.music && metadata.music.length > 0) {
        // Match found
        copyrightStatus = 'flagged'
        const firstMatch = metadata.music[0]
        fingerprintId = firstMatch.external_ids?.isrc || firstMatch.acrid || metadata.music[0].acrid
        copyrightMatch = acrResult
      } else {
        // No match
        copyrightStatus = 'clean'
        fingerprintId = acrResult.acrid || null
        copyrightMatch = acrResult
      }
    } else {
      // API failed
      copyrightStatus = 'review'
      copyrightMatch = { error: await acrResponse.text() }
    }

    const now = new Date().toISOString()
    let updateData: any = {
      copyright_status: copyrightStatus,
      fingerprint_id: fingerprintId,
      copyright_match: copyrightMatch,
      copyright_checked_at: now,
    }

    if (copyrightStatus === 'clean') {
      updateData.moderation_status = 'approved'
      updateData.visibility = 'public'
      updateData.upload_status = 'ready'
    } else {
      updateData.moderation_status = 'pending'
    }

    if (track_number && video.tracks) {
      // Update specific track in tracks jsonb
      const tracks = video.tracks || []
      if (tracks[track_number - 1]) {
        tracks[track_number - 1] = {
          ...tracks[track_number - 1],
          copyright_status,
          fingerprint_id: fingerprintId,
          copyright_match,
          copyright_checked_at: now,
        }
        updateData.tracks = tracks
      }
    }

    // Update video row
    const { error: updateError } = await supabase
      .from("videos")
      .update(updateData)
      .eq("id", video_id)

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true, copyright_status: copyrightStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})