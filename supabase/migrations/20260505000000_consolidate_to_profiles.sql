-- ============================================================================
-- Consolidation Migration: Use profiles as the single source of truth
-- ============================================================================

-- Step 1: Add missing columns from mai_accounts to profiles
alter table profiles add column if not exists role text default 'user' check (role in ('user', 'creator', 'moderator', 'admin'));
alter table profiles add column if not exists moderation_status text default 'active' check (moderation_status in ('active', 'flagged', 'suspended', 'banned'));
alter table profiles add column if not exists can_upload_movies boolean default false;
alter table profiles add column if not exists unlock_type text check (unlock_type in ('community', 'growth', 'paid'));
alter table profiles add column if not exists unlock_unlocked_at timestamptz;

-- Step 2: Set is_super_admin based on role
update profiles set role = 'admin' where is_super_admin = true;

-- Step 3: Comprehensive backfill of all account data

-- First, ensure all profiles have the required columns with proper defaults
update profiles set
  role = 'user' where role is null,
  moderation_status = 'active' where moderation_status is null;

-- Backfill data from mai_accounts to existing profiles (prioritize mai_accounts data)
update profiles p
set
  username = coalesce(ma.username, p.username),
  display_name = coalesce(ma.display_name, p.display_name),
  avatar_url = coalesce(ma.avatar_url, p.avatar_url),
  bio = coalesce(ma.bio, p.bio),
  subscriber_count = coalesce(ma.subscriber_count, p.subscriber_count, 0),
  total_views = coalesce(ma.total_views, p.total_views, 0),
  short_views = coalesce(ma.short_views, p.short_views, 0),
  is_creator = coalesce(ma.is_creator, p.is_creator, false),
  creator_level = coalesce(nullif(ma.creator_level, ''), p.creator_level, 'bronze'),
  role = coalesce(nullif(ma.role, 'user'), p.role, 'user'),
  moderation_status = coalesce(nullif(ma.moderation_status, 'active'), p.moderation_status, 'active'),
  can_upload_movies = coalesce(ma.can_upload_movies, p.can_upload_movies, false),
  unlock_type = coalesce(nullif(ma.unlock_type, ''), p.unlock_type),
  unlock_unlocked_at = coalesce(ma.unlock_unlocked_at, p.unlock_unlocked_at),
  updated_at = now()
from mai_accounts ma
where p.user_id = ma.user_id;

-- Insert profiles for users that exist only in mai_accounts (but not in profiles)
insert into profiles (user_id, username, display_name, avatar_url, bio, subscriber_count, total_views, short_views, is_creator, creator_level, role, moderation_status, can_upload_movies, unlock_type, unlock_unlocked_at, created_at, updated_at)
select
  ma.user_id,
  ma.username,
  ma.display_name,
  ma.avatar_url,
  ma.bio,
  coalesce(ma.subscriber_count, 0),
  coalesce(ma.total_views, 0),
  coalesce(ma.short_views, 0),
  coalesce(ma.is_creator, false),
  coalesce(nullif(ma.creator_level, ''), 'bronze'),
  coalesce(nullif(ma.role, 'user'), 'user'),
  coalesce(nullif(ma.moderation_status, 'active'), 'active'),
  coalesce(ma.can_upload_movies, false),
  nullif(ma.unlock_type, ''),
  ma.unlock_unlocked_at,
  coalesce(ma.created_at, now()),
  coalesce(ma.updated_at, now())
from mai_accounts ma
where not exists (select 1 from profiles p where p.user_id = ma.user_id);

-- Handle any profiles that exist in mai_accounts but not auth.users (cleanup orphaned data)
-- These will be handled by the foreign key constraints

-- Step 5: Update foreign key constraints that reference mai_accounts to reference profiles

-- Drop existing foreign key constraints that reference mai_accounts
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT conname, conrelid::regclass::text as table_name
        FROM pg_constraint
        WHERE confrelid::regclass::text = 'mai_accounts'
        AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', constraint_record.table_name, constraint_record.conname);
    END LOOP;
END $$;

-- Recreate foreign key constraints to reference profiles instead
-- These will be created by the subsequent migrations that define the tables

-- Step 6: Drop profiles table (after all code is updated to use profiles)
-- DROP TABLE IF EXISTS profiles;

-- ============================================================================
-- RLS Policies Update
-- ============================================================================

-- Update current_user_profile_id() function to work with profiles
-- This function should be renamed to current_user_profile_id() after code is updated
create or replace function current_user_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;
