import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SB_URL = Deno.env.get("SB_URL")!
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEYS")
const CRON_SECRET = Deno.env.get("CRON_SECRET")

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } })
  }

  if (CRON_SECRET) {
    const auth = req.headers.get("Authorization")
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })
    }
  }

  const admin = createClient(SB_URL, SB_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  try {
    const now = new Date()
    const graceCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    const { data: due, error } = await admin
      .from("user_subscriptions")
      .select("id, user_id, creator_id, tier_id, end_date, auto_renew, status")
      .in("status", ["active", "grace"])
      .eq("auto_renew", true)
      .lte("end_date", now.toISOString())
      .limit(1000)

    if (error) throw error

    let renewed = 0
    let grace = 0
    let expired = 0

    for (const sub of due ?? []) {
      const { data: tier } = await admin
        .from("creator_subscription_tiers")
        .select("price_coins, is_active")
        .eq("id", sub.tier_id)
        .single()

      if (!tier?.is_active) {
        await admin.from("user_subscriptions").update({ status: "expired", updated_at: now.toISOString() }).eq("id", sub.id)
        expired += 1
        continue
      }

      const { data: wallet } = await admin
        .from("mai_wallets")
        .select("mai_coins, lifetime_spent")
        .eq("user_id", sub.user_id)
        .single()

      if (wallet && wallet.mai_coins >= tier.price_coins) {
        const nextEnd = new Date(new Date(sub.end_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

        const { error: wErr } = await admin.from("mai_wallets").update({
          mai_coins: wallet.mai_coins - tier.price_coins,
          lifetime_spent: (wallet.lifetime_spent ?? 0) + tier.price_coins,
          updated_at: now.toISOString(),
        }).eq("user_id", sub.user_id).eq("mai_coins", wallet.mai_coins)

        if (wErr) continue

        await admin.from("subscription_transactions").insert({
          user_id: sub.user_id,
          creator_id: sub.creator_id,
          tier_id: sub.tier_id,
          coins_spent: tier.price_coins,
          renewal_cycle_started_at: now.toISOString(),
        })

        await admin.from("mai_coin_transactions").insert({
          user_id: sub.user_id,
          amount: -tier.price_coins,
          transaction_type: "subscription_renewal",
          source: "subscription",
          metadata: { creator_id: sub.creator_id, tier_id: sub.tier_id, renewal: true },
        })

        await admin.from("user_subscriptions").update({
          end_date: nextEnd,
          status: "active",
          updated_at: now.toISOString(),
        }).eq("id", sub.id)

        renewed += 1
      } else {
        if (sub.end_date > graceCutoff) {
          await admin.from("user_subscriptions").update({ status: "grace", updated_at: now.toISOString() }).eq("id", sub.id)
          grace += 1
        } else {
          await admin.from("user_subscriptions").update({ status: "expired", updated_at: now.toISOString() }).eq("id", sub.id)
          expired += 1
        }
      }
    }

    return new Response(JSON.stringify({ success: true, renewed, grace, expired }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
