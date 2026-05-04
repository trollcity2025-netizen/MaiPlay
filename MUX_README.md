# MaiPlay.cloud Mux Video Infrastructure

## Overview

This implementation provides complete Mux video infrastructure for MaiPlay, handling uploads, storage, encoding, thumbnails, previews, CDN playback, and analytics.

## Architecture

### Video Flow
1. Authenticated creator starts upload from MaiPlay.
2. Frontend calls Supabase Edge Function: `create-mux-upload`.
3. Edge Function creates Mux Direct Upload URL.
4. Frontend uploads video file directly to Mux.
5. Mux processes/transcodes the video.
6. Mux webhook calls Supabase Edge Function: `mux-webhook`.
7. Supabase saves/updates video metadata.
8. All playback uses Mux playback_id via Mux CDN.

## Files Created

### Database Schema
- **`supabase-mux-schema.sql`** - Complete SQL schema with:
  - Updated `videos` table with Mux fields
  - `mux_upload_sessions` table for tracking uploads
  - `mux_webhook_events` table for idempotency
  - `video_views` table for analytics
  - `video_gifts` and `video_boosts` tables
  - `admin_audit_log` table
  - RLS policies for all tables
  - Helper functions for video feeds

### Edge Functions
- **`supabase/functions/create-mux-upload/index.ts`** - Creates Mux direct upload URL
- **`supabase/functions/mux-webhook/index.ts`** - Processes Mux webhooks

### Types
- Updated `src/types/index.ts` with Mux-related types

### Components
- **`src/components/video/VideoUploadForm.tsx`** - Upload form with Mux direct upload
- **`src/components/video/MuxVideoPlayer.tsx`** - Video player using Mux HLS
- **`src/components/video/MuxPlayer.tsx`** - Alternative player with view tracking
- **`src/components/video/ProcessingStatusCard.tsx`** - Shows video processing status
- **`src/components/video/VideoCard.tsx`** - Updated to use Mux thumbnails

### Pages
- **`src/pages/UploadVideoPage.tsx`** - Upload page
- Updated `src/pages/VideoPlayerPage.tsx` - Player page with Mux player
- Updated `src/pages/creator/CreatorDashboard.tsx` - Shows creator videos

### Hooks
- **`src/hooks/useVideos.ts`** - Video-related hooks for creators
- Updated `src/hooks/useApi.ts` - Updated video queries for public feeds

## Environment Variables Required

```bash
# Mux API Credentials
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=your_webhook_secret

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Site URL for CORS
SITE_URL=https://your-site.com
```

## Deployment

### 1. Deploy Database Schema
Run `supabase-mux-schema.sql` in your Supabase SQL editor.

### 2. Deploy Edge Functions
```bash
supabase functions deploy create-mux-upload
supabase functions deploy mux-webhook
```

### 3. Configure Mux Webhook
Add webhook URL in Mux dashboard:
```
https://your-project.supabase.co/functions/v1/mux-webhook
```

### 4. Set Secrets
```bash
supabase secrets set MUX_TOKEN_ID=your_token_id
supabase secrets set MUX_TOKEN_SECRET=your_token_secret
supabase secrets set MUX_WEBHOOK_SECRET=your_webhook_secret
supabase secrets set SITE_URL=https://your-site.com
```

## Video Types

### Shorts
- Max duration: 1800 seconds (30 minutes)
- Default for approved creators

### Movies
- Max duration: 7200 seconds (2 hours)
- Requires unlock via:
  - Community gifting
  - Growth milestone
  - Paid fast-track

## Duration Validation
- Shorts exceeding 1800s are marked as `invalid`
- Movies exceeding 7200s are marked as `invalid`
- Validation happens in webhook handler

## Security
- MUX_TOKEN_SECRET never exposed client-side
- Upload URLs expire after 24 hours
- Row-level security enforced on all tables
- Public feeds only show approved, ready videos

## Testing
See `MUX_INTEGRATION_TEST_CHECKLIST.md` for comprehensive test checklist.