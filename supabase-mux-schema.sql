-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Accounts table for app-level roles and moderation
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade unique,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  subscriber_count bigint default 0,
  total_views bigint default 0,
  short_views bigint default 0,
  is_creator boolean default false,
  creator_level text default 'bronze' check (creator_level in ('bronze', 'silver', 'gold')),
  can_upload_movies boolean default false,
  unlock_type text check (unlock_type in ('community', 'growth', 'paid')),
  unlock_unlocked_at timestamptz,
  role text default 'user' check (role in ('user', 'creator', 'moderator', 'admin')),
  moderation_status text default 'active' check (moderation_status in ('active', 'flagged', 'suspended', 'banned')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bootstrap CEO / superadmin account by auth email (safe, guarded upsert)
do $$
declare
  v_user_id uuid;
  v_email text := 'trollcity2025@gmail.com';
  v_username text;
begin
  select id into v_user_id
  from auth.users
  where email = v_email
  limit 1;

  if v_user_id is null then
    raise notice 'Skipping admin bootstrap: % not found in auth.users yet.', v_email;
    return;
  end if;

  v_username := regexp_replace(split_part(v_email, '@', 1), '[^a-zA-Z0-9_]+', '_', 'g');
  if v_username = '' then
    v_username := 'mai_admin';
  end if;

  insert into profiles (
    user_id,
    username,
    display_name,
    role,
    moderation_status
  )
  values (
    v_user_id,
    v_username,
    'CEO',
    'admin',
    'active'
  )
  on conflict (user_id) do update
  set role = 'admin',
      moderation_status = 'active',
      updated_at = now();
end $$;

-- Helper to map auth user -> profiles.id
create or replace function current_mai_account_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select m.id
  from public.profiles m
  where m.user_id = auth.uid()
  limit 1;
$$;

-- Videos table (non-destructive)
create table if not exists videos (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  category text,
  video_type text check (video_type in ('short','movie')) not null,
  visibility text check (visibility in ('draft','public','private','hidden','deleted')) default 'draft',
  moderation_status text check (moderation_status in ('pending','approved','flagged','rejected','deleted')) default 'pending',
  upload_status text check (upload_status in ('created','uploading','processing','ready','errored','invalid','deleted')) default 'created',
  mux_upload_id text unique,
  mux_asset_id text unique,
  mux_playback_id text,
  mux_status text,
  mux_duration_seconds integer,
  mux_aspect_ratio text,
  mux_thumbnail_url text,
  mux_preview_url text,
  mux_stream_url text,
  view_count bigint default 0,
  like_count bigint default 0,
  comment_count bigint default 0,
  gift_count bigint default 0,
  boost_score numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  published_at timestamptz,
  deleted_at timestamptz
);

-- Compatibility migration for pre-existing videos table versions
alter table videos add column if not exists video_type text;
alter table videos add column if not exists visibility text default 'draft';
alter table videos add column if not exists moderation_status text default 'pending';
alter table videos add column if not exists upload_status text default 'created';
alter table videos add column if not exists mux_upload_id text;
alter table videos add column if not exists mux_asset_id text;
alter table videos add column if not exists mux_playback_id text;
alter table videos add column if not exists mux_status text;
alter table videos add column if not exists mux_duration_seconds integer;
alter table videos add column if not exists mux_aspect_ratio text;
alter table videos add column if not exists mux_thumbnail_url text;
alter table videos add column if not exists mux_preview_url text;
alter table videos add column if not exists mux_stream_url text;
alter table videos add column if not exists gift_count bigint default 0;
alter table videos add column if not exists boost_score numeric default 0;
alter table videos add column if not exists published_at timestamptz;
alter table videos add column if not exists deleted_at timestamptz;

-- Backfill from legacy column name if present
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'videos'
      and column_name = 'type'
  ) then
    execute 'update public.videos set video_type = coalesce(video_type, type)';
  end if;
end $$;

update videos set video_type = 'short' where video_type is null;

alter table videos alter column video_type set not null;
alter table videos alter column visibility set not null;
alter table videos alter column moderation_status set not null;
alter table videos alter column upload_status set not null;

alter table videos drop constraint if exists videos_video_type_check;
alter table videos add constraint videos_video_type_check check (video_type in ('short','movie'));
alter table videos drop constraint if exists videos_visibility_check;
alter table videos add constraint videos_visibility_check check (visibility in ('draft','public','private','hidden','deleted'));
alter table videos drop constraint if exists videos_moderation_status_check;
alter table videos add constraint videos_moderation_status_check check (moderation_status in ('pending','approved','flagged','rejected','deleted'));
alter table videos drop constraint if exists videos_upload_status_check;
alter table videos add constraint videos_upload_status_check check (upload_status in ('created','uploading','processing','ready','errored','invalid','deleted'));

-- Create indexes for videos table
create index if not exists idx_videos_creator_id_created on videos(creator_id, created_at desc);
create index if not exists idx_videos_feed on videos(video_type, visibility, upload_status, moderation_status);
create index if not exists idx_videos_mux_asset on videos(mux_asset_id);
create index if not exists idx_videos_mux_playback on videos(mux_playback_id);
create index if not exists idx_videos_created_desc on videos(created_at desc);
create index if not exists idx_videos_boost on videos(boost_score desc);

-- Upload sessions table
create table if not exists mux_upload_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  mux_upload_id text unique,
  upload_url text,
  status text default 'created',
  intended_video_type text check (intended_video_type in ('short','movie')),
  created_at timestamptz default now(),
  expires_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_mux_upload_sessions_user on mux_upload_sessions(user_id);
create index if not exists idx_mux_upload_sessions_expires on mux_upload_sessions(expires_at);

-- Webhook events table for idempotency
create table if not exists mux_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  mux_event_id text unique,
  event_type text,
  video_id uuid references videos(id) on delete cascade,
  mux_asset_id text,
  payload jsonb,
  processed_at timestamptz default now()
);

create index if not exists idx_mux_webhook_events_mux_id on mux_webhook_events(mux_event_id);
create index if not exists idx_mux_webhook_events_video on mux_webhook_events(video_id);

-- Video views table for analytics
create table if not exists video_views (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos(id) on delete cascade,
  viewer_user_id uuid references profiles(id) on delete set null,
  anonymous_session_id text,
  playback_id text,
  watch_seconds integer default 0,
  completed boolean default false,
  percent_watched numeric,
  source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Compatibility migration for pre-existing video_views table versions
alter table video_views add column if not exists viewer_user_id uuid;
alter table video_views add column if not exists anonymous_session_id text;
alter table video_views add column if not exists playback_id text;
alter table video_views add column if not exists watch_seconds integer default 0;
alter table video_views add column if not exists completed boolean default false;
alter table video_views add column if not exists percent_watched numeric;
alter table video_views add column if not exists source text;
alter table video_views add column if not exists updated_at timestamptz default now();

-- Backfill viewer_user_id from legacy user_id (profiles.id -> auth.user_id -> profiles.id) when possible
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'video_views'
      and column_name = 'user_id'
  ) then
    execute $sql$
      update public.video_views vv
      set viewer_user_id = ma.id
      from public.profiles p
      join public.profiles ma on ma.user_id = p.user_id
      where vv.viewer_user_id is null
        and vv.user_id = p.id
    $sql$;
  end if;
end $$;

create index if not exists idx_video_views_video on video_views(video_id);
create index if not exists idx_video_views_user on video_views(viewer_user_id);
create index if not exists idx_video_views_session on video_views(anonymous_session_id);
create index if not exists idx_video_views_created on video_views(created_at desc);

-- Comments table
create table if not exists video_comments (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  timestamp integer,
  created_at timestamptz default now()
);

create index if not exists idx_video_comments_video on video_comments(video_id);
create index if not exists idx_video_comments_created on video_comments(created_at desc);

-- Gifts table
create table if not exists video_gifts (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete cascade,
  amount integer not null,
  message text,
  created_at timestamptz default now()
);

-- Compatibility migration for pre-existing video_gifts table versions
alter table video_gifts add column if not exists sender_id uuid;
alter table video_gifts add column if not exists receiver_id uuid;
alter table video_gifts add column if not exists message text;

-- Backfill sender/receiver from legacy schema if available
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'video_gifts'
      and column_name = 'sender_user_id'
  ) then
    execute $sql$
      update public.video_gifts vg
      set sender_id = ma.id
      from public.profiles p
      join public.profiles ma on ma.user_id = p.user_id
      where vg.sender_id is null
        and vg.sender_user_id = p.id
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'video_gifts'
      and column_name = 'creator_id'
  ) then
    execute $sql$
      update public.video_gifts vg
      set receiver_id = ma.id
      from public.profiles p
      join public.profiles ma on ma.user_id = p.user_id
      where vg.receiver_id is null
        and vg.creator_id = p.id
    $sql$;
  end if;
end $$;

create index if not exists idx_video_gifts_video on video_gifts(video_id);
create index if not exists idx_video_gifts_receiver on video_gifts(receiver_id);

-- Boosts table
create table if not exists video_boosts (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  amount integer not null,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_video_boosts_video on video_boosts(video_id);

-- Admin audit log
create table if not exists admin_audit_log (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_admin_audit_admin on admin_audit_log(admin_id);
create index if not exists idx_admin_audit_created on admin_audit_log(created_at desc);

-- MAI Coins wallet table
create table if not exists mai_wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) unique not null,
  mai_coins integer default 0 not null,
  lifetime_earned integer default 0 not null,
  lifetime_spent integer default 0 not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Daily login rewards table
create table if not exists mai_daily_login_rewards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) not null,
  reward_date date not null,
  coins_awarded integer default 10 not null,
  created_at timestamptz default now(),
  unique(user_id, reward_date)
);

-- MAI coin transactions table
create table if not exists mai_coin_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) not null,
  amount integer not null,
  transaction_type text not null,
  source text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Direct messages table
create table if not exists direct_messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references profiles(id),
  recipient_id uuid not null references profiles(id),
  message text not null,
  is_read boolean default false not null,
  created_at timestamptz default now() not null
);

-- Indexes for MAI coin tables
create index if not exists idx_mai_wallets_user on mai_wallets(user_id);
create index if not exists idx_mai_daily_login_rewards_user_date on mai_daily_login_rewards(user_id, reward_date);
create index if not exists idx_mai_coin_transactions_user on mai_coin_transactions(user_id);
create index if not exists idx_mai_coin_transactions_created on mai_coin_transactions(created_at desc);
create index if not exists idx_direct_messages_sender on direct_messages(sender_id);
create index if not exists idx_direct_messages_recipient on direct_messages(recipient_id);
create index if not exists idx_direct_messages_created on direct_messages(created_at desc);

-- Enable RLS
alter table videos enable row level security;
alter table mux_upload_sessions enable row level security;
alter table mux_webhook_events enable row level security;
alter table video_views enable row level security;
alter table video_comments enable row level security;
alter table video_gifts enable row level security;
alter table video_boosts enable row level security;
-- Disable RLS on profiles - this is an internal table managed by auth system
-- alter table profiles enable row level security;
alter table admin_audit_log enable row level security;
alter table mai_wallets enable row level security;
alter table mai_daily_login_rewards enable row level security;
alter table mai_coin_transactions enable row level security;
alter table direct_messages enable row level security;

create policy "direct messages are visible to sender or recipient" on direct_messages
  for select using (
    sender_id = current_mai_account_id() or recipient_id = current_mai_account_id()
  );

create policy "direct messages can be sent by the authenticated sender" on direct_messages
  for insert with check (
    sender_id = current_mai_account_id()
    and sender_id <> recipient_id
  );

create policy "direct messages can be updated by the sender" on direct_messages
  for update using (
    sender_id = current_mai_account_id()
  ) with check (
    sender_id = current_mai_account_id()
  );

create policy "direct messages can be deleted by the sender" on direct_messages
  for delete using (
    sender_id = current_mai_account_id()
  );

drop policy if exists "Videos are viewable by public when ready and approved" on videos;
drop policy if exists "Creators can view their own videos" on videos;
drop policy if exists "Creators can insert their own videos" on videos;
drop policy if exists "Creators can update their own videos in draft" on videos;
drop policy if exists "Moderators can update all video statuses" on videos;
drop policy if exists "Upload sessions are insertable by authenticated users" on mux_upload_sessions;
drop policy if exists "Users can view their own upload sessions" on mux_upload_sessions;
drop policy if exists "Video views are insertable by authenticated users" on video_views;
drop policy if exists "Comments are viewable on approved videos" on video_comments;
drop policy if exists "Users can insert their own comments" on video_comments;
drop policy if exists "Gifts are viewable by sender and receiver" on video_gifts;
drop policy if exists "Users can send gifts" on video_gifts;
drop policy if exists "Admin audit log is viewable by admins" on admin_audit_log;

-- RLS Policies for videos
create policy "Videos are viewable by public when ready and approved" on videos
  for select using (
    visibility = 'public'
    and upload_status = 'ready'
    and moderation_status = 'approved'
  );

create policy "Creators can view their own videos" on videos
  for select using (current_mai_account_id() = creator_id);

create policy "Creators can insert their own videos" on videos
  for insert with check (current_mai_account_id() = creator_id);

create policy "Creators can update their own videos in draft" on videos
  for update using (
    current_mai_account_id() = creator_id
    and upload_status in ('created', 'uploading', 'processing')
  );

create policy "Moderators can update all video statuses" on videos
  for update using (
    exists (
      select 1 from profiles
      where user_id = auth.uid()
      and role in ('moderator', 'admin')
    )
  );

-- RLS Policies for upload sessions
create policy "Upload sessions are insertable by authenticated users" on mux_upload_sessions
  for insert with check (current_mai_account_id() = user_id);

create policy "Users can view their own upload sessions" on mux_upload_sessions
  for select using (current_mai_account_id() = user_id);

-- RLS Policies for video views
create policy "Video views are insertable by authenticated users" on video_views
  for insert with check (
    current_mai_account_id() = viewer_user_id or anonymous_session_id is not null
  );

-- RLS Policies for comments
create policy "Comments are viewable on approved videos" on video_comments
  for select using (
    exists (
      select 1 from videos
      where videos.id = video_comments.video_id
      and moderation_status = 'approved'
      and visibility = 'public'
    )
  );

create policy "Users can insert their own comments" on video_comments
  for insert with check (current_mai_account_id() = user_id);

-- RLS Policies for gifts
create policy "Gifts are viewable by sender and receiver" on video_gifts
  for select using (current_mai_account_id() = sender_id or current_mai_account_id() = receiver_id);

create policy "Users can send gifts" on video_gifts
  for insert with check (current_mai_account_id() = sender_id);

-- RLS Policies for admin
create policy "Admin audit log is viewable by admins" on admin_audit_log
  for select using (
    exists (
      select 1 from profiles
      where user_id = auth.uid()
      and role = 'admin'
    )
  );

-- RLS Policies for MAI wallets
create policy "Users can view their own MAI wallet" on mai_wallets
  for select using (current_mai_account_id() = user_id);

create policy "Users can update their own MAI wallet" on mai_wallets
  for update using (current_mai_account_id() = user_id);

-- RLS Policies for daily login rewards
create policy "Users can view their own daily login rewards" on mai_daily_login_rewards
  for select using (current_mai_account_id() = user_id);

-- RLS Policies for MAI coin transactions
create policy "Users can view their own MAI coin transactions" on mai_coin_transactions
  for select using (current_mai_account_id() = user_id);

-- Helper function to get video feed (public ready videos)
create or replace function get_video_feed(
  p_cursor timestamptz default null,
  p_limit integer default 20
) returns table (
  id uuid,
  title text,
  description text,
  video_type text,
  category text,
  visibility text,
  moderation_status text,
  upload_status text,
  mux_playback_id text,
  mux_thumbnail_url text,
  mux_duration_seconds integer,
  view_count bigint,
  like_count bigint,
  gift_count bigint,
  boost_score numeric,
  created_at timestamptz,
  profiles jsonb
) language sql stable as $$
  select
    v.id,
    v.title,
    v.description,
    v.video_type,
    v.category,
    v.visibility,
    v.moderation_status,
    v.upload_status,
    v.mux_playback_id,
    v.mux_thumbnail_url,
    v.mux_duration_seconds,
    v.view_count,
    v.like_count,
    v.gift_count,
    v.boost_score,
    v.created_at,
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ) as profiles
  from videos v
  join profiles p on v.creator_id = p.id
  where
    v.visibility = 'public'
    and v.upload_status = 'ready'
    and v.moderation_status = 'approved'
    and v.mux_playback_id is not null
    and (p_cursor is null or v.created_at < p_cursor)
  order by v.created_at desc
   limit p_limit;
$$;

-- RPC function for claiming daily MAI login reward
create or replace function claim_mai_daily_login_reward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_reward_date date;
  v_wallet_id uuid;
  v_current_balance integer;
  v_claimed boolean := false;
  v_coins_awarded integer := 10;
begin
  -- Get current user ID
  v_user_id := current_mai_account_id();
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Determine reward date (UTC date)
  v_reward_date := current_date;

  -- Check if already claimed today
  if exists (
    select 1
    from mai_daily_login_rewards
    where user_id = v_user_id
      and reward_date = v_reward_date
  ) then
    -- Already claimed, get current balance
    select mai_coins into v_current_balance
    from mai_wallets
    where user_id = v_user_id;
    if v_current_balance is null then
      v_current_balance := 0;
    end if;
    return jsonb_build_object(
      'claimed', false,
      'message', 'Already claimed today',
      'balance', v_current_balance,
      'next_claim_date', v_reward_date + interval '1 day'
    );
  end if;

  -- Claim the reward
  begin
    -- Insert reward record (will fail if already exists due to unique constraint)
    insert into mai_daily_login_rewards (user_id, reward_date, coins_awarded)
    values (v_user_id, v_reward_date, v_coins_awarded);

    -- Upsert wallet and add coins
    insert into mai_wallets (user_id, mai_coins, lifetime_earned)
    values (v_user_id, v_coins_awarded, v_coins_awarded)
    on conflict (user_id) do update set
      mai_coins = mai_wallets.mai_coins + v_coins_awarded,
      lifetime_earned = mai_wallets.lifetime_earned + v_coins_awarded,
      updated_at = now()
    returning id, mai_coins into v_wallet_id, v_current_balance;

    -- Insert transaction record
    insert into mai_coin_transactions (user_id, amount, transaction_type, source, metadata)
    values (v_user_id, v_coins_awarded, 'daily_login_reward', 'daily_login', jsonb_build_object('reward_date', v_reward_date));

    v_claimed := true;
  exception
    when unique_violation then
      -- Race condition: someone else claimed it first
      select mai_coins into v_current_balance
      from mai_wallets
      where user_id = v_user_id;
      if v_current_balance is null then
        v_current_balance := 0;
      end if;
      return jsonb_build_object(
        'claimed', false,
        'message', 'Already claimed today',
        'balance', v_current_balance,
        'next_claim_date', v_reward_date + interval '1 day'
      );
  end;

  return jsonb_build_object(
    'claimed', true,
    'balance', v_current_balance,
    'coins_awarded', v_coins_awarded,
    'next_claim_date', v_reward_date + interval '1 day'
  );
end;
$$;
