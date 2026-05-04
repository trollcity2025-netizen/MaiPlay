-- Creator Unlock Economy System Tables

-- Add unlock fields to profiles table
alter table profiles add column if not exists can_upload_movies boolean default false;
alter table profiles add column if not exists unlock_type text check (unlock_type in ('community', 'growth', 'paid'));
alter table profiles add column if not exists unlock_unlocked_at timestamp with time zone;

-- Creator Unlocks table (tracks unlock status)
create table if not exists creator_unlocks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles on delete cascade unique,
  unlock_type text check (unlock_type in ('community', 'growth', 'paid')),
  coins_progress integer default 0,
  unique_gifters_count integer default 0,
  unlocked_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Creator Gifters (tracks unique gifters for anti-abuse)
create table if not exists creator_gifters (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references profiles on delete cascade,
  sender_user_id uuid references profiles on delete cascade,
  coins_sent integer not null default 0,
  created_at timestamp with time zone default now(),
  unique(creator_id, sender_user_id)
);

-- Creator Progress Cache (for performance)
create table if not exists creator_progress_cache (
  creator_id uuid primary key references profiles on delete cascade,
  total_views integer default 0,
  total_subscribers integer default 0,
  unique_gifters_count integer default 0,
  coins_progress integer default 0,
  last_updated timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_creator_unlocks_user_id on creator_unlocks(user_id);
create index if not exists idx_creator_gifters_creator_id on creator_gifters(creator_id);
create index if not exists idx_creator_gifters_sender on creator_gifters(sender_user_id);
create index if not exists idx_coin_transactions_type on coin_transactions(type);
create index if not exists idx_coin_transactions_reference on coin_transactions(reference_id);

-- RLS Policies for new tables
alter table creator_unlocks enable row level security;
alter table creator_gifters enable row level security;
alter table creator_progress_cache enable row level security;

drop policy if exists "Unlocks viewable by everyone" on creator_unlocks;
drop policy if exists "Users can upsert their own unlock" on creator_unlocks;
drop policy if exists "Users can update their own unlock" on creator_unlocks;
drop policy if exists "Gifters viewable by everyone" on creator_gifters;
drop policy if exists "Users can insert gift records" on creator_gifters;
drop policy if exists "Progress cache viewable by everyone" on creator_progress_cache;
drop policy if exists "Users can upsert their own progress" on creator_progress_cache;
drop policy if exists "Users can update their own progress" on creator_progress_cache;

-- Creator Unlocks policies
create policy "Unlocks viewable by everyone" on creator_unlocks for select using (true);
create policy "Users can upsert their own unlock" on creator_unlocks for insert with check (current_profile_id() = user_id);
create policy "Users can update their own unlock" on creator_unlocks for update using (current_profile_id() = user_id);

-- Creator Gifters policies
create policy "Gifters viewable by everyone" on creator_gifters for select using (true);
create policy "Users can insert gift records" on creator_gifters for insert with check (current_profile_id() = sender_user_id);

-- Progress Cache policies
create policy "Progress cache viewable by everyone" on creator_progress_cache for select using (true);
create policy "Users can upsert their own progress" on creator_progress_cache for insert with check (current_profile_id() = creator_id);
create policy "Users can update their own progress" on creator_progress_cache for update using (current_profile_id() = creator_id);

-- Function to update progress cache on gift
create or replace function update_creator_progress_on_gift(
  p_creator_id uuid,
  p_sender_id uuid,
  p_coins integer
) returns void as $$
begin
  -- Update or insert creator_progress_cache
  insert into creator_progress_cache (
    creator_id,
    unique_gifters_count,
    coins_progress,
    last_updated
  )
  values (
    p_creator_id,
    1,
    p_coins,
    now()
  )
  on conflict (creator_id) do update set
    unique_gifters_count = (
      select count(distinct sender_user_id)
      from creator_gifters
      where creator_id = p_creator_id
    ),
    coins_progress = creator_progress_cache.coins_progress + p_coins,
    last_updated = now();

  -- Check for unlock threshold
  if (select coins_progress from creator_progress_cache where creator_id = p_creator_id) >= 50000 and
     (select unique_gifters_count from creator_progress_cache where creator_id = p_creator_id) >= 50 then
    update profiles set
      can_upload_movies = true,
      unlock_type = 'community',
      unlock_unlocked_at = now()
    where id = p_creator_id;

    insert into creator_unlocks (user_id, unlock_type, coins_progress, unique_gifters_count, unlocked_at)
    values (p_creator_id, 'community', 50000, (select unique_gifters_count from creator_progress_cache where creator_id = p_creator_id), now())
    on conflict (user_id) do update set
      unlock_type = 'community',
      coins_progress = 50000,
      unique_gifters_count = excluded.unique_gifters_count,
      unlocked_at = now();
  end if;
end;
$$ language plpgsql;

-- Trigger for coin transactions
create or replace function handle_coin_transaction_insert()
returns trigger as $$
begin
  -- Only process outgoing gift transactions for movie unlock progress
  if NEW.type = 'gift' and NEW.amount < 0 then
    -- Prevent self-gifting
    if NEW.user_id != (select creator_id from videos where id = NEW.reference_id) then
      perform update_creator_progress_on_gift(
        (select creator_id from videos where id = NEW.reference_id),
        NEW.user_id,
        abs(NEW.amount)
      );

      -- Insert into creator_gifters
      insert into creator_gifters (creator_id, sender_user_id, coins_sent)
      values (
        (select creator_id from videos where id = NEW.reference_id),
        NEW.user_id,
        abs(NEW.amount)
      )
      on conflict (creator_id, sender_user_id) do update
      set coins_sent = creator_gifters.coins_sent + abs(NEW.amount);
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists coin_transaction_after_insert on coin_transactions;
create trigger coin_transaction_after_insert
  after insert on coin_transactions
  for each row execute function handle_coin_transaction_insert();
