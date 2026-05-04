import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

type IssueType =
  | 'missing_table'
  | 'missing_column'
  | 'missing_function'
  | 'missing_foreign_key'
  | 'rls_disabled'
  | 'not_null_constraint'
  | 'invalid_check_constraint'
  | 'missing_bucket'
  | 'missing_policy'

interface Issue {
  id: string
  type: IssueType
  name: string
  details: string
  severity: 'critical' | 'high' | 'medium'
  migrationSql: string
}

type ExpectedForeignKey = {
  table: string
  column: string
  referencesSchema?: 'public' | 'auth'
  referencesTable: string
  referencesColumn: string
}

type ExpectedBucket = {
  id: string
  public: boolean
}

type ExpectedPolicy = {
  schemaname: string
  tablename: string
  policyname: string
  cmd?: string
  migrationSql: string
}

const REQUIRED_VIDEO_CATEGORIES = [
  'music',
  'music_track',
  'music_album',
  'music_video',
  'video_music',
  'short',
  'movie',
  'film',
  'feature',
  'cars',
  'business',
  'gaming',
  'education',
  'entertainment',
]

const REQUIRED_VIDEO_TYPES = ['music', 'short', 'music_video', 'movie', 'video']

const EXPECTED_BUCKETS: ExpectedBucket[] = [
  { id: 'music-files', public: false },
  { id: 'music-covers', public: true },
]

const EXPECTED_STORAGE_POLICIES: ExpectedPolicy[] = [
  {
    schemaname: 'storage',
    tablename: 'objects',
    policyname: 'music files insert own folder',
    cmd: 'INSERT',
    migrationSql: `drop policy if exists "music files insert own folder" on storage.objects;

create policy "music files insert own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'music-files'
  and name like auth.uid()::text || '/%'
);`,
  },
  {
    schemaname: 'storage',
    tablename: 'objects',
    policyname: 'music files read own folder',
    cmd: 'SELECT',
    migrationSql: `drop policy if exists "music files read own folder" on storage.objects;

create policy "music files read own folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'music-files'
  and name like auth.uid()::text || '/%'
);`,
  },
  {
    schemaname: 'storage',
    tablename: 'objects',
    policyname: 'music covers insert own folder',
    cmd: 'INSERT',
    migrationSql: `drop policy if exists "music covers insert own folder" on storage.objects;

create policy "music covers insert own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'music-covers'
  and name like auth.uid()::text || '/%'
);`,
  },
  {
    schemaname: 'storage',
    tablename: 'objects',
    policyname: 'music covers public read',
    cmd: 'SELECT',
    migrationSql: `drop policy if exists "music covers public read" on storage.objects;

create policy "music covers public read"
on storage.objects
for select
to public
using (
  bucket_id = 'music-covers'
);`,
  },
]

const EXPECTED_VIDEO_POLICIES: ExpectedPolicy[] = [
  {
    schemaname: 'public',
    tablename: 'videos',
    policyname: 'creators insert own videos',
    cmd: 'INSERT',
    migrationSql: `drop policy if exists "creators insert own videos" on public.videos;

create policy "creators insert own videos"
on public.videos
for insert
to authenticated
with check (
  creator_id = auth.uid()
);`,
  },
  {
    schemaname: 'public',
    tablename: 'videos',
    policyname: 'creators select own videos',
    cmd: 'SELECT',
    migrationSql: `drop policy if exists "creators select own videos" on public.videos;

create policy "creators select own videos"
on public.videos
for select
to authenticated
using (
  creator_id = auth.uid()
);`,
  },
  {
    schemaname: 'public',
    tablename: 'videos',
    policyname: 'creators update own videos',
    cmd: 'UPDATE',
    migrationSql: `drop policy if exists "creators update own videos" on public.videos;

create policy "creators update own videos"
on public.videos
for update
to authenticated
using (
  creator_id = auth.uid()
)
with check (
  creator_id = auth.uid()
);`,
  },
  {
    schemaname: 'public',
    tablename: 'videos',
    policyname: 'creators delete own videos',
    cmd: 'DELETE',
    migrationSql: `drop policy if exists "creators delete own videos" on public.videos;

create policy "creators delete own videos"
on public.videos
for delete
to authenticated
using (
  creator_id = auth.uid()
);`,
  },
  {
    schemaname: 'public',
    tablename: 'videos',
    policyname: 'public read approved videos',
    cmd: 'SELECT',
    migrationSql: `drop policy if exists "public read approved videos" on public.videos;

create policy "public read approved videos"
on public.videos
for select
to public
using (
  visibility = 'public'
  and upload_status = 'ready'
  and moderation_status in ('approved', 'pending')
);`,
  },
]



const EXPECTED_SCHEMA = {
  tables: {
    mai_accounts: {
      columns: {
        id: 'uuid',
        user_id: 'uuid',
        username: 'text',
        display_name: 'text',
        avatar_url: 'text',
        role: 'text',
        is_creator: 'boolean',
        created_at: 'timestamptz',
        updated_at: 'timestamptz',
      },
      rls: true,
    },
    profiles: {
      columns: {
        id: 'uuid',
        user_id: 'uuid',
        username: 'text',
        display_name: 'text',
        avatar_url: 'text',
        created_at: 'timestamptz',
      },
      rls: true,
    },
    videos: {
      columns: {
        id: 'uuid',
        creator_id: 'uuid',
        title: 'text',
        description: 'text',
        type: 'text',
        video_type: 'text',
        category: 'text',
        visibility: 'text',
        moderation_status: 'text',
        upload_status: 'text',
        video_url: 'text',
        audio_url: 'text',
        file_url: 'text',
        cover_url: 'text',
        album_cover_url: 'text',
        thumbnail_url: 'text',
        mux_playback_id: 'text',
        mux_thumbnail_url: 'text',
        mux_status: 'text',
        mux_upload_id: 'text',
        mux_asset_id: 'text',
        tracks: 'jsonb',
        duration_seconds: 'integer',
        view_count: 'bigint',
        like_count: 'bigint',
        gift_count: 'bigint',
        boost_score: 'numeric',
        fingerprint_id: 'text',
        copyright_status: 'text',
        copyright_match: 'jsonb',
        copyright_checked_at: 'timestamptz',
        created_at: 'timestamptz',
        updated_at: 'timestamptz',
      },
      rls: true,
    },
    video_gifts: {
      columns: {
        id: 'uuid',
        video_id: 'uuid',
        creator_id: 'uuid',
        sender_user_id: 'uuid',
        sender_id: 'uuid',
        receiver_id: 'uuid',
        amount_coins: 'bigint',
        gift_type: 'text',
        message: 'text',
        created_at: 'timestamptz',
        updated_at: 'timestamptz',
      },
      rls: true,
    },
    mai_wallets: {
      columns: {
        user_id: 'uuid',
        mai_coins: 'integer',
        lifetime_earned: 'integer',
        updated_at: 'timestamptz',
      },
      rls: true,
    },
    mai_coin_transactions: {
      columns: {
        id: 'uuid',
        user_id: 'uuid',
        amount: 'integer',
        transaction_type: 'text',
        source: 'text',
        metadata: 'jsonb',
        created_at: 'timestamptz',
      },
      rls: true,
    },
    mai_daily_login_rewards: {
      columns: {
        id: 'uuid',
        user_id: 'uuid',
        reward_date: 'date',
        coins_awarded: 'integer',
        created_at: 'timestamptz',
      },
      rls: true,
    },
    creator_fanbases: {
      columns: {
        id: 'uuid',
        creator_id: 'uuid',
        name: 'text',
        description: 'text',
        fan_count: 'integer',
        subscriber_count: 'integer',
        created_at: 'timestamptz',
        updated_at: 'timestamptz',
      },
      rls: true,
    },
    creator_merch_items: {
      columns: {
        id: 'uuid',
        creator_id: 'uuid',
        name: 'text',
        description: 'text',
        price: 'numeric',
        price_amount: 'numeric',
        currency: 'text',
        image_url: 'text',
        images: 'ARRAY',
        status: 'text',
        created_at: 'timestamptz',
        updated_at: 'timestamptz',
      },
      rls: true,
    },
    creator_live_sessions: {
      columns: {
        id: 'uuid',
        creator_id: 'uuid',
        title: 'text',
        description: 'text',
        status: 'text',
        started_at: 'timestamptz',
        ended_at: 'timestamptz',
        scheduled_at: 'timestamptz',
        mux_live_playback_id: 'text',
        agora_channel: 'text',
        created_at: 'timestamptz',
        updated_at: 'timestamptz',
      },
      rls: true,
    },
    admin_user_reports: {
      columns: {
        id: 'uuid',
        reporter_id: 'uuid',
        reported_user_id: 'uuid',
        target_user_id: 'uuid',
        report_type: 'text',
        description: 'text',
        status: 'text',
        created_at: 'timestamptz',
        updated_at: 'timestamptz',
      },
      rls: true,
    },
    admin_broadcast_reports: {
      columns: {
        id: 'uuid',
        reporter_id: 'uuid',
        stream_id: 'uuid',
        live_session_id: 'uuid',
        report_type: 'text',
        description: 'text',
        status: 'text',
        created_at: 'timestamptz',
        updated_at: 'timestamptz',
      },
      rls: true,
    },
    admin_support_tickets: {
      columns: {
        id: 'uuid',
        user_id: 'uuid',
        requester_id: 'uuid',
        subject: 'text',
        description: 'text',
        status: 'text',
        priority: 'text',
        created_at: 'timestamptz',
        updated_at: 'timestamptz',
      },
      rls: true,
    },
  },

  functions: {
    inspect_public_schema: {
      sql: '',
    },
    current_user_profile_id: {
      sql: `create or replace function public.current_user_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select m.id
  from public.profiles m
  where m.user_id = auth.uid()
     or m.id = auth.uid()
  limit 1;
$$;`,
    },
    claim_mai_daily_login_reward: {
      sql: `create or replace function public.claim_mai_daily_login_reward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_reward_date date;
  v_current_balance integer;
  v_claimed boolean := false;
  v_coins_awarded integer := 10;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;

  v_reward_date := current_date;

  if exists (
    select 1
    from public.mai_daily_login_rewards
    where user_id = v_user_id
      and reward_date = v_reward_date
  ) then
    select mai_coins
    into v_current_balance
    from public.mai_wallets
    where user_id = v_user_id;

    return jsonb_build_object(
      'claimed', false,
      'message', 'Already claimed today',
      'balance', coalesce(v_current_balance, 0),
      'next_claim_date', v_reward_date + interval '1 day'
    );
  end if;

  begin
    insert into public.mai_daily_login_rewards (user_id, reward_date, coins_awarded)
    values (v_user_id, v_reward_date, v_coins_awarded);

    insert into public.mai_wallets (user_id, mai_coins, lifetime_earned)
    values (v_user_id, v_coins_awarded, v_coins_awarded)
    on conflict (user_id) do update set
      mai_coins = public.mai_wallets.mai_coins + v_coins_awarded,
      lifetime_earned = public.mai_wallets.lifetime_earned + v_coins_awarded,
      updated_at = now()
    returning mai_coins
    into v_current_balance;

    insert into public.mai_coin_transactions (user_id, amount, transaction_type, source, metadata)
    values (
      v_user_id,
      v_coins_awarded,
      'daily_login_reward',
      'daily_login',
      jsonb_build_object('reward_date', v_reward_date)
    );

    v_claimed := true;

  exception
    when unique_violation then
      select mai_coins
      into v_current_balance
      from public.mai_wallets
      where user_id = v_user_id;

      return jsonb_build_object(
        'claimed', false,
        'message', 'Already claimed today',
        'balance', coalesce(v_current_balance, 0),
        'next_claim_date', v_reward_date + interval '1 day'
      );
  end;

  return jsonb_build_object(
    'claimed', v_claimed,
    'balance', coalesce(v_current_balance, 0),
    'coins_awarded', v_coins_awarded,
    'next_claim_date', v_reward_date + interval '1 day'
  );
end;
$$;`,
    },
    gift_creator_on_video: {
      sql: `create or replace function public.gift_creator_on_video(
  p_video_id uuid,
  p_sender_id uuid,
  p_amount_coins bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator_id uuid;
begin
  select creator_id
  into v_creator_id
  from public.videos
  where id = p_video_id;

  if v_creator_id is null then
    return jsonb_build_object('success', false, 'message', 'Video not found');
  end if;

  insert into public.video_gifts (
    video_id,
    creator_id,
    sender_id,
    receiver_id,
    amount_coins,
    gift_type
  )
  values (
    p_video_id,
    v_creator_id,
    p_sender_id,
    v_creator_id,
    p_amount_coins,
    'coin_gift'
  );

  return jsonb_build_object('success', true);
end;
$$;`,
    },
    increment_subscriber_count: {
      sql: '', // TODO: Define this function
    },
    boost_video: {
      sql: `create or replace function boost_video(
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
  v_sender_id := current_user_profile_id();
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
$$;`,
    },
    approve_creator_application: {
      sql: '', // TODO: Define this function
    },
    approve_custom_payout: {
      sql: `create or replace function approve_custom_payout(
  p_request_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_admin_id uuid;
  v_request record;
  v_edge_response record;
begin
  -- Check admin
  select id into v_admin_id from mai_accounts where user_id = auth.uid() and role in ('admin', 'moderator');
  if v_admin_id is null then
    raise exception 'Admin access required';
  end if;

  -- Get request
  select * into v_request from pending_payout_requests where id = p_request_id and status = 'pending';
  if v_request is null then
    raise exception 'Request not found or not pending';
  end if;

  -- Approve
  update pending_payout_requests
  set status = 'approved', approved_at = now(), admin_id = v_admin_id
  where id = p_request_id;

  -- TODO: Integrate PayPal payout via Edge Function or external service
end;
$$;`,
    },
    get_creator_supporters: {
      sql: `create or replace function get_creator_supporters(p_creator_id uuid)
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
$$;`,
    },
    get_creator_top_commenter: {
      sql: `create or replace function get_creator_top_commenter(p_creator_id uuid)
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
$$;`,
    },
    get_creator_top_liker: {
      sql: `create or replace function get_creator_top_liker(p_creator_id uuid)
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
$$;`,
    },
    request_custom_payout: {
      sql: `create or replace function request_custom_payout(
  p_requested_coins bigint,
  p_paypal_email text
)
returns void
language plpgsql
security definer
as $$
declare
  v_creator_id uuid;
  v_wallet_coins bigint;
  v_coin_value numeric := 0.005; -- $0.005 per coin
  v_requested_usd numeric;
  v_fee numeric;
begin
  -- Get creator
  select id into v_creator_id from mai_accounts where user_id = auth.uid() and is_creator = true;
  if v_creator_id is null then
    raise exception 'Creator account required';
  end if;

  -- Check wallet balance
  select mai_coins into v_wallet_coins from mai_wallets where user_id = auth.uid();
  if v_wallet_coins < p_requested_coins then
    raise exception 'Insufficient coins';
  end if;

  -- Calculate USD
  v_requested_usd := p_requested_coins * v_coin_value;

  -- Calculate fee based on tiers, max 10%
  if v_requested_usd <= 25 then
    v_fee := 1.00; -- Tier 1
  elsif v_requested_usd <= 75 then
    v_fee := 4.00; -- Tier 2 average
  elsif v_requested_usd <= 150 then
    v_fee := v_requested_usd * 0.08; -- Tier 3
  else
    v_fee := v_requested_usd * 0.10; -- Tiers 4-6
  end if;

  -- Insert request
  insert into pending_payout_requests (creator_id, requested_coins, requested_usd, fee, paypal_email)
  values (v_creator_id, p_requested_coins, v_requested_usd, v_fee, p_paypal_email);

  -- Deduct from wallet (hold)
  update mai_wallets set mai_coins = mai_coins - p_requested_coins where user_id = auth.uid();
end;
$$;`,
    },
  },

  foreignKeys: [
    {
      table: 'videos',
      column: 'creator_id',
      referencesSchema: 'public',
      referencesTable: 'profiles',
      referencesColumn: 'id',
    },
    {
      table: 'video_gifts',
      column: 'creator_id',
      referencesSchema: 'public',
      referencesTable: 'profiles',
      referencesColumn: 'id',
    },
    {
      table: 'video_gifts',
      column: 'sender_user_id',
      referencesSchema: 'public',
      referencesTable: 'profiles',
      referencesColumn: 'id',
    },
    {
      table: 'video_gifts',
      column: 'video_id',
      referencesSchema: 'public',
      referencesTable: 'videos',
      referencesColumn: 'id',
    },
    {
      table: 'mai_wallets',
      column: 'user_id',
      referencesSchema: 'auth',
      referencesTable: 'users',
      referencesColumn: 'id',
    },
    {
      table: 'mai_daily_login_rewards',
      column: 'user_id',
      referencesSchema: 'auth',
      referencesTable: 'users',
      referencesColumn: 'id',
    },
    {
      table: 'mai_coin_transactions',
      column: 'user_id',
      referencesSchema: 'auth',
      referencesTable: 'users',
      referencesColumn: 'id',
    },
    {
      table: 'mai_accounts',
      column: 'user_id',
      referencesSchema: 'auth',
      referencesTable: 'users',
      referencesColumn: 'id',
    },
    {
      table: 'creator_fanbases',
      column: 'creator_id',
      referencesSchema: 'public',
      referencesTable: 'mai_accounts',
      referencesColumn: 'id',
    },
    {
      table: 'creator_merch_items',
      column: 'creator_id',
      referencesSchema: 'public',
      referencesTable: 'mai_accounts',
      referencesColumn: 'id',
    },
    {
      table: 'creator_live_sessions',
      column: 'creator_id',
      referencesSchema: 'public',
      referencesTable: 'mai_accounts',
      referencesColumn: 'id',
    },
  ] satisfies ExpectedForeignKey[],
}

async function fetchExistingSchema() {
  const cacheBuster = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  const { data, error } = await supabase.rpc('inspect_public_schema', {
    p_cache_buster: cacheBuster,
  })

  if (error) throw error

  return {
    tables: new Set((data?.tables ?? []).map((item: any) => item.table_name)),
    columns: data?.columns ?? [],
    functions: new Set((data?.functions ?? []).map((item: any) => item.function_name)),
    foreignKeys: data?.foreign_keys ?? [],
    rls: data?.rls ?? [],
    checkConstraints: data?.check_constraints ?? [],
    buckets: data?.storage_buckets ?? [],
    policies: data?.policies ?? [],
  }
}

function normalizeForeignSchema(fk: any) {
  if (fk.foreign_schema) return fk.foreign_schema
  if (fk.foreign_table_name === 'users') return 'auth'
  return 'public'
}

function sqlTypeToColumnSql(type: string) {
  if (type === 'ARRAY') return 'text[]'
  if (type === 'timestamptz') return 'timestamp with time zone'
  return type
}

function makeMissingTableSql(table: string, config: any) {
  const columnSql = Object.entries(config.columns)
    .map(([column, type]) => {
      if (column === 'id') return '  id uuid primary key default gen_random_uuid()'
      if (column === 'tracks') return `  ${column} jsonb default '[]'::jsonb`
      if (column === 'visibility') return `  ${column} text default 'public'`
      if (column === 'upload_status') return `  ${column} text default 'ready'`
      return `  ${column} ${sqlTypeToColumnSql(String(type))}`
    })
    .join(',\n')

  return `create table if not exists public.${table} (
${columnSql}
);`
}

function makeMissingColumnSql(table: string, column: string, type: string) {
  if (table === 'videos' && column === 'tracks') {
    return `alter table public.videos
add column if not exists tracks jsonb default '[]'::jsonb;`
  }

  if (table === 'videos' && column === 'visibility') {
    return `alter table public.videos
add column if not exists visibility text default 'public';`
  }

  if (table === 'videos' && column === 'upload_status') {
    return `alter table public.videos
add column if not exists upload_status text default 'ready';`
  }

  return `alter table public.${table}
add column if not exists ${column} ${sqlTypeToColumnSql(type)};`
}

function makeMissingForeignKeySql(fk: ExpectedForeignKey) {
  const schema = fk.referencesSchema ?? 'public'

  return `alter table public.${fk.table}
add constraint ${fk.table}_${fk.column}_fkey
foreign key (${fk.column})
references ${schema}.${fk.referencesTable}(${fk.referencesColumn});`
}

function makeEnableRlsSql(table: string) {
  return `alter table public.${table} enable row level security;`
}

function foreignKeyExists(existingForeignKeys: any[], fk: ExpectedForeignKey) {
  return existingForeignKeys.some((existing) => {
    return (
      existing.table_name === fk.table &&
      existing.column_name === fk.column &&
      normalizeForeignSchema(existing) === (fk.referencesSchema ?? 'public') &&
      existing.foreign_table_name === fk.referencesTable &&
      existing.foreign_column_name === fk.referencesColumn
    )
  })
}

function policyExists(existingPolicies: any[], policy: ExpectedPolicy) {
  return existingPolicies.some((existing) => {
    return (
      existing.schemaname === policy.schemaname &&
      existing.tablename === policy.tablename &&
      existing.policyname === policy.policyname &&
      (!policy.cmd || existing.cmd === policy.cmd)
    )
  })
}

function bucketExists(existingBuckets: any[], bucket: ExpectedBucket) {
  return existingBuckets.some(
    (existing) => existing.id === bucket.id && Boolean(existing.public) === bucket.public
  )
}

function checkConstraintIncludesAll(definition: string | null | undefined, values: string[]) {
  const normalized = String(definition ?? '').toLowerCase()
  return values.every((value) => normalized.includes(`'${value.toLowerCase()}'`))
}

function makeVideoCategoryConstraintSql() {
  return `alter table public.videos
drop constraint if exists videos_category_check;

alter table public.videos
add constraint videos_category_check
check (
  category in (
    'music',
    'music_track',
    'music_album',
    'music_video',
    'video_music',
    'short',
    'movie',
    'film',
    'feature',
    'cars',
    'business',
    'gaming',
    'education',
    'entertainment'
  )
);`
}

function makeVideoTypeConstraintSql() {
  return `alter table public.videos
drop constraint if exists videos_video_type_check;

alter table public.videos
add constraint videos_video_type_check
check (
  video_type in (
    'music',
    'short',
    'music_video',
    'movie',
    'video'
  )
);`
}

function makeBucketsSql() {
  return `insert into storage.buckets (id, name, public)
values
  ('music-files', 'music-files', false),
  ('music-covers', 'music-covers', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;`
}

async function checkSchema(): Promise<Issue[]> {
  const issues: Issue[] = []
  const schema = await fetchExistingSchema()

  for (const [table, config] of Object.entries(EXPECTED_SCHEMA.tables)) {
    if (!schema.tables.has(table)) {
      issues.push({
        id: `missing-table-${table}`,
        type: 'missing_table',
        name: table,
        details: `Missing table public.${table}`,
        severity: 'critical',
        migrationSql: makeMissingTableSql(table, config),
      })
      continue
    }

    const existingColumns = schema.columns.filter((column: any) => column.table_name === table)
    const existingColumnNames = new Set(existingColumns.map((column: any) => column.column_name))

    for (const [column, type] of Object.entries((config as any).columns)) {
      if (!existingColumnNames.has(column)) {
        issues.push({
          id: `missing-column-${table}-${column}`,
          type: 'missing_column',
          name: `${table}.${column}`,
          details: `Missing column public.${table}.${column}`,
          severity: table === 'videos' ? 'critical' : 'high',
          migrationSql: makeMissingColumnSql(table, column, String(type)),
        })
      }
    }

    if (table === 'videos') {
      const typeColumn = existingColumns.find((column: any) => column.column_name === 'type')
      if (typeColumn && typeColumn.is_nullable === 'NO') {
        issues.push({
          id: 'not-null-videos-type',
          type: 'not_null_constraint',
          name: 'videos.type',
          details: 'videos.type is NOT NULL and can block new upload schemas',
          severity: 'high',
          migrationSql: `alter table public.videos
alter column type drop not null;`,
        })
      }
    }

    const tableRls = schema.rls.find((item: any) => item.table_name === table)
    if ((config as any).rls && tableRls && !tableRls.rls_enabled) {
      issues.push({
        id: `rls-disabled-${table}`,
        type: 'rls_disabled',
        name: table,
        details: `RLS is disabled on public.${table}`,
        severity: 'medium',
        migrationSql: makeEnableRlsSql(table),
      })
    }
  }

  const categoryConstraint = schema.checkConstraints.find(
    (constraint: any) =>
      constraint.table_name === 'videos' && constraint.constraint_name === 'videos_category_check'
  )

  if (
    !categoryConstraint ||
    !checkConstraintIncludesAll(categoryConstraint.definition, REQUIRED_VIDEO_CATEGORIES)
  ) {
    issues.push({
      id: 'invalid-check-videos-category',
      type: 'invalid_check_constraint',
      name: 'videos_category_check',
      details: 'videos_category_check does not allow all MaiPlay music/video categories',
      severity: 'critical',
      migrationSql: makeVideoCategoryConstraintSql(),
    })
  }

  const videoTypeConstraint = schema.checkConstraints.find(
    (constraint: any) =>
      constraint.table_name === 'videos' && constraint.constraint_name === 'videos_video_type_check'
  )

  if (
    !videoTypeConstraint ||
    !checkConstraintIncludesAll(videoTypeConstraint.definition, REQUIRED_VIDEO_TYPES)
  ) {
    issues.push({
      id: 'invalid-check-videos-video-type',
      type: 'invalid_check_constraint',
      name: 'videos_video_type_check',
      details: 'videos_video_type_check does not allow music, short, music_video, movie, and video',
      severity: 'critical',
      migrationSql: makeVideoTypeConstraintSql(),
    })
  }

  for (const bucket of EXPECTED_BUCKETS) {
    if (!bucketExists(schema.buckets, bucket)) {
      issues.push({
        id: `missing-bucket-${bucket.id}`,
        type: 'missing_bucket',
        name: bucket.id,
        details: `Missing or misconfigured storage bucket ${bucket.id}`,
        severity: 'critical',
        migrationSql: makeBucketsSql(),
      })
    }
  }

  for (const policy of [...EXPECTED_STORAGE_POLICIES, ...EXPECTED_VIDEO_POLICIES]) {
    if (!policyExists(schema.policies, policy)) {
      issues.push({
        id: `missing-policy-${policy.schemaname}-${policy.tablename}-${policy.policyname}`,
        type: 'missing_policy',
        name: `${policy.schemaname}.${policy.tablename}.${policy.policyname}`,
        details: `Missing policy "${policy.policyname}" on ${policy.schemaname}.${policy.tablename}`,
        severity: policy.schemaname === 'storage' ? 'critical' : 'high',
        migrationSql: policy.migrationSql,
      })
    }
  }

  for (const [functionName, config] of Object.entries(EXPECTED_SCHEMA.functions)) {
    if (!schema.functions.has(functionName)) {
      issues.push({
        id: `missing-function-${functionName}`,
        type: 'missing_function',
        name: functionName,
        details: `Missing RPC function public.${functionName}`,
        severity: 'critical',
        migrationSql: (config as any).sql,
      })
    }
  }

  for (const fk of EXPECTED_SCHEMA.foreignKeys) {
    const exists = foreignKeyExists(schema.foreignKeys, fk)

    if (!exists && schema.tables.has(fk.table)) {
      issues.push({
        id: `missing-fk-${fk.table}-${fk.column}`,
        type: 'missing_foreign_key',
        name: `${fk.table}.${fk.column}`,
        details: `Missing FK ${fk.table}.${fk.column} → ${fk.referencesSchema ?? 'public'}.${fk.referencesTable}.${fk.referencesColumn}`,
        severity: 'high',
        migrationSql: makeMissingForeignKeySql(fk),
      })
    }
  }

  return issues
}

export function SchemaMonitor() {
  const queryClient = useQueryClient()

  const {
    data: issues,
    error,
    refetch,
    isLoading,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['schema-monitor'],
    queryFn: checkSchema,
    refetchInterval: 30000,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  })

  const isRefreshing = isFetching && !isLoading

  const forceRefresh = async () => {
    // Clear all cached data and force a fresh schema check
    await queryClient.cancelQueries({ queryKey: ['schema-monitor'] })
    queryClient.removeQueries({ queryKey: ['schema-monitor'] })
    queryClient.clear()
    await refetch()
  }

  const generateMigration = () => {
    const seen = new Set<string>()
    const sql = (issues ?? [])
      .map((issue) => issue.migrationSql.trim())
      .filter(Boolean)
      .filter((migrationSql) => {
        if (seen.has(migrationSql)) return false
        seen.add(migrationSql)
        return true
      })
      .join('\n\n')

    return `${sql}\n\nnotify pgrst, 'reload schema';\n`
  }

  const downloadMigration = () => {
    const sql = generateMigration()
    const blob = new Blob([sql], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `schema-migration-${Date.now()}.sql`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateMigration())
  }

  const lastCheckedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : 'Not checked yet'

  if (isLoading) {
    return (
      <Card className="border-yellow-400/20 bg-black/50 p-6">
        <h2 className="text-xl font-black">Schema Monitor</h2>
        <p className="text-sm text-zinc-400">Inspecting database schema...</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-500/20 bg-black/50 p-6">
        <h2 className="text-xl font-black text-red-400">Schema Monitor Error</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Missing or outdated helper RPC: <code>inspect_public_schema</code>. Run the helper SQL below first.
        </p>

        <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-black/60 p-4 text-xs text-zinc-300">
          {INSPECT_PUBLIC_SCHEMA_SQL}
        </pre>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => navigator.clipboard.writeText(INSPECT_PUBLIC_SCHEMA_SQL)}
            className="bg-yellow-400 font-black text-black hover:bg-yellow-300"
          >
            Copy Helper SQL
          </Button>

          <Button
            onClick={forceRefresh}
            disabled={isFetching}
            variant="outline"
            className="border-yellow-400/30 text-yellow-300"
          >
            {isFetching ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      </Card>
    )
  }

  if (!issues || issues.length === 0) {
    return (
      <Card className="border-yellow-400/20 bg-black/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Schema Monitor</h2>
            <p className="text-sm text-zinc-400">
              {isRefreshing ? 'Refreshing schema...' : 'No schema issues detected'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Last checked: {lastCheckedLabel}</p>
          </div>

          <div
            className={`h-3 w-3 rounded-full ${
              isRefreshing ? 'animate-pulse bg-yellow-400' : 'bg-green-400'
            }`}
          />
        </div>

        <Button
          onClick={forceRefresh}
          disabled={isFetching}
          className="mt-4"
          variant="outline"
          size="sm"
        >
          {isFetching ? 'Refreshing...' : 'Refresh Check'}
        </Button>
      </Card>
    )
  }

  return (
    <Card className="border-red-500/20 bg-black/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-red-400">Schema Monitor</h2>
          <p className="text-sm text-zinc-400">
            {isRefreshing ? 'Refreshing schema...' : `${issues.length} issue(s) detected`}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Last checked: {lastCheckedLabel}</p>
        </div>

        <div
          className={`h-3 w-3 rounded-full ${
            isRefreshing ? 'animate-pulse bg-yellow-400' : 'animate-pulse bg-red-400'
          }`}
        />
      </div>

      <div className="mb-4 max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr>
              <th className="pb-2 text-left">Type</th>
              <th className="pb-2 text-left">Name</th>
              <th className="pb-2 text-left">Severity</th>
            </tr>
          </thead>

          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id} className="border-b border-white/5">
                <td className="py-2 text-xs">{issue.type}</td>
                <td className="py-2">{issue.name}</td>
                <td className="py-2">
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      issue.severity === 'critical'
                        ? 'bg-red-500/20 text-red-300'
                        : issue.severity === 'high'
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                    }`}
                  >
                    {issue.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={downloadMigration}
          disabled={isFetching}
          className="flex-1 bg-yellow-400 font-black text-black hover:bg-yellow-300"
        >
          Download Migration
        </Button>

        <Button
          onClick={copyToClipboard}
          disabled={isFetching}
          variant="outline"
          className="border-yellow-400/30 text-yellow-300"
        >
          Copy SQL
        </Button>

        <Button
          onClick={forceRefresh}
          disabled={isFetching}
          variant="outline"
          className="border-yellow-400/30 text-yellow-300"
        >
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
    </Card>
  )
}

const INSPECT_PUBLIC_SCHEMA_SQL = `create or replace function public.inspect_public_schema(p_cache_buster text default null)
returns jsonb
language sql
security definer
set search_path = public, information_schema, pg_catalog, storage
as $$
  select jsonb_build_object(
    'cache_buster', p_cache_buster,

    'tables', coalesce((
      select jsonb_agg(jsonb_build_object('table_name', table_name))
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
    ), '[]'::jsonb),

    'columns', coalesce((
      select jsonb_agg(jsonb_build_object(
        'table_name', table_name,
        'column_name', column_name,
        'data_type', data_type,
        'udt_name', udt_name,
        'is_nullable', is_nullable
      ))
      from information_schema.columns
      where table_schema = 'public'
    ), '[]'::jsonb),

    'functions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'function_name', p.proname,
        'args', pg_get_function_identity_arguments(p.oid)
      ))
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
    ), '[]'::jsonb),

    'foreign_keys', coalesce((
      select jsonb_agg(jsonb_build_object(
        'constraint_name', con.conname,
        'table_name', src.relname,
        'column_name', src_att.attname,
        'foreign_schema', tgt_ns.nspname,
        'foreign_table_name', tgt.relname,
        'foreign_column_name', tgt_att.attname
      ))
      from pg_constraint con
      join pg_class src on src.oid = con.conrelid
      join pg_namespace src_ns on src_ns.oid = src.relnamespace
      join pg_class tgt on tgt.oid = con.confrelid
      join pg_namespace tgt_ns on tgt_ns.oid = tgt.relnamespace
      join pg_attribute src_att on src_att.attrelid = con.conrelid and src_att.attnum = con.conkey[1]
      join pg_attribute tgt_att on tgt_att.attrelid = con.confrelid and tgt_att.attnum = con.confkey[1]
      where con.contype = 'f'
        and src_ns.nspname = 'public'
    ), '[]'::jsonb),

    'check_constraints', coalesce((
      select jsonb_agg(jsonb_build_object(
        'constraint_name', con.conname,
        'table_name', cls.relname,
        'definition', pg_get_constraintdef(con.oid)
      ))
      from pg_constraint con
      join pg_class cls on cls.oid = con.conrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
      where ns.nspname = 'public'
        and con.contype = 'c'
    ), '[]'::jsonb),

    'rls', coalesce((
      select jsonb_agg(jsonb_build_object(
        'table_name', c.relname,
        'rls_enabled', c.relrowsecurity,
        'rls_forced', c.relforcerowsecurity
      ))
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
    ), '[]'::jsonb),

    'storage_buckets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'public', b.public,
        'file_size_limit', b.file_size_limit,
        'allowed_mime_types', b.allowed_mime_types
      ))
      from storage.buckets b
    ), '[]'::jsonb),

    'policies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'schemaname', p.schemaname,
        'tablename', p.tablename,
        'policyname', p.policyname,
        'cmd', p.cmd,
        'roles', p.roles,
        'qual', p.qual,
        'with_check', p.with_check
      ))
      from pg_policies p
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.inspect_public_schema(text) to authenticated;
grant execute on function public.inspect_public_schema(text) to service_role;

notify pgrst, 'reload schema';`

EXPECTED_SCHEMA.functions.inspect_public_schema.sql = INSPECT_PUBLIC_SCHEMA_SQL