-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Core profile model (do not alter auth.users directly)
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade unique,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  subscriber_count integer default 0,
  total_views integer default 0,
  short_views integer default 0,
  is_creator boolean default false,
  creator_level text default 'bronze' check (creator_level in ('bronze', 'silver', 'gold')),
  is_super_admin boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Bootstrap CEO / super admin profile flag by auth email
update profiles
set is_super_admin = true
where user_id in (
  select id from auth.users where email = 'trollcity2025@gmail.com'
);

-- Helper to map auth user -> profile id
create or replace function current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

 -- Videos table
create table if not exists videos (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid,
  title text not null,
  description text,
  video_url text,
  mux_stream_url text,
  mux_thumbnail_url text,
  video_type text check (video_type in ('short', 'movie', 'live')) not null,
  category text check (category in ('music', 'cars', 'business', 'gaming', 'education', 'entertainment')),
  duration integer,
  view_count integer default 0,
  like_count integer default 0,
  comment_count integer default 0,
  share_count integer default 0,
  save_count integer default 0,
  boost_score integer default 0,
  gift_count integer default 0,
  gift_coin_total integer default 0,
  watch_time_seconds integer default 0,
  moderation_status text default 'approved' check (moderation_status in ('pending', 'approved', 'rejected')),
  upload_status text default 'ready' check (upload_status in ('uploading', 'processing', 'ready', 'failed')),
  visibility text default 'public' check (visibility in ('public', 'private', 'unlisted')),
  is_monetized boolean default false,
  boost_expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

 -- Add foreign key from videos.creator_id to profiles for PostgREST relationship navigation
-- Note: this references profiles instead of profiles to enable PostgREST navigation via profiles!videos_creator_id_fkey
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'videos_creator_id_fkey'
  ) then
    alter table videos add constraint videos_creator_id_fkey foreign key (creator_id) references profiles(id) on delete cascade;
  end if;
end $$;

-- Backfill video_type from type column if exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'videos' and column_name = 'type'
  ) then
    execute 'update videos set video_type = coalesce(video_type, type)';
  end if;
end $$;

-- Ensure video_type is not null
alter table videos alter column video_type set not null;

-- Add missing columns if not exist
alter table videos add column if not exists share_count integer default 0;
alter table videos add column if not exists save_count integer default 0;
alter table videos add column if not exists boost_score integer default 0;
alter table videos add column if not exists gift_count integer default 0;
alter table videos add column if not exists gift_coin_total integer default 0;
alter table videos add column if not exists watch_time_seconds integer default 0;
alter table videos add column if not exists moderation_status text default 'approved' check (moderation_status in ('pending', 'approved', 'rejected'));
alter table videos add column if not exists upload_status text default 'ready' check (upload_status in ('uploading', 'processing', 'ready', 'failed'));
alter table videos add column if not exists visibility text default 'public' check (visibility in ('public', 'private', 'unlisted'));

-- Video views table
create table if not exists video_views (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos on delete cascade,
  user_id uuid references profiles on delete cascade,
  watch_time integer default 0,
  completed boolean default false,
  created_at timestamp with time zone default now()
);

-- Video likes table
create table if not exists video_likes (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos on delete cascade,
  user_id uuid references profiles on delete cascade,
  created_at timestamp with time zone default now(),
  unique(video_id, user_id)
);

-- Video shares table
create table if not exists video_shares (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos on delete cascade,
  user_id uuid references profiles on delete cascade,
  created_at timestamp with time zone default now(),
  unique(video_id, user_id)
);

-- Video saves table
create table if not exists video_saves (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos on delete cascade,
  user_id uuid references profiles on delete cascade,
  created_at timestamp with time zone default now(),
  unique(video_id, user_id)
);

-- Video comments table
create table if not exists video_comments (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos on delete cascade,
  user_id uuid references profiles on delete cascade,
  content text not null,
  timestamp integer,
  created_at timestamp with time zone default now()
);

-- Subscriptions table
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  subscriber_id uuid references profiles on delete cascade,
  creator_id uuid references profiles on delete cascade,
  created_at timestamp with time zone default now(),
  unique(subscriber_id, creator_id)
);

-- Coin transactions table
create table if not exists coin_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles on delete cascade,
  amount integer not null,
  type text not null check (type in ('purchase', 'gift', 'boost', 'subscription')),
  reference_id uuid,
  created_at timestamp with time zone default now()
);

-- Creator earnings table
create table if not exists creator_earnings (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references profiles on delete cascade,
  amount numeric(10,2) not null,
  source text not null check (source in ('ads', 'gifts', 'subscription')),
  reference_id uuid,
  created_at timestamp with time zone default now()
);

-- Payouts table
create table if not exists payouts (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references profiles on delete cascade,
  paypal_email text not null,
  amount numeric(10,2) not null,
  status text default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamp with time zone default now()
);

-- Room messages table
create table if not exists room_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references profiles on delete cascade,
  user_id uuid references profiles on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_videos_creator_id on videos(creator_id);
create index if not exists idx_videos_video_type on videos(video_type);
create index if not exists idx_videos_category on videos(category);
create index if not exists idx_videos_created_at on videos(created_at desc);
create index if not exists idx_video_views_video_id on video_views(video_id);
create index if not exists idx_video_comments_video_id on video_comments(video_id);
create index if not exists idx_subscriptions_creator_id on subscriptions(creator_id);
create index if not exists idx_coin_transactions_user_id on coin_transactions(user_id);

-- RLS enablement
alter table profiles enable row level security;
alter table videos enable row level security;
alter table video_views enable row level security;
alter table video_likes enable row level security;
alter table video_comments enable row level security;
alter table subscriptions enable row level security;
alter table coin_transactions enable row level security;
alter table creator_earnings enable row level security;
alter table payouts enable row level security;
alter table room_messages enable row level security;

-- Drop policies so script is re-runnable
drop policy if exists "Profiles are viewable by everyone" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;
drop policy if exists "Videos are viewable by everyone" on videos;
drop policy if exists "Creators can insert their own videos" on videos;
drop policy if exists "Creators can update their own videos" on videos;
drop policy if exists "Users can insert their own views" on video_views;
drop policy if exists "Likes are viewable by everyone" on video_likes;
drop policy if exists "Users can insert their own likes" on video_likes;
drop policy if exists "Comments are viewable by everyone" on video_comments;
drop policy if exists "Users can insert their own comments" on video_comments;
drop policy if exists "Subscriptions are viewable by everyone" on subscriptions;
drop policy if exists "Users can insert their own subscriptions" on subscriptions;
drop policy if exists "Users can view their own transactions" on coin_transactions;
drop policy if exists "Users can insert their own transactions" on coin_transactions;
drop policy if exists "Creators can view their own earnings" on creator_earnings;
drop policy if exists "Creators can create payouts" on payouts;
drop policy if exists "Creators can view their own payouts" on payouts;
drop policy if exists "Room messages are viewable by everyone" on room_messages;
drop policy if exists "Users can insert their own messages" on room_messages;

-- Profiles policies
create policy "Profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = user_id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = user_id);

 -- Videos policies
create policy "Videos are viewable by everyone" on videos for select using (true);

create policy "Creators can insert their own videos" on videos for insert with check (current_profile_id() = creator_id);

create policy "Creators can update their own videos" on videos for update using (current_profile_id() = creator_id);

create policy "Moderators can update all video statuses" on videos for update using (
  exists (
    select 1 from profiles
    where user_id = auth.uid()
    and role in ('moderator', 'admin')
  )
);

-- Video views policies
create policy "Users can insert their own views" on video_views for insert with check (current_profile_id() = user_id);

-- Video likes policies
create policy "Likes are viewable by everyone" on video_likes for select using (true);
create policy "Users can insert their own likes" on video_likes for insert with check (current_profile_id() = user_id);

-- Video shares policies
create policy "Shares are viewable by everyone" on video_shares for select using (true);
create policy "Users can insert their own shares" on video_shares for insert with check (current_profile_id() = user_id);

-- Video saves policies
create policy "Saves are viewable by everyone" on video_saves for select using (true);
create policy "Users can insert their own saves" on video_saves for insert with check (current_profile_id() = user_id);

-- Video comments policies
create policy "Comments are viewable by everyone" on video_comments for select using (true);
create policy "Users can insert their own comments" on video_comments for insert with check (current_profile_id() = user_id);

-- Subscriptions policies
create policy "Subscriptions are viewable by everyone" on subscriptions for select using (true);
create policy "Users can insert their own subscriptions" on subscriptions for insert with check (current_profile_id() = subscriber_id);

-- Coin transactions policies
create policy "Users can view their own transactions" on coin_transactions for select using (current_profile_id() = user_id);
create policy "Users can insert their own transactions" on coin_transactions for insert with check (current_profile_id() = user_id);

-- Creator earnings policies
create policy "Creators can view their own earnings" on creator_earnings for select using (current_profile_id() = creator_id);

-- Payouts policies
create policy "Creators can create payouts" on payouts for insert with check (current_profile_id() = creator_id);
create policy "Creators can view their own payouts" on payouts for select using (current_profile_id() = creator_id);

-- Room messages policies
create policy "Room messages are viewable by everyone" on room_messages for select using (true);
create policy "Users can insert their own messages" on room_messages for insert with check (current_profile_id() = user_id);
