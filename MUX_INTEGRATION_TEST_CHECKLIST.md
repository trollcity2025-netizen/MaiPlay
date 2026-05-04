# Mux Integration Test Checklist

## Environment Setup
- [ ] MUX_TOKEN_ID configured in Supabase Edge Function secrets
- [ ] MUX_TOKEN_SECRET configured in Supabase Edge Function secrets  
- [ ] MUX_WEBHOOK_SECRET configured in Supabase Edge Function secrets
- [ ] SITE_URL configured for CORS origin
- [ ] SUPABASE_URL configured
- [ ] SUPABASE_SERVICE_ROLE_KEY configured

## Database Schema
- [ ] Run `supabase-mux-schema.sql` to create tables
- [ ] Verify `videos` table has Mux columns
- [ ] Verify `mux_upload_sessions` table exists
- [ ] Verify `mux_webhook_events` table exists with unique constraint
- [ ] Verify `video_views` table exists
- [ ] Verify RLS policies are enabled
- [ ] Verify indexes are created

## Edge Functions

### create-mux-upload
- [ ] Function deploys successfully
- [ ] Requires authentication
- [ ] Validates video_type (short/movie)
- [ ] Creates video row in draft state
- [ ] Calls Mux API to create direct upload
- [ ] Saves mux_upload_id to video
- [ ] Creates mux_upload_sessions record
- [ ] Returns video_id, upload_url, mux_upload_id
- [ ] Movie uploads blocked for non-unlocked creators
- [ ] Short uploads allowed for approved creators

### mux-webhook
- [ ] Function deploys successfully
- [ ] Verifies webhook signature (if implemented)
- [ ] Handles video.upload.asset_created
- [ ] Handles video.asset.ready
- [ ] Handles video.asset.errored
- [ ] Handles video.asset.deleted
- [ ] Updates videos table with mux data
- [ ] Sets upload_status to 'ready' for valid videos
- [ ] Sets upload_status to 'invalid' for duration violations
- [ ] Sets upload_status to 'errored' on errors
- [ ] Idempotent - doesn't process duplicate events
- [ ] Stores webhook events in mux_webhook_events

## Frontend Components
- [ ] VideoUploadForm renders correctly
- [ ] File selection works
- [ ] Form validation works
- [ ] Creates upload via Edge Function
- [ ] Uploads directly to Mux URL
- [ ] Progress indicator shows
- [ ] MuxVideoPlayer renders with playback_id
- [ ] HLS playback works
- [ ] Thumbnails load from Mux
- [ ] ProcessingStatusCard shows correct status
- [ ] VideoCard displays Mux thumbnails

## Duration Validation
- [ ] Shorts exceeding 1800s marked as invalid
- [ ] Movies exceeding 7200s marked as invalid
- [ ] Valid durations remain ready

## Security
- [ ] MUX_TOKEN_SECRET never exposed client-side
- [ ] Upload URL not exposed after expiration
- [ ] Only creators can create upload sessions
- [ ] Public cannot insert ready videos manually
- [ ] Public cannot set mux_* fields manually

## Feeds & Queries
- [ ] Public feeds only show visibility='public'
- [ ] Public feeds only show upload_status='ready'
- [ ] Public feeds only show moderation_status='approved'
- [ ] Public feeds require mux_playback_id IS NOT NULL
- [ ] Home, Shorts, Movies feeds filter correctly

## View Tracking
- [ ] View recorded after 5s for shorts
- [ ] View recorded after 30s for movies
- [ ] Anonymous views tracked with session_id
- [ ] Authenticated views tracked with user_id
- [ ] View count increments on public videos

## Error Handling
- [ ] Upload canceled handled
- [ ] Upload failed handled
- [ ] Mux processing failed handled
- [ ] Duration too long shows clear message
- [ ] Missing playback ID shows error state
- [ ] Moderation pending shown to creator
- [ ] Video hidden not in public feeds
- [ ] Video deleted not in public feeds
- [ ] Creator not authorized for movies handled

## Performance
- [ ] Lazy load players
- [ ] Use thumbnails before playback
- [ ] Pause videos offscreen
- [ ] Avoid multiple active players
- [ ] Virtualized/infinite feeds

## Moderation Integration
- [ ] Admins can hide videos
- [ ] Admins can hard delete (soft delete)
- [ ] Admins can mark approved
- [ ] Admins can mark rejected
- [ ] Mux status visible to mods
- [ ] Audit log written for admin actions

## Manual Tests
1. Creator uploads short video successfully
2. Movie upload blocked for non-unlocked creator
3. Mux webhook updates video status
4. Video appears in public feed after processing
5. View count increases after watch threshold
6. Invalid duration video marked invalid
7. Admin can moderate video