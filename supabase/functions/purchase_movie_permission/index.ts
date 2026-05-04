import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SB_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!
)

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID')!
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET')!

async function getPayPalAccessToken(): Promise<string> {
  const response = await fetch('https://api.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en_US',
      'Authorization': `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

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
      }
    })
  }

  try {
    // Get user from auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth' }), {
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

    const { paypalOrderId } = await req.json()

    if (!paypalOrderId) {
      return new Response(JSON.stringify({ error: 'PayPal order ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Verify PayPal payment
    const accessToken = await getPayPalAccessToken()
    const orderResponse = await fetch(`https://api.paypal.com/v2/checkout/orders/${paypalOrderId}`, {
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

    // Check payment amount (should be $5)
    const amount = parseFloat(orderData.purchase_units[0].amount.value)
    if (amount !== 5.00) {
      return new Response(JSON.stringify({ error: 'Invalid payment amount' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Calculate expiration (1 year from now)
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // Create movie permission record
    const { data: permission, error: permissionError } = await supabase
      .from('creator_movie_permissions')
      .insert({
        profile_id: profile.id,
        payment_id: paypalOrderId,
        amount_paid: amount,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (permissionError) {
      return new Response(JSON.stringify({ error: permissionError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Record platform revenue
    await supabase
      .from('platform_revenue')
      .insert({
        transaction_type: 'creator_fee',
        amount: amount,
        payment_id: paypalOrderId,
        profile_id: profile.id,
        user_id: user.id,
        description: 'Movie upload permission purchase',
      })

    return new Response(JSON.stringify({
      success: true,
      permission: permission,
      expires_at: expiresAt.toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Purchase movie permission error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})