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

  const { requestId } = await req.json()

  // Get payout request details
  const { data: payout, error } = await supabase
    .from('pending_payout_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (error || !payout) {
    return new Response(JSON.stringify({ error: 'Payout request not found' }), { status: 400 })
  }

  // Call PayPal Payouts API
  const accessToken = await getPayPalAccessToken()
  const paypalResponse = await fetch('https://api.paypal.com/v1/payments/payouts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: requestId,
        email_subject: 'MaiPlay Payout'
      },
      items: [{
        recipient_type: 'EMAIL',
        amount: {
          value: payout.requested_usd.toString(),
          currency: 'USD'
        },
        receiver: payout.paypal_email,
        note: 'MaiPlay creator payout'
      }]
    })
  })

  if (paypalResponse.ok) {
    // Update status to paid
    await supabase
      .from('pending_payout_requests')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', requestId)

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } else {
    return new Response(JSON.stringify({ error: 'PayPal payout failed' }), { status: 500 })
  }
})