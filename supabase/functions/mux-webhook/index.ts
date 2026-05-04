import { serve } from "https://deno.land/std@0.176.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * MUX WEBHOOK HANDLER
 * 
 * Receives webhook events from Mux when video uploads complete.
 * 
 * Processes events:
 * - video.upload.asset_created: When Mux creates an asset from an upload
 * - video.asset.ready: When the asset finishes processing and is ready to play
 * 
 * Updates the videos table with:
 * - mux_asset_id: The unique Mux asset identifier
 * - mux_playback_id: The playback ID for the Mux player
 * - upload_status: Changed to 'ready' when asset is ready
 */

const SB_URL = Deno.env.get("SB_URL")
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS")
const MUX_WEBHOOK_SECRET = Deno.env.get("MUX_WEBHOOK_SECRET")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, mux-signature",
}

function extractMuxSignature(signature: string | null): string | null {
  if (!signature) return null
  const lower = signature.toLowerCase()
  const v1Match = lower.match(/v1=([0-9a-f]+)/)
  if (v1Match) return v1Match[1]
  return signature.trim()
}

async function verifyMuxSignature(body: string, signature: string | null): Promise<boolean> {
  const extractedSignature = extractMuxSignature(signature)
  if (!extractedSignature || !MUX_WEBHOOK_SECRET) {
    console.warn("Mux signature verification skipped: missing signature or secret")
    return true // Allow in development if secret not configured
  }

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(MUX_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA256" },
      false,
      ["verify"]
    )

    const expectedSignature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body)
    )

    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    return extractedSignature.toLowerCase() === expectedHex.toLowerCase()
  } catch (error) {
    console.error("Mux signature verification error:", error)
    return false
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }

  try {
    if (!SB_URL || !SB_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Read raw body for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get("mux-signature") ?? req.headers.get("Mux-Signature")

    // Verify Mux signature
    const isValid = await verifyMuxSignature(rawBody, signature)
    if (!isValid) {
      console.warn("Invalid Mux signature")
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const body = JSON.parse(rawBody)
    const eventType = body.type
    const eventData = body.data?.object ?? body.data

    if (!eventType || !eventData) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

     // Handle upload asset created event
     if (eventType === "video.upload.asset_created" || eventType === "upload.asset_created") {
       const uploadId = eventData.upload_id
       const assetId = eventData.asset_id

       if (!uploadId || !assetId) {
         return new Response(
           JSON.stringify({ error: "Missing upload_id or asset_id" }),
           { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         )
       }

       // Find video/short by mux_upload_id across all content tables
       const { data: video, error: findError } = await supabase
         .from("videos")
         .select("id, video_type")
         .eq("mux_upload_id", uploadId)
         .maybeSingle()

       let foundRecord = video
       let tableName: 'videos' | 'shorts' | 'movies' = 'videos'
       let recordId = video?.id
       let recordType = video?.video_type

       if (!foundRecord) {
         // Check shorts table
         const { data: short } = await supabase
           .from("shorts")
           .select("id")
           .eq("mux_upload_id", uploadId)
           .maybeSingle()

         if (short) {
           foundRecord = short
           tableName = 'shorts'
           recordId = short.id
           recordType = 'short'
         } else {
           // Check movies table
           const { data: movie } = await supabase
             .from("movies")
             .select("id")
             .eq("mux_upload_id", uploadId)
             .maybeSingle()

           if (movie) {
             foundRecord = movie
             tableName = 'movies'
             recordId = movie.id
             recordType = 'movie'
           }
         }
       }

       if (!foundRecord) {
         console.warn(`Content not found for upload_id: ${uploadId}`)
         return new Response(
           JSON.stringify({ ok: true, message: "Content not found, skipping" }),
           { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         )
       }

       // Update content with mux_asset_id
       const { error: updateError } = await supabase
         .from(tableName)
         .update({ mux_asset_id: assetId })
         .eq("id", recordId)

       if (updateError) {
         console.error("Failed to update content with asset_id:", updateError)
         return new Response(
           JSON.stringify({ error: updateError.message }),
           { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         )
       }

       console.log(`Asset created: ${assetId} for ${tableName}: ${recordId}`)
     }

     // Handle asset ready event
     if (eventType === "video.asset.ready" || eventType === "asset.ready") {
       const assetId = eventData.id
       const playbackId = eventData.playback_ids?.[0]?.id

       if (!assetId) {
         return new Response(
           JSON.stringify({ error: "Missing asset_id" }),
           { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         )
       }

       // Find content by mux_asset_id across all content tables
       const { data: video, error: findError } = await supabase
         .from("videos")
         .select("id, video_type")
         .eq("mux_asset_id", assetId)
         .maybeSingle()

       let foundRecord = video
       let tableName: 'videos' | 'shorts' | 'movies' = 'videos'
       let recordId = video?.id

       if (!foundRecord) {
         // Check shorts table
         const { data: short } = await supabase
           .from("shorts")
           .select("id")
           .eq("mux_asset_id", assetId)
           .maybeSingle()

         if (short) {
           foundRecord = short
           tableName = 'shorts'
           recordId = short.id
         } else {
           // Check movies table
           const { data: movie } = await supabase
             .from("movies")
             .select("id")
             .eq("mux_asset_id", assetId)
             .maybeSingle()

           if (movie) {
             foundRecord = movie
             tableName = 'movies'
             recordId = movie.id
           }
         }
       }

       if (!foundRecord) {
         console.warn(`Content not found for asset_id: ${assetId}`)
         return new Response(
           JSON.stringify({ ok: true, message: "Content not found, skipping" }),
           { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         )
       }

       // Update content with playback_id and ready status
       const updateData: any = {
         upload_status: "ready",
         moderation_status: "approved", // Auto-approve clean uploads
         visibility: "public", // Make publicly visible after processing
       }

       if (playbackId) {
         updateData.mux_playback_id = playbackId
       }

       const { error: updateError } = await supabase
         .from(tableName)
         .update(updateData)
         .eq("id", recordId)

       if (updateError) {
         console.error("Failed to update content with playback_id:", updateError)
         return new Response(
           JSON.stringify({ error: updateError.message }),
           { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         )
       }

       console.log(`Asset ready: ${assetId} with playback_id: ${playbackId} for ${tableName}: ${recordId}`)
     }

    // Always return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ ok: true, processed: eventType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Webhook handler error:", error)
    return new Response(
      JSON.stringify({
        error: "webhook_handler_failed",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
