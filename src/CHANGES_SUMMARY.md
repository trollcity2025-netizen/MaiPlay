# Fix Summary: Admin Dashboard Query Fixes + Placeholder Images

## Issues Fixed

1. **Invalid Supabase Embed Syntax**: Queries using `auth_user:user_id(email)` which is not valid (user_id is a column, not a relationship)
2. **Missing Placeholder Images**: All placeholder image files were missing from `/public/` causing 404 errors
3. **Incorrect Product References**: Queries referenced non-existent `products` table and `stores!inner` syntax

## Changes Made

### 1. New File: `src/config/placeholders.ts`
- Created inline SVG data URLs for all placeholder images
- `PLACEHOLDER_THUMBNAIL` - Gray gradient with "Thumbnail" label (400x225)
- `PLACEHOLDER_MUSIC` - Purple/red gradient with music note (400x400)
- `PLACEHOLDER_AVATAR` - Blue/purple gradient circle with "U" initial (100x100)
- `DEFAULT_AVATAR` - Red/yellow gradient with "MAI" text (100x100)

### 2. Fixed Admin Dashboard Queries (src/pages/admin/AdminDashboardPage.tsx)

#### Query 1: All Users
**Before:** `.select('id, username, is_creator, role, created_at, auth_user:user_id(email)')`
**After:** `.select(`id, username, is_creator, role, created_at, user_id`)`

#### Query 2: All Creators
**Before:** `.select('id, username, is_creator, role, created_at, auth_user:user_id(email)')`
**After:** `.select(`id, username, is_creator, role, created_at, user_id`)`

#### Query 3: Pending Payouts
**Before:** `.select('*, mai_accounts!creator_id(username)')`
**After:** `.select(`*, creator:mai_accounts!creator_id (username, display_name, avatar_url)`)`

#### Query 4: Moderators
**Before:** `.select('id, username, role, created_at, auth_user:user_id(email)')`
**After:** `.select(`id, username, role, created_at, user_id`)`

#### Query 5: Pending Videos
**Before:** `.select('*, mai_accounts!creator_id(username)')`
**After:** `.select(`*, creator:mai_accounts!videos_creator_id_fkey (id, username, display_name, avatar_url)`)`

#### Query 6: Pending Products
**Before:** `.from('products').select('*, stores!inner(name, mai_accounts!inner(username))')`
**After:** `.from('creator_merch_items').select(`*, creator:mai_accounts!creator_merch_items_creator_id_fkey (username, display_name, avatar_url)`)`

#### Query 7: Pending Creator Applications
**Before:** `.select('*, mai_accounts!inner(username, auth_user:user_id(email))')`
**After:** `.select(`*, mai_accounts!creator_applications_user_id_fkey (username, display_name, avatar_url, user_id)`)`

### 3. Updated Display Code (AdminDashboardPage.tsx)
- Users table: `u.auth_user?.email` → `u.user_id`
- Creators table: `c.auth_user?.email` → `c.user_id`
- Moderators table: `m.auth_user?.email` → `m.user_id`
- Pending videos: `video.mai_accounts?.username` → `video.creator?.username`
- Pending products: Changed to use `creator_merch_items` table
  - `product.stores?.name` → `product.creator?.username`
  - `product.price` → `product.price || product.price_amount`
- Pending creator apps: `app.mai_accounts?.auth_user?.email` → `app.mai_accounts?.user_id`
- Pending payouts: `payout.mai_accounts?.username` → `payout.creator?.username`

### 4. Placeholder Image Updates - All Files

Replaced all `/placeholder-*.jpg` references with inline SVG data URLs:

#### Components
- `src/components/video/VideoCard.tsx` - Uses `PLACEHOLDER_THUMBNAIL`

#### Pages
- `src/pages/HomePage.tsx` - Uses `PLACEHOLDER_THUMBNAIL` (6 occurrences)
- `src/pages/VideoPlayerPage.tsx` - Uses `DEFAULT_AVATAR`
- `src/pages/RoomPage.tsx` - Uses `DEFAULT_AVATAR`
- `src/pages/ArtistsPage.tsx` - Uses `PLACEHOLDER_AVATAR`
- `src/pages/SpotlightPage.tsx` - Uses `PLACEHOLDER_THUMBNAIL` (4 occurrences)
- `src/pages/TrendingPage.tsx` - Uses `PLACEHOLDER_THUMBNAIL`
- `src/pages/NewDropsPage.tsx` - Uses `PLACEHOLDER_MUSIC`
- `src/pages/MoviesPage.tsx` - Uses `PLACEHOLDER_THUMBNAIL` (2 occurrences)
- `src/pages/ShortsPage.tsx` - Uses `PLACEHOLDER_THUMBNAIL`
- `src/pages/MusicPage.tsx` - Uses `PLACEHOLDER_MUSIC`
- `src/pages/live/LiveViewerPage.tsx` - Uses `PLACEHOLDER_THUMBNAIL`
- `src/pages/live/AgoraLivePage.tsx` - Uses `PLACEHOLDER_THUMBNAIL`
- `src/pages/MusicPlayerPage.tsx` - Uses `PLACEHOLDER_MUSIC`

## Benefits

1. **No More 404 Errors**: Inline SVG data URLs eliminate missing file issues
2. **No More Supabase Errors**: Correct embed syntax prevents 400 errors
3. **Faster Loading**: Tiny inline SVGs vs. external file requests
4. **Consistent Display**: Placeholders always render correctly
5. **No File Management**: No need to create/maintain image files

## Notes

- Email addresses can no longer be displayed for users (since `auth.users` is not joinable). Showing `user_id` UUID instead.
- Changed product references from `products` table to `creator_merch_items` table (the correct table name)
- All `onError` handlers now correctly fallback to inline SVG data URLs
- The `products` table queries were replaced with `creator_merch_items` as the actual table name for creator merchandise
