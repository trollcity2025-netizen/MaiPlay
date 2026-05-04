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
      return new Response(JSON.stringify({
        approved: true,
        message: 'Already a creator'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get application
    const { data: application, error: appError } = await supabase
      .from('creator_applications')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (appError || !application) {
      return new Response(JSON.stringify({
        approved: false,
        message: 'No application found'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // If auto-approved, just return approved
    if (application.application_type === 'auto_approved' && application.status === 'approved') {
      return new Response(JSON.stringify({
        approved: true,
        message: 'Auto-approved creator'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Calculate current stats
    const daysActive = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))

    // Count fans
    const { count: fansCount } = await supabase
      .from('fan_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', profile.id)

    // Count shorts and views
    const { data: videos } = await supabase
      .from('videos')
      .select('video_type, view_count')
      .eq('creator_id', profile.id)
      .eq('visibility', 'public')
      .eq('upload_status', 'ready')
      .eq('moderation_status', 'approved')

    const shortsCount = videos?.filter(v => v.video_type === 'short').length || 0
    const totalViews = videos?.reduce((sum, v) => sum + (v.view_count || 0), 0) || 0

    // Update application with current stats
    await supabase
      .from('creator_applications')
      .update({
        requirement_days_active: daysActive,
        requirement_fans_count: fansCount || 0,
        requirement_shorts_count: shortsCount,
        requirement_total_views: totalViews,
        updated_at: new Date().toISOString(),
      })
      .eq('id', application.id)

    // Check requirements
    const meetsRequirements =
      daysActive >= 3 &&
      (fansCount || 0) >= 100 &&
      shortsCount >= 4 &&
      totalViews >= 800

    if (meetsRequirements && application.status === 'pending') {
      // Auto-approve
      await supabase
        .from('creator_applications')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', application.id)

      await supabase
        .from('profiles')
        .update({ is_creator: true })
        .eq('id', profile.id)

      return new Response(JSON.stringify({
        approved: true,
        message: 'Congratulations! You have been approved as a creator.',
        requirements: {
          days_active: daysActive,
          fans_count: fansCount || 0,
          shorts_count: shortsCount,
          total_views: totalViews,
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      approved: false,
      message: 'Requirements not yet met',
      requirements: {
        days_active: { current: daysActive, required: 3 },
        fans_count: { current: fansCount || 0, required: 100 },
        shorts_count: { current: shortsCount, required: 4 },
        total_views: { current: totalViews, required: 800 },
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Check creator approval error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})