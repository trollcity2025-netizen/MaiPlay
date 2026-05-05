import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SB_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!
)

const PAYPAL_BASE_URL = 'https://api-m.paypal.com'

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID')!
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET')!

async function getPayPalAccessToken(): Promise<string> {
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
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
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const token = authHeader.replace('Bearer ', '').trim()

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const { orderId, packId } = await req.json()

    if (!orderId || !packId) {
      return new Response(JSON.stringify({ error: 'orderId and packId are required' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Verify PayPal payment
    const accessToken = await getPayPalAccessToken()
    const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!orderResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to verify PayPal payment' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const orderData = await orderResponse.json()

    if (orderData.status !== 'COMPLETED') {
      return new Response(JSON.stringify({ error: 'Payment not completed' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Verify currency is USD
    const currency = orderData.purchase_units[0].amount.currency_code
    if (currency !== 'USD') {
      return new Response(JSON.stringify({ error: `Invalid currency: ${currency}` }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Extract amount (float)
    const amount = parseFloat(orderData.purchase_units[0].amount.value)

    // Verify pack exists and amount matches
    const PACKS: Record<string, { coins: number; priceUsd: number; name: string; tier: string }> = {
      'Core-1': { coins: 1, priceUsd: 0.01, name: 'Tiny Tip', tier: 'Core' },
      'Core-100': { coins: 100, priceUsd: 0.99, name: 'Starter Pack', tier: 'Core' },
      'Core-550': { coins: 550, priceUsd: 4.99, name: 'Starter Pack', tier: 'Core' },
      'Core-1200': { coins: 1200, priceUsd: 9.99, name: 'Starter Pack', tier: 'Core' },
      'Growth-2500': { coins: 2500, priceUsd: 19.99, name: 'Growth Pack', tier: 'Growth' },
      'Growth-6500': { coins: 6500, priceUsd: 49.99, name: 'Growth Pack', tier: 'Growth' },
      'Growth-14000': { coins: 14000, priceUsd: 99.99, name: 'Growth Pack', tier: 'Growth' },
      'Power-35000': { coins: 35000, priceUsd: 199.99, name: 'Power Pack', tier: 'Power' },
      'Power-75000': { coins: 75000, priceUsd: 399.99, name: 'Power Pack', tier: 'Power' },
      'Power-150000': { coins: 150000, priceUsd: 799.99, name: 'Power Pack', tier: 'Power' },
      'MAI Elite-500000': { coins: 500000, priceUsd: 1999.99, name: 'MAI Elite Pack', tier: 'MAI Elite' },
      'MAI Elite-1000000': { coins: 1000000, priceUsd: 3999.99, name: 'MAI Elite Pack', tier: 'MAI Elite' },
    }

    const pack = PACKS[packId]
    if (!pack) {
      return new Response(JSON.stringify({ error: 'Invalid coin pack' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Verify amount matches expected price (allow small floating tolerance)
    const expectedAmount = pack.priceUsd
    if (Math.abs(amount - expectedAmount) > 0.01) {
      return new Response(JSON.stringify({ error: `Payment amount mismatch. Expected $${expectedAmount}, got $${amount}` }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Record transaction (insert)
    const { error: txError } = await supabase
      .from('mai_coin_transactions')
      .insert({
        user_id: user.id,
        amount: pack.coins,
        transaction_type: 'purchase',
        source: 'paypal',
        metadata: {
          orderId,
          packId,
          packName: pack.name,
          tier: pack.tier,
          coins: pack.coins,
          paypalStatus: orderData.status,
        },
      })

    if (txError) {
      console.error('Transaction insert error:', txError)
      return new Response(JSON.stringify({ error: 'Failed to record transaction' }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Update or create wallet
    const { data: wallet, error: walletError } = await supabase
      .from('mai_wallets')
      .select('id, mai_coins, lifetime_earned, lifetime_spent')
      .eq('user_id', user.id)
      .maybeSingle()

    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Wallet lookup error:', walletError)
    }

    if (wallet) {
      const currentCoins = wallet.mai_coins ?? 0
      const currentLifetimeEarned = wallet.lifetime_earned ?? 0
      const { error: updateError } = await supabase
        .from('mai_wallets')
        .update({
          mai_coins: currentCoins + pack.coins,
          lifetime_earned: currentLifetimeEarned + pack.coins,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id)

      if (updateError) {
        console.error('Wallet update error:', updateError)
        return new Response(JSON.stringify({ error: 'Failed to update wallet' }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${pack.coins} MAI coins credited`,
        coins: pack.coins,
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    } else {
      const { error: createError } = await supabase.from('mai_wallets').insert({
        user_id: user.id,
        mai_coins: pack.coins,
        lifetime_earned: pack.coins,
        lifetime_spent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (createError) {
        console.error('Wallet creation error:', createError)
        return new Response(JSON.stringify({ error: 'Failed to create wallet' }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        })
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${pack.coins} MAI coins credited`,
        coins: pack.coins,
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
  } catch (error) {
    console.error('verify_paypal_payment error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})
