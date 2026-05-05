import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SB_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!
)

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID')!
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET')!

async function getPayPalAccessToken(): Promise<string> {
  const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en_US',
      'Authorization': `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`PayPal auth failed: ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

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

    // Get profile (to get profile.id)
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

    const { orderId } = await req.json()

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Verify PayPal payment
    const accessToken = await getPayPalAccessToken()
    const orderResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!orderResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to verify PayPal payment' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const orderData = await orderResponse.json()

    if (orderData.status !== 'COMPLETED') {
      return new Response(JSON.stringify({ error: 'Payment not completed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Verify currency is USD
    const currency = orderData.purchase_units[0].amount.currency_code
    if (currency !== 'USD') {
      return new Response(JSON.stringify({ error: `Invalid currency: ${currency}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Verify amount is $5 (VIP perk price)
    const amount = parseFloat(orderData.purchase_units[0].amount.value)
    if (Math.abs(amount - 5.00) > 0.01) {
      return new Response(JSON.stringify({ error: `Invalid payment amount. Expected $5.00, got $${amount}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create perk
    const VIP_PERK_ID = 'mai_vip_offline_monthly'
    const VIP_PERK_NAME = 'MaiPlay VIP + Offline'
    const PERK_DURATION_DAYS = 30

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + PERK_DURATION_DAYS)

    const { error: perkError } = await supabase.from('user_perks').insert({
      user_id: profile.id,
      perk_key: VIP_PERK_ID,
      perk_name: VIP_PERK_NAME,
      status: 'active',
      source: 'paypal',
      price_usd: amount,
      coin_price: null,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      metadata: {
        orderId,
        paypalStatus: orderData.status,
        offline_downloads: true,
        vip_creator_dm: true,
        creator_dm_limit: 5,
        creator_payout_usd: 4,
        user_price_usd: 5,
      },
    })

    if (perkError) {
      console.error('Perk insert error:', perkError)
      return new Response(JSON.stringify({ error: 'Failed to activate perk' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'VIP + Offline activated for 30 days',
      perk: VIP_PERK_NAME,
      expires_at: expiresAt.toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('verify_paypal_perk error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
