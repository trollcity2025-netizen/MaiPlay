 -- Creator Application and Permission System

-- Track creator applications
create table if not exists creator_applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  profile_id uuid,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'auto_approved')),
  application_type text default 'standard' check (application_type in ('auto_approved', 'standard')),
  applied_at timestamp with time zone default now(),
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  rejection_reason text,
  -- Requirements tracking for standard applications
  requirement_days_active integer default 0,
  requirement_fans_count integer default 0,
  requirement_shorts_count integer default 0,
  requirement_total_views integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

 -- Add foreign key from creator_applications.user_id to profiles for PostgREST relationship navigation
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'creator_applications_user_id_fkey'
  ) then
    alter table creator_applications add constraint creator_applications_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade;
  end if;
end $$;

-- Add foreign key from creator_applications.profile_id to profiles for PostgREST relationship navigation
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'creator_applications_profile_id_fkey'
  ) then
    alter table creator_applications add constraint creator_applications_profile_id_fkey foreign key (profile_id) references profiles(id) on delete cascade;
  end if;
end $$;

-- Add foreign key from videos.creator_id to profiles for PostgREST relationship navigation
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'videos_creator_id_fkey'
  ) then
    alter table videos add constraint videos_creator_id_fkey foreign key (creator_id) references profiles(id) on delete cascade;
  end if;
end $$;

 -- Track movie upload permissions (paid feature)
create table if not exists creator_movie_permissions (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid,
  purchased_at timestamp with time zone default now(),
  expires_at timestamp with time zone,
  payment_id text unique, -- PayPal payment ID
  amount_paid decimal(10,2),
  currency text default 'USD',
  status text default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

 -- Add foreign key from creator_movie_permissions.profile_id to profiles
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'creator_movie_permissions_profile_id_fkey'
  ) then
    alter table creator_movie_permissions add constraint creator_movie_permissions_profile_id_fkey foreign key (profile_id) references profiles(id) on delete cascade;
  end if;
end $$;

-- Add foreign key from platform_revenue.profile_id to profiles
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'platform_revenue_profile_id_fkey'
  ) then
    alter table platform_revenue add constraint platform_revenue_profile_id_fkey foreign key (profile_id) references profiles(id) on delete cascade;
  end if;
end $$;

-- Add foreign key from platform_revenue.user_id to profiles
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'platform_revenue_user_id_fkey'
  ) then
    alter table platform_revenue add constraint platform_revenue_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade;
  end if;
end $$;

-- MAI Circle subscription plans (creator-defined subscriptions)
create table if not exists mai_circle_plans (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid,
  name text not null,
  description text,
  price_coins integer not null, -- MAI coins per month
  price_usd decimal(10,2), -- USD equivalent
  features jsonb default '[]', -- array of feature strings
  is_active boolean default true,
  subscriber_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add foreign key from mai_circle_plans.creator_id to profiles
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'mai_circle_plans_creator_id_fkey'
  ) then
    alter table mai_circle_plans add constraint mai_circle_plans_creator_id_fkey foreign key (creator_id) references profiles(id) on delete cascade;
  end if;
end $$;

-- MAI Circle subscriptions
create table if not exists mai_circle_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  subscriber_id uuid,
  plan_id uuid,
  creator_id uuid,
  start_date timestamp with time zone default now(),
  end_date timestamp with time zone,
  status text default 'active' check (status in ('active', 'expired', 'cancelled')),
  auto_renew boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add foreign key from mai_circle_subscriptions.subscriber_id to profiles
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'mai_circle_subscriptions_subscriber_id_fkey'
  ) then
    alter table mai_circle_subscriptions add constraint mai_circle_subscriptions_subscriber_id_fkey foreign key (subscriber_id) references profiles(id) on delete cascade;
  end if;
end $$;

-- Add foreign key from mai_circle_subscriptions.creator_id to profiles
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'mai_circle_subscriptions_creator_id_fkey'
  ) then
    alter table mai_circle_subscriptions add constraint mai_circle_subscriptions_creator_id_fkey foreign key (creator_id) references profiles(id) on delete cascade;
  end if;
end $$;

-- Add foreign key from mai_circle_subscriptions.plan_id to mai_circle_plans
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'mai_circle_subscriptions_plan_id_fkey'
  ) then
    alter table mai_circle_subscriptions add constraint mai_circle_subscriptions_plan_id_fkey foreign key (plan_id) references mai_circle_plans(id) on delete cascade;
  end if;
end $$;

-- Indexes
create index if not exists idx_creator_applications_user_id on creator_applications(user_id);
create index if not exists idx_creator_applications_status on creator_applications(status);
create index if not exists idx_creator_movie_permissions_profile_id on creator_movie_permissions(profile_id);
create index if not exists idx_platform_revenue_created_at on platform_revenue(created_at);
create index if not exists idx_mai_circle_plans_creator_id on mai_circle_plans(creator_id);
create index if not exists idx_mai_circle_subscriptions_subscriber_id on mai_circle_subscriptions(subscriber_id);
create index if not exists idx_mai_circle_subscriptions_creator_id on mai_circle_subscriptions(creator_id);

 -- Enable RLS
alter table creator_applications enable row level security;
alter table creator_movie_permissions enable row level security;
alter table platform_revenue enable row level security;
alter table mai_circle_plans enable row level security;
alter table mai_circle_subscriptions enable row level security;

-- Drop existing policies to avoid conflicts (idempotent)
drop policy if exists "Users can view own applications" on creator_applications;
drop policy if exists "Admins can manage applications" on creator_applications;
drop policy if exists "Users can view own movie permissions" on creator_movie_permissions;
drop policy if exists "Admins can view platform revenue" on platform_revenue;
drop policy if exists "Public can view MAI Circle plans" on mai_circle_plans;
drop policy if exists "Creators can manage own plans" on mai_circle_plans;
drop policy if exists "Users can view own subscriptions" on mai_circle_subscriptions;

 -- Creator applications: users can view their own, admins can view all
create policy "Users can view own applications" on creator_applications
  for select using (auth.uid() = user_id);

create policy "Admins can manage applications" on creator_applications
  for all using (
    exists (
      select 1 from profiles
      where user_id = auth.uid()
      and (role = 'admin' or role = 'ceo')
    )
  );

-- Movie permissions: users can view their own
create policy "Users can view own movie permissions" on creator_movie_permissions
  for select using (
    exists (
      select 1 from profiles
      where id = creator_movie_permissions.profile_id
      and user_id = auth.uid()
    )
  );

-- Platform revenue: only admins can view
create policy "Admins can view platform revenue" on platform_revenue
  for select using (
    exists (
      select 1 from profiles
      where user_id = auth.uid()
      and (role = 'admin' or role = 'ceo')
    )
  );

 -- MAI Circle plans: public read, creators can manage their own
create policy "Public can view MAI Circle plans" on mai_circle_plans
  for select using (true);

create policy "Creators can manage own plans" on mai_circle_plans
  for all using (
    exists (
      select 1 from profiles
      where id = mai_circle_plans.creator_id
      and user_id = auth.uid()
    )
  );

-- MAI Circle subscriptions: subscribers and creators can view relevant subscriptions
create policy "Users can view own subscriptions" on mai_circle_subscriptions
  for select using (
    exists (
      select 1 from profiles p1
      where p1.id = mai_circle_subscriptions.subscriber_id
      and p1.user_id = auth.uid()
    ) or
    exists (
      select 1 from profiles p2
      where p2.id = mai_circle_subscriptions.creator_id
      and p2.user_id = auth.uid()
    )
  );

 -- Functions for creator approval logic
create or replace function check_creator_requirements(user_uuid uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  mai_account_record record;
  days_active integer;
  fans_count integer;
  shorts_count integer;
total_views integer;
begin
  -- Get mai_account
  select * into mai_account_record
  from profiles
  where user_id = user_uuid;

  if not found then
    return false;
  end if;

  -- Calculate days active
  select extract(epoch from (now() - mai_account_record.created_at)) / 86400 into days_active;

  -- Count fans (subscriptions)
  select count(*) into fans_count
  from fanbase_memberships
  where creator_id = mai_account_record.id;

  -- Count shorts and total views
  select
    count(*) filter (where video_type = 'short'),
    coalesce(sum(view_count), 0)
  into shorts_count, total_views
  from videos
  where creator_id = mai_account_record.id
  and visibility = 'public'
  and upload_status = 'ready'
  and moderation_status = 'approved';

  -- Update application with current stats
  update creator_applications
  set
    requirement_days_active = days_active,
    requirement_fans_count = fans_count,
    requirement_shorts_count = shorts_count,
    requirement_total_views = total_views,
    updated_at = now()
  where user_id = user_uuid
  and status = 'pending';

  -- Check requirements: 3 days, 100 fans, 4 shorts, 200 views per short (800 total)
  return days_active >= 3
     and fans_count >= 100
     and shorts_count >= 4
     and total_views >= 800;
end;
$$;

-- Function to auto-approve creators who meet requirements
create or replace function auto_approve_creator()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Check if user meets requirements and has pending application
  if check_creator_requirements(new.user_id) then
    -- Update application status
    update creator_applications
    set status = 'approved', approved_at = now(), updated_at = now()
    where user_id = new.user_id and status = 'pending';

    -- Update mai_account to creator
    update profiles
    set is_creator = true, updated_at = now()
    where user_id = new.user_id;
  end if;

  return new;
end;
$$;

-- Trigger to check creator requirements on login (simplified - would need to be called from app)
-- For now, we'll check periodically or on specific events
