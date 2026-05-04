import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID")
const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET")
const SB_URL = Deno.env.get("SB_URL")
const SB_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Check Mux credentials
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return new Response(JSON.stringify({ error: "Video service configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const muxBasicAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)

    const supabase = createClient(SB_URL!, SB_SERVICE_ROLE_KEY!)
    
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

    const requestBody = await req.json().catch(() => ({}))
    const { title, description, category, video_type, video_id } = requestBody

    if (!title || !video_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!["short", "movie", "music_video"].includes(video_type)) {
      return new Response(JSON.stringify({ error: "Invalid video type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get profile for creator_id and check permissions
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

    // Check movie upload permissions from mai_accounts
    const { data: account } = await supabase
      .from("mai_accounts")
      .select("can_upload_movies")
      .eq("user_id", user.id)
      .single()

    if (video_type === "movie" && !account?.can_upload_movies) {
      return new Response(JSON.stringify({
        error: "Movie upload not unlocked. Unlock through community gifting, growth milestone, or paid fast-track."
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let video
    if (video_id) {
      const { data: existingVideo, error: existingVideoError } = await supabase
        .from("videos")
        .select("id, creator_id")
        .eq("id", video_id)
        .single()

      if (existingVideoError || !existingVideo) {
        return new Response(JSON.stringify({ error: "Video not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      if (existingVideo.creator_id !== profile.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      video = existingVideo
    } else {
       const { data: createdVideo, error: videoError } = await supabase
         .from("videos")
         .insert({
           creator_id: profile.id,
           title,
           description,
           category,
           video_type,
           upload_status: "created",
           moderation_status: "pending", // Requires admin review
           visibility: "private", // Hidden until approved
         })
         .select()
         .single()

      if (videoError) {
        return new Response(JSON.stringify({ error: videoError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      video = createdVideo
    }

    const muxResponse = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${muxBasicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cors_origin: "*",
        new_asset_settings: {
          playback_policy: ["public"]
        },
      }),
    })

    if (!muxResponse.ok) {
      const error = await muxResponse.text()
      return new Response(JSON.stringify({ error: `Mux error: ${error}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const muxData = await muxResponse.json()
    const upload = muxData.data

    await supabase
      .from("videos")
      .update({
        mux_upload_id: upload.id,
        // Content is already approved and public from insert
      })
      .eq("id", video.id)

    await supabase
      .from("mux_upload_sessions")
      .insert({
        user_id: profile.id,
        video_id: video.id,
        mux_upload_id: upload.id,
        upload_url: upload.url,
        intended_video_type: video_type,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

    return new Response(JSON.stringify({
      video_id: video.id,
      upload_url: upload.url,
      mux_upload_id: upload.id,
      videoId: video.id,
      uploadUrl: upload.url,
      uploadId: upload.id,
    }), {
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