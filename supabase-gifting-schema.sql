-- Gifting and Boost System Tables

-- Video Gifts table
create table if not exists video_gifts (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos on delete cascade,
  creator_id uuid references profiles on delete cascade,
  sender_user_id uuid references profiles on delete cascade,
  amount_coins bigint not null check (amount_coins > 0),
  gift_type text default 'standard' check (gift_type in ('standard', 'creator_unlock', 'custom')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Creator Supporter Stats
create table if not exists creator_supporter_stats (
  creator_id uuid references profiles on delete cascade,
  supporter_user_id uuid references profiles on delete cascade,
  total_gifted_coins bigint default 0,
  gift_count bigint default 0,
  last_gifted_at timestamptz default now(),
  primary key (creator_id, supporter_user_id)
);

-- Video Supporter Stats
create table if not exists video_supporter_stats (
  video_id uuid references videos on delete cascade,
  supporter_user_id uuid references profiles on delete cascade,
  total_gifted_coins bigint default 0,
  gift_count bigint default 0,
  last_gifted_at timestamptz default now(),
  primary key (video_id, supporter_user_id)
);

-- Video Boosts table
create table if not exists video_boosts (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos on delete cascade,
  booster_user_id uuid references profiles on delete cascade,
  amount_coins bigint not null check (amount_coins > 0),
  boost_level text check (boost_level in ('small', 'medium', 'large', 'featured')),
  boost_score numeric default 0,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  status text default 'active' check (status in ('active', 'expired', 'refunded', 'revoked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Boost Events table
create table if not exists boost_events (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos on delete cascade,
  booster_user_id uuid references profiles on delete cascade,
  amount_coins bigint not null,
  boost_score numeric default 0,
  event_type text check (event_type in ('boost_applied', 'boost_expired', 'boost_revoked')),
  created_at timestamptz default now()
);

-- Fraud Events table
create table if not exists fraud_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles on delete cascade,
  related_user_id uuid references profiles on delete cascade,
  video_id uuid references videos on delete cascade,
  event_type text check (event_type in ('self_gift', 'circular_gift', 'suspicious_boost', 'fraud_gift')),
  severity text check (severity in ('low', 'medium', 'high')),
  metadata jsonb,
  reviewed boolean default false,
  created_at timestamptz default now()
);

-- Add boost fields to videos table
alter table videos add column if not exists boost_score numeric default 0;
alter table videos add column if not exists boosted boolean default false;

-- Indexes for performance
create index if not exists idx_video_gifts_video_id on video_gifts(video_id, created_at desc);
create index if not exists idx_video_gifts_creator_id on video_gifts(creator_id, created_at desc);
create index if not exists idx_video_gifts_sender on video_gifts(sender_user_id, created_at desc);
create index if not exists idx_video_boosts_video_id on video_boosts(video_id, status, ends_at);
create index if not exists idx_video_boosts_booster on video_boosts(booster_user_id, created_at desc);
create index if not exists idx_creator_supporter_stats on creator_supporter_stats(creator_id, total_gifted_coins desc);
create index if not exists idx_video_supporter_stats on video_supporter_stats(video_id, total_gifted_coins desc);
create index if not exists idx_fraud_events_user on fraud_events(user_id, created_at desc);

-- RLS Policies
alter table video_gifts enable row level security;
alter table creator_supporter_stats enable row level security;
alter table video_supporter_stats enable row level security;
alter table video_boosts enable row level security;
alter table boost_events enable row level security;
alter table fraud_events enable row level security;

drop policy if exists "Video gifts viewable publicly" on video_gifts;
drop policy if exists "Supporter stats viewable publicly" on creator_supporter_stats;
drop policy if exists "Video supporter stats viewable publicly" on video_supporter_stats;
drop policy if exists "Active boosts viewable by everyone" on video_boosts;
drop policy if exists "Boost events viewable by everyone" on boost_events;
drop policy if exists "Fraud events viewable by owner" on fraud_events;
drop policy if exists "Service role can insert fraud events" on fraud_events;

-- Video Gifts policies
create policy "Video gifts viewable publicly" on video_gifts for select using (true);

-- Creator Supporter Stats policies
create policy "Supporter stats viewable publicly" on creator_supporter_stats for select using (true);

-- Video Supporter Stats policies
create policy "Video supporter stats viewable publicly" on video_supporter_stats for select using (true);

-- Video Boosts policies
create policy "Active boosts viewable by everyone" on video_boosts for select using (
  status = 'active' and ends_at > now()
);

-- Boost Events policies
create policy "Boost events viewable by everyone" on boost_events for select using (true);

-- Fraud events policies
create policy "Fraud events viewable by owner" on fraud_events for select using (current_profile_id() = user_id);
create policy "Service role can insert fraud events" on fraud_events for insert with check (true);

-- RPC Function: Gift Creator on Video
create or replace function gift_creator_on_video(
  p_video_id uuid,
  p_amount_coins bigint,
  p_gift_type text default 'standard'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sender_id uuid;
  v_creator_id uuid;
  v_sender_balance bigint;
begin
  v_sender_id := current_profile_id();
  if v_sender_id is null then
    raise exception 'Authentication required';
  end if;

  select creator_id into v_creator_id
  from videos
  where id = p_video_id;

  if v_creator_id is null then
    raise exception 'Video not found';
  end if;

  if v_sender_id = v_creator_id then
    insert into fraud_events (user_id, video_id, event_type, severity, metadata)
    values (v_sender_id, p_video_id, 'self_gift', 'medium', jsonb_build_object('amount', p_amount_coins));
    raise exception 'Cannot gift yourself';
  end if;

  select coalesce(sum(amount), 0) into v_sender_balance
  from coin_transactions
  where user_id = v_sender_id;

  if v_sender_balance < p_amount_coins then
    raise exception 'Insufficient coin balance';
  end if;

  insert into coin_transactions (user_id, amount, type, reference_id)
  values (v_sender_id, -p_amount_coins, 'gift', p_video_id);

  insert into coin_transactions (user_id, amount, type, reference_id)
  values (v_creator_id, p_amount_coins, 'gift', p_video_id);

  insert into video_gifts (video_id, creator_id, sender_user_id, amount_coins, gift_type)
  values (p_video_id, v_creator_id, v_sender_id, p_amount_coins, p_gift_type);

  insert into creator_supporter_stats (creator_id, supporter_user_id, total_gifted_coins, gift_count, last_gifted_at)
  values (v_creator_id, v_sender_id, p_amount_coins, 1, now())
  on conflict (creator_id, supporter_user_id) do update
  set total_gifted_coins = creator_supporter_stats.total_gifted_coins + p_amount_coins,
      gift_count = creator_supporter_stats.gift_count + 1,
      last_gifted_at = now();

  insert into video_supporter_stats (video_id, supporter_user_id, total_gifted_coins, gift_count, last_gifted_at)
  values (p_video_id, v_sender_id, p_amount_coins, 1, now())
  on conflict (video_id, supporter_user_id) do update
  set total_gifted_coins = video_supporter_stats.total_gifted_coins + p_amount_coins,
      gift_count = video_supporter_stats.gift_count + 1,
      last_gifted_at = now();

  update creator_progress_cache
  set coins_progress = coalesce(coins_progress, 0) + p_amount_coins,
      last_updated = now()
  where creator_id = v_creator_id;

  if (select coins_progress from creator_progress_cache where creator_id = v_creator_id) >= 50000 and
     (select unique_gifters_count from creator_progress_cache where creator_id = v_creator_id) >= 50 then
    update profiles
    set can_upload_movies = true,
        unlock_type = 'community',
        unlock_unlocked_at = now()
    where id = v_creator_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'sender_balance', v_sender_balance - p_amount_coins,
    'boosted_unlock_progress', true
  );
end;
$$;

-- RPC Function: Boost Video
create or replace function boost_video(
  p_video_id uuid,
  p_amount_coins bigint
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sender_id uuid;
  v_sender_balance bigint;
  v_boost_level text;
  v_boost_score numeric;
  v_ends_at timestamptz;
begin
  v_sender_id := current_profile_id();
  if v_sender_id is null then
    raise exception 'Authentication required';
  end if;

  v_boost_level := case
    when p_amount_coins >= 5000 then 'featured'
    when p_amount_coins >= 1000 then 'large'
    when p_amount_coins >= 500 then 'medium'
    else 'small'
  end;

  v_ends_at := case v_boost_level
    when 'small' then now() + interval '1 hour'
    when 'medium' then now() + interval '6 hours'
    when 'large' then now() + interval '24 hours'
    when 'featured' then now() + interval '48 hours'
    else now() + interval '1 hour'
  end;

  v_boost_score := p_amount_coins * 0.5;

  select coalesce(sum(amount), 0) into v_sender_balance
  from coin_transactions
  where user_id = v_sender_id;

  if v_sender_balance < p_amount_coins then
    raise exception 'Insufficient coin balance';
  end if;

  insert into coin_transactions (user_id, amount, type, reference_id)
  values (v_sender_id, -p_amount_coins, 'boost', p_video_id);

  insert into video_boosts (video_id, booster_user_id, amount_coins, boost_level, boost_score, ends_at)
  values (p_video_id, v_sender_id, p_amount_coins, v_boost_level, v_boost_score, v_ends_at);

  insert into boost_events (video_id, booster_user_id, amount_coins, boost_score, event_type)
  values (p_video_id, v_sender_id, p_amount_coins, v_boost_score, 'boost_applied');

  update videos
  set boost_score = boost_score + v_boost_score,
      boosted = true
  where id = p_video_id;

  return jsonb_build_object(
    'success', true,
    'boost_level', v_boost_level,
    'ends_at', v_ends_at,
    'boost_score', v_boost_score
  );
end;
$$;

-- RPC Function: Get Video Boost Score
create or replace function get_video_boost_score(p_video_id uuid)
returns numeric
language plpgsql
stable
as $$
declare
  v_total_score numeric := 0;
begin
  select coalesce(sum(boost_score), 0) into v_total_score
  from video_boosts
  where video_id = p_video_id
    and status = 'active'
    and ends_at > now();

  return round(v_total_score, 2);
end;
$$;

-- RPC Function: Get Creator Supporters
create or replace function get_creator_supporters(p_creator_id uuid)
returns table (
  supporter_user_id uuid,
  total_gifted_coins bigint,
  gift_count bigint,
  last_gifted_at timestamptz
)
language plpgsql
stable
as $$
begin
  return query
  select supporter_user_id, total_gifted_coins, gift_count, last_gifted_at
  from creator_supporter_stats
  where creator_id = p_creator_id
  order by total_gifted_coins desc
  limit 20;
end;
$$;

-- RPC Function: Get Video Supporters
create or replace function get_video_supporters(p_video_id uuid)
returns table (
  supporter_user_id uuid,
  total_gifted_coins bigint,
  gift_count bigint,
  last_gifted_at timestamptz
)
language plpgsql
stable
as $$
begin
  return query
  select supporter_user_id, total_gifted_coins, gift_count, last_gifted_at
  from video_supporter_stats
  where video_id = p_video_id
  order by total_gifted_coins desc
  limit 20;
end;
$$;

-- RPC Function: Get Creator Top Commenter
create or replace function get_creator_top_commenter(p_creator_id uuid)
returns table (
  user_id uuid,
  display_name text,
  username text,
  comment_count bigint
)
language plpgsql
stable
as $$
begin
  return query
  select vc.user_id, p.display_name, p.username, count(*) as comment_count
  from video_comments vc
  join videos v on vc.video_id = v.id
  join profiles p on vc.user_id = p.id
  where v.creator_id = p_creator_id
  group by vc.user_id, p.display_name, p.username
  order by comment_count desc
  limit 1;
end;
$$;

-- RPC Function: Get Creator Top Liker (Most Active Fan)
create or replace function get_creator_top_liker(p_creator_id uuid)
returns table (
  user_id uuid,
  display_name text,
  username text,
  like_count bigint
)
language plpgsql
stable
as $$
begin
  return query
  select vl.user_id, p.display_name, p.username, count(*) as like_count
  from video_likes vl
  join videos v on vl.video_id = v.id
  join profiles p on vl.user_id = p.id
  where v.creator_id = p_creator_id
  group by vl.user_id, p.display_name, p.username
  order by like_count desc
  limit 1;
end;
$$;
