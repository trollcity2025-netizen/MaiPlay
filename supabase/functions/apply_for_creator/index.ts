import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SB_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEYS')!
)

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
      .select('id, is_creator')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if already a creator
    if (profile.is_creator) {
      return new Response(JSON.stringify({ error: 'Already a creator' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if already has a pending application
    const { data: existingApp } = await supabase
      .from('creator_applications')
      .select('id, status')
      .eq('user_id', user.id)
      .single()

    if (existingApp && existingApp.status === 'pending') {
      return new Response(JSON.stringify({ error: 'Application already pending' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Count current approved creators
    const { count: approvedCount } = await supabase
      .from('creator_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')

    const isAutoApprove = (approvedCount || 0) < 10

    // Create application
    const { data: application, error: appError } = await supabase
      .from('creator_applications')
      .insert({
        user_id: user.id,
        profile_id: profile.id,
        application_type: isAutoApprove ? 'auto_approved' : 'standard',
        status: isAutoApprove ? 'approved' : 'pending',
        approved_at: isAutoApprove ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (appError) {
      return new Response(JSON.stringify({ error: appError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // If auto-approved, update profile
    if (isAutoApprove) {
      await supabase
        .from('profiles')
        .update({ is_creator: true })
        .eq('id', profile.id)
    }

    return new Response(JSON.stringify({
      success: true,
      application: application,
      auto_approved: isAutoApprove
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Apply for creator error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})