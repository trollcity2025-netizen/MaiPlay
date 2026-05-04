-- MaiPlay Live + Subscription + Fanbase + Commerce + Safety (additive)
create extension if not exists "uuid-ossp" schema extensions;

-- =========================
-- Live Scheduling Core
-- =========================
create table if not exists creator_live_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  category text,
  thumbnail_url text,
  scheduled_start_at timestamptz not null,
  scheduled_duration_minutes integer not null default 60 check (scheduled_duration_minutes > 0 and scheduled_duration_minutes <= 60),
  status text not null default 'scheduled' check (status in ('scheduled','live','ended','cancelled')),
  agora_channel text,
  mux_live_playback_id text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creator_live_sessions_creator_day on creator_live_sessions(creator_id, scheduled_start_at);
create index if not exists idx_creator_live_sessions_status on creator_live_sessions(status, scheduled_start_at);

create table if not exists creator_live_daily_usage (
  creator_id uuid not null references profiles(id) on delete cascade,
  usage_date date not null,
  minutes_used integer not null default 0 check (minutes_used >= 0 and minutes_used <= 60),
  updated_at timestamptz not null default now(),
  primary key (creator_id, usage_date)
);

create table if not exists live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references creator_live_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  is_priority boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_chat_messages_session_created on live_chat_messages(live_session_id, created_at desc);

create table if not exists live_global_ticker_items (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references creator_live_sessions(id) on delete cascade,
  item_type text not null check (item_type in ('gift','promo','system')),
  payload jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists live_pinned_items (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references creator_live_sessions(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  item_type text not null check (item_type in ('short','movie','merch','top_fan')),
  target_id uuid,
  route_path text not null,
  thumbnail_url text,
  title text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_live_pinned_items_session_active on live_pinned_items(live_session_id, is_active, sort_order);

-- =========================
-- Co-host System
-- =========================
create table if not exists live_cohost_requests (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references creator_live_sessions(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','revoked')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id)
);

create unique index if not exists idx_live_cohost_unique_pending on live_cohost_requests(live_session_id, requester_id, status);

create table if not exists live_cohosts (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references creator_live_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  added_by uuid not null references profiles(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  unique(live_session_id, user_id)
);

-- =========================
-- BroadOfficer System
-- =========================
create table if not exists creator_broadofficers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  assigned_by uuid not null references profiles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(creator_id, user_id)
);

create table if not exists live_user_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  live_session_id uuid references creator_live_sessions(id) on delete set null,
  target_user_id uuid not null references profiles(id) on delete cascade,
  actor_user_id uuid not null references profiles(id) on delete cascade,
  action_type text not null check (action_type in ('chat_disabled','kick','ban_1_week','ban_1_month','ban_permanent','report_to_admin')),
  reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_user_moderation_target on live_user_moderation_actions(creator_id, target_user_id, created_at desc);

create table if not exists creator_broadcast_bans (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  ban_type text not null check (ban_type in ('week','month','permanent')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique(creator_id, user_id, active)
);

-- =========================
-- Admin Safety Dashboard
-- =========================
create table if not exists admin_user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete set null,
  target_user_id uuid not null references profiles(id) on delete cascade,
  live_session_id uuid references creator_live_sessions(id) on delete set null,
  reason text,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_broadcast_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete set null,
  live_session_id uuid not null references creator_live_sessions(id) on delete cascade,
  reason text,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_support_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  subject text not null,
  details text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_report_notes (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('user','broadcast','support')),
  report_id uuid not null,
  admin_id uuid not null references profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_action_history (
  id uuid primary key default gen_random_uuid(),
  actor_admin_id uuid references profiles(id) on delete set null,
  action_type text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_user_reports_status on admin_user_reports(status, created_at desc);
create index if not exists idx_admin_broadcast_reports_status on admin_broadcast_reports(status, created_at desc);
create index if not exists idx_admin_support_tickets_status on admin_support_tickets(status, created_at desc);

-- =========================
-- Creator Fanbase
-- =========================
create table if not exists creator_fanbases (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null unique references profiles(id) on delete cascade,
  name text not null default 'Fanbase',
  description text,
  is_free boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fanbase_memberships (
  id uuid primary key default gen_random_uuid(),
  fanbase_id uuid not null references creator_fanbases(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(fanbase_id, user_id)
);

create table if not exists fanbase_top_fans (
  id uuid primary key default gen_random_uuid(),
  fanbase_id uuid not null references creator_fanbases(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  pinned_by_creator_id uuid not null references profiles(id) on delete cascade,
  highlight_note text,
  created_at timestamptz not null default now(),
  unique(fanbase_id, user_id)
);

-- =========================
-- Commerce
-- =========================
create table if not exists creator_merch_items (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  images jsonb not null default '[]'::jsonb,
  inventory integer not null default 0 check (inventory >= 0),
  shipping_option text not null check (shipping_option in ('creator_covers','buyer_covers')),
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creator_merch_creator_status on creator_merch_items(creator_id, status, created_at desc);

create table if not exists creator_merch_pins (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  merch_item_id uuid not null references creator_merch_items(id) on delete cascade,
  surface text not null check (surface in ('broadcast_page','movie_page','shorts_page')),
  target_video_id uuid references videos(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(creator_id, merch_item_id, surface, target_video_id)
);

-- =========================
-- Subscription System
-- =========================
create table if not exists creator_subscription_tiers (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  tier_name text not null,
  price_coins integer not null check (price_coins > 0),
  perks jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_subscription_tiers_creator on creator_subscription_tiers(creator_id, is_active);

create table if not exists user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  tier_id uuid not null references creator_subscription_tiers(id) on delete restrict,
  start_date timestamptz not null,
  end_date timestamptz not null,
  auto_renew boolean not null default true,
  status text not null check (status in ('active','grace','expired','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, creator_id)
);

create index if not exists idx_user_subscriptions_user_creator on user_subscriptions(user_id, creator_id);
create index if not exists idx_user_subscriptions_renewal on user_subscriptions(status, auto_renew, end_date);

create table if not exists subscription_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  creator_id uuid not null references profiles(id) on delete cascade,
  tier_id uuid not null references creator_subscription_tiers(id) on delete restrict,
  coins_spent integer not null check (coins_spent > 0),
  renewal_cycle_started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_subscription_transactions_user on subscription_transactions(user_id, created_at desc);

-- =========================
-- Constraints/Triggers
-- =========================
create or replace function set_updated_at_now()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_creator_live_sessions_updated_at on creator_live_sessions;
create trigger trg_creator_live_sessions_updated_at before update on creator_live_sessions for each row execute function set_updated_at_now();
drop trigger if exists trg_live_pinned_items_updated_at on live_pinned_items;
create trigger trg_live_pinned_items_updated_at before update on live_pinned_items for each row execute function set_updated_at_now();
drop trigger if exists trg_admin_user_reports_updated_at on admin_user_reports;
create trigger trg_admin_user_reports_updated_at before update on admin_user_reports for each row execute function set_updated_at_now();
drop trigger if exists trg_admin_broadcast_reports_updated_at on admin_broadcast_reports;
create trigger trg_admin_broadcast_reports_updated_at before update on admin_broadcast_reports for each row execute function set_updated_at_now();
drop trigger if exists trg_admin_support_tickets_updated_at on admin_support_tickets;
create trigger trg_admin_support_tickets_updated_at before update on admin_support_tickets for each row execute function set_updated_at_now();
drop trigger if exists trg_creator_fanbases_updated_at on creator_fanbases;
create trigger trg_creator_fanbases_updated_at before update on creator_fanbases for each row execute function set_updated_at_now();
drop trigger if exists trg_creator_merch_items_updated_at on creator_merch_items;
create trigger trg_creator_merch_items_updated_at before update on creator_merch_items for each row execute function set_updated_at_now();
drop trigger if exists trg_user_subscriptions_updated_at on user_subscriptions;
create trigger trg_user_subscriptions_updated_at before update on user_subscriptions for each row execute function set_updated_at_now();

-- limit creator daily scheduled duration to 60 min
create or replace function enforce_creator_daily_live_limit()
returns trigger
language plpgsql
as $$
declare
  v_total integer;
  v_date date;
begin
  v_date := (new.scheduled_start_at at time zone 'utc')::date;

  select coalesce(sum(scheduled_duration_minutes), 0)
  into v_total
  from creator_live_sessions
  where creator_id = new.creator_id
    and (scheduled_start_at at time zone 'utc')::date = v_date
    and status = 'scheduled'
    and (tg_op = 'INSERT' or id <> new.id);

  if (v_total + new.scheduled_duration_minutes) > 60 then
    raise exception 'Creator daily live limit of 60 minutes exceeded';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_creator_daily_live_limit on creator_live_sessions;
create trigger trg_enforce_creator_daily_live_limit
before insert or update on creator_live_sessions
for each row execute function enforce_creator_daily_live_limit();

-- =========================
-- RLS Helper Functions
-- =========================
create or replace function current_user_profile_id()
returns uuid
language sql
security definer
as $$
  select id from profiles where user_id = auth.uid();
$$;

-- =========================
-- RLS
-- =========================
alter table creator_live_sessions enable row level security;
alter table creator_live_daily_usage enable row level security;
alter table live_chat_messages enable row level security;
alter table live_global_ticker_items enable row level security;
alter table live_pinned_items enable row level security;
alter table live_cohost_requests enable row level security;
alter table live_cohosts enable row level security;
alter table creator_broadofficers enable row level security;
alter table live_user_moderation_actions enable row level security;
alter table creator_broadcast_bans enable row level security;
alter table admin_user_reports enable row level security;
alter table admin_broadcast_reports enable row level security;
alter table admin_support_tickets enable row level security;
alter table admin_report_notes enable row level security;
alter table admin_action_history enable row level security;
alter table creator_fanbases enable row level security;
alter table fanbase_memberships enable row level security;
alter table fanbase_top_fans enable row level security;
alter table creator_merch_items enable row level security;
alter table creator_merch_pins enable row level security;
alter table creator_subscription_tiers enable row level security;
alter table user_subscriptions enable row level security;
alter table subscription_transactions enable row level security;

-- subscription policies
create policy "tiers viewable by everyone" on creator_subscription_tiers for select using (is_active = true or creator_id = current_user_profile_id());
create policy "creators manage own tiers" on creator_subscription_tiers for all using (creator_id = current_user_profile_id()) with check (creator_id = current_user_profile_id());

create policy "users view own subscriptions" on user_subscriptions for select using (user_id = current_user_profile_id());
create policy "creators view creator subscriptions" on user_subscriptions for select using (creator_id = current_user_profile_id());
create policy "users can cancel auto renew only" on user_subscriptions for update using (user_id = current_user_profile_id()) with check (user_id = current_user_profile_id());

create policy "transactions read own or creator" on subscription_transactions for select using (user_id = current_user_profile_id() or creator_id = current_user_profile_id());
create policy "transactions insert service role only" on subscription_transactions for insert with check (auth.role() = 'service_role');

-- live policies
create policy "live sessions public read" on creator_live_sessions for select using (true);
create policy "creator manages own live sessions" on creator_live_sessions for all using (creator_id = current_user_profile_id()) with check (creator_id = current_user_profile_id());

create policy "live pinned items public read" on live_pinned_items for select using (true);
create policy "creator manages own pinned items" on live_pinned_items for all using (creator_id = current_user_profile_id()) with check (creator_id = current_user_profile_id());

create policy "live chat public read" on live_chat_messages for select using (true);
create policy "live chat authenticated insert" on live_chat_messages for insert with check (user_id = current_user_profile_id());

create policy "cohost requests own read" on live_cohost_requests for select using (requester_id = current_user_profile_id() or exists (select 1 from creator_live_sessions s where s.id = live_cohost_requests.live_session_id and s.creator_id = current_user_profile_id()));
create policy "cohost request insert own" on live_cohost_requests for insert with check (requester_id = current_user_profile_id());

-- fanbase policies
create policy "fanbase public read" on creator_fanbases for select using (true);
create policy "creator manages fanbase" on creator_fanbases for all using (creator_id = current_user_profile_id()) with check (creator_id = current_user_profile_id());

create policy "fanbase memberships read" on fanbase_memberships for select using (true);
create policy "fan joins self" on fanbase_memberships for insert with check (user_id = current_user_profile_id());

create policy "top fans public read" on fanbase_top_fans for select using (true);
create policy "creator manages top fans" on fanbase_top_fans for all using (pinned_by_creator_id = current_user_profile_id()) with check (pinned_by_creator_id = current_user_profile_id());

-- commerce policies
create policy "merch public active read" on creator_merch_items for select using (status = 'active' or creator_id = current_user_profile_id());
create policy "creator manages merch" on creator_merch_items for all using (creator_id = current_user_profile_id()) with check (creator_id = current_user_profile_id());

create policy "merch pins public read" on creator_merch_pins for select using (is_active = true or creator_id = current_user_profile_id());
create policy "creator manages merch pins" on creator_merch_pins for all using (creator_id = current_user_profile_id()) with check (creator_id = current_user_profile_id());

-- admin policies
create policy "admins read user reports" on admin_user_reports for select using (exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin','moderator')));
create policy "users create reports" on admin_user_reports for insert with check (reporter_id = current_user_profile_id());
create policy "admins update user reports" on admin_user_reports for update using (exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin','moderator')));

create policy "admins read broadcast reports" on admin_broadcast_reports for select using (exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin','moderator')));
create policy "users create broadcast reports" on admin_broadcast_reports for insert with check (reporter_id = current_user_profile_id());
create policy "admins update broadcast reports" on admin_broadcast_reports for update using (exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin','moderator')));

create policy "admins read support" on admin_support_tickets for select using (exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin','moderator')) or requester_id = current_user_profile_id());
create policy "users create support" on admin_support_tickets for insert with check (requester_id = current_user_profile_id());
create policy "admins update support" on admin_support_tickets for update using (exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin','moderator')));

create policy "admins notes manage" on admin_report_notes for all using (exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin','moderator'))) with check (exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin','moderator')));
create policy "admins action history read" on admin_action_history for select using (exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin','moderator')));
create policy "admins action history insert" on admin_action_history for insert with check (exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin','moderator')) or auth.role() = 'service_role');
