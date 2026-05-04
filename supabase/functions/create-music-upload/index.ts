import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SB_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const { title, description, category, uploadMode, trackType, filePath, additionalFiles, coverPath } = await req.json()

  // Get user from auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No auth' }), { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid auth' }), { status: 401 })
  }

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 400 })
  }

  // Insert video record
  const { data: video, error: insertError } = await supabase
    .from('videos')
    .insert({
      title,
      description,
      category,
      video_type: 'short',
      type: category, // e.g., 'music'
      creator_id: profile.id,
      video_url: filePath,
      moderation_status: 'pending'
    })
    .select()
    .single()

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 400 })
  }

  return new Response(JSON.stringify({ videoId: video.id }), { status: 200 })
})