import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SB_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  try {
    // Get user from auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '').trim()

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const COIN_PRICE = 1000
    const PERK_KEY = 'mai_vip_offline_monthly'
    const PERK_NAME = 'MaiPlay VIP + Offline'
    const DURATION_DAYS = 30
    const DM_LIMIT = 5
    const CREATOR_PAYOUT_USD = 4

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('mai_wallets')
      .select('id, mai_coins')
      .eq('user_id', profile.id)
      .single()

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: 'Wallet not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (wallet.mai_coins < COIN_PRICE) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient coins', 
        required: COIN_PRICE, 
        balance: wallet.mai_coins 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Deduct coins from wallet
    const { error: walletUpdateError } = await supabase
      .from('mai_wallets')
      .update({
        mai_coins: wallet.mai_coins - COIN_PRICE,
        lifetime_spent: wallet.lifetime_spent + COIN_PRICE,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    if (walletUpdateError) {
      console.error('Wallet update error:', walletUpdateError)
      return new Response(JSON.stringify({ error: 'Failed to deduct coins' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create perk
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + DURATION_DAYS)

    const { error: perkError } = await supabase.from('user_perks').insert({
      user_id: profile.id,
      perk_key: PERK_KEY,
      perk_name: PERK_NAME,
      status: 'active',
      source: 'coins',
      price_usd: null,
      coin_price: COIN_PRICE,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      metadata: {
        offline_downloads: true,
        vip_creator_dm: true,
        creator_dm_limit: DM_LIMIT,
        creator_payout_usd: CREATOR_PAYOUT_USD,
        user_price_usd: 5.00, // equivalent USD value
      },
    })

    if (perkError) {
      console.error('Perk insert error:', perkError)
      return new Response(JSON.stringify({ error: 'Failed to activate perk' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Record transaction
    const { error: txError } = await supabase
      .from('mai_coin_transactions')
      .insert({
        user_id: profile.id,
        amount: -COIN_PRICE,
        transaction_type: 'perk_purchase',
        source: 'coins',
        metadata: {
          perkKey: PERK_KEY,
          perkName: PERK_NAME,
        },
      })

    if (txError) {
      console.error('Transaction insert error:', txError)
      // Non-fatal - perk was still created
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'VIP + Offline activated for 30 days',
      perk: PERK_NAME,
      expires_at: expiresAt.toISOString(),
      coins_spent: COIN_PRICE,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('purchase_perk_with_coins error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
