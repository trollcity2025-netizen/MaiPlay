-- Custom Payouts Migration
-- Adds support for custom cashout requests with admin approval

-- Pending Payout Requests Table
create table if not exists pending_payout_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id) on delete cascade,
  requested_coins bigint not null check (requested_coins > 0),
  requested_usd numeric(10,2) not null,
  fee numeric(10,2) default 0,
  paypal_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  rejection_reason text,
  created_at timestamp with time zone default now(),
  approved_at timestamp with time zone,
  paid_at timestamp with time zone,
  admin_id uuid references profiles(id)
);

-- Indexes
create index if not exists idx_pending_payouts_creator on pending_payout_requests(creator_id);
create index if not exists idx_pending_payouts_status on pending_payout_requests(status);

-- Enable RLS
alter table pending_payout_requests enable row level security;

-- RLS Policies
create policy "creators can view own pending requests" on pending_payout_requests for select using (
  creator_id = current_user_profile_id()
);
create policy "creators can insert own requests" on pending_payout_requests for insert with check (
  creator_id = current_user_profile_id()
);
create policy "admins can manage all requests" on pending_payout_requests for all using (
  exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin', 'moderator'))
);

-- RPC Function: Request Custom Payout
create or replace function request_custom_payout(
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
  select id into v_creator_id from profiles where user_id = auth.uid() and is_creator = true;
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
$$;

-- RPC Function: Approve Custom Payout
create or replace function approve_custom_payout(
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
  select id into v_admin_id from profiles where user_id = auth.uid() and role in ('admin', 'moderator');
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
$$;

-- User Perks Table
create table if not exists user_perks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  perk_type text not null check (perk_type in ('offline_downloads')),
  active boolean not null default true,
  created_at timestamp with time zone default now(),
  unique(user_id, perk_type)
);

-- Indexes for user_perks
create index if not exists idx_user_perks_user on user_perks(user_id);
create index if not exists idx_user_perks_active on user_perks(active) where active = true;

-- RLS for user_perks
alter table user_perks enable row level security;
create policy "users can view own perks" on user_perks for select using (user_id = current_user_profile_id());
create policy "users can insert own perks" on user_perks for insert with check (user_id = current_user_profile_id());
