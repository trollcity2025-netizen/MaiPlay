import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SB_URL = Deno.env.get("SB_URL")
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")

if (!SB_URL || !SB_SERVICE_ROLE_KEY) {
  throw new Error("Missing SB_URL or SB_SERVICE_ROLE_KEY")
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  try {
    const authHeader = req.headers.get("Authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401)
    }

    const token = authHeader.replace("Bearer ", "").trim()

    const admin = createClient(SB_URL, SB_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token)

    if (authError || !user) {
      console.error("claim_daily_login_reward auth failed:", authError)
      return json(
        {
          error: "Invalid token",
          details: authError?.message ?? null,
        },
        401
      )
    }

    const { data, error } = await admin.rpc("claim_mai_daily_login_reward", {
      p_user_id: user.id,
    })

    if (error) {
      console.error("claim_mai_daily_login_reward RPC failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })

      return json(
        {
          error: "Failed to claim daily login reward",
          details: error.message,
          code: error.code,
        },
        500
      )
    }

    return json({
      success: true,
      userId: user.id,
      data,
    })
  } catch (error) {
    console.error("claim_daily_login_reward fatal error:", error)

    return json(
      {
        error: "Unexpected server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    )
  }
})