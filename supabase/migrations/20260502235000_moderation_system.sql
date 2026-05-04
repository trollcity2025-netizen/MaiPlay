-- Moderation System Migration
-- Adds tables and functions for moderator management, reporting, and moderation actions

-- Moderator Profiles Table
create table if not exists mai_moderator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_by uuid references profiles(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id)
);

-- Moderator Permissions Table
create table if not exists mai_moderator_permissions (
  id uuid primary key default gen_random_uuid(),
  moderator_user_id uuid not null references profiles(id) on delete cascade,
  permission text not null check (permission in ('can_review_reports', 'can_hide_video', 'can_delete_video', 'can_disable_live_chat', 'can_remove_chat_message', 'can_timeout_user', 'can_suspend_user', 'can_ban_user', 'can_end_live', 'can_ban_from_live', 'can_review_support_tickets')),
  created_at timestamp with time zone default now(),
  unique(moderator_user_id, permission)
);

-- Reports Table
create table if not exists mai_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete set null,
  reported_user_id uuid references profiles(id) on delete cascade,
  content_type text not null check (content_type in ('video', 'live', 'chat', 'comment', 'profile')),
  content_id uuid,
  reason text,
  details text,
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'rejected')),
  assigned_moderator_id uuid references profiles(id),
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone
);

-- Moderation Actions Log
create table if not exists mai_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references profiles(id),
  target_user_id uuid references profiles(id) on delete cascade,
  content_type text check (content_type in ('video', 'live', 'chat', 'comment', 'profile')),
  content_id uuid,
  action_type text not null,
  violation_type text,
  reason text not null,
  duration_minutes integer,
  metadata jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- User Penalties Table
create table if not exists mai_user_penalties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  penalty_type text not null check (penalty_type in ('chat_timeout', 'live_ban', 'upload_suspension', 'account_suspension')),
  expires_at timestamp with time zone,
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_mai_reports_status on mai_reports(status);
create index if not exists idx_mai_reports_assigned_moderator on mai_reports(assigned_moderator_id);
create index if not exists idx_mai_moderation_actions_moderator on mai_moderation_actions(moderator_id);
create index if not exists idx_mai_moderation_actions_target on mai_moderation_actions(target_user_id);
create index if not exists idx_mai_user_penalties_user on mai_user_penalties(user_id);
create index if not exists idx_mai_user_penalties_active on mai_user_penalties(active) where active = true;

-- Enable RLS
alter table mai_moderator_profiles enable row level security;
alter table mai_moderator_permissions enable row level security;
alter table mai_reports enable row level security;
alter table mai_moderation_actions enable row level security;
alter table mai_user_penalties enable row level security;

-- RLS Policies

-- Moderator Profiles: Only admins can manage
create policy "admins manage moderator profiles" on mai_moderator_profiles for all using (
  exists (select 1 from profiles m where m.user_id = auth.uid() and m.role = 'admin')
);

-- Moderator Permissions: Admins and the moderator themselves can view, only admins can modify
create policy "moderators view own permissions" on mai_moderator_permissions for select using (
  moderator_user_id = current_user_profile_id()
);
create policy "admins manage moderator permissions" on mai_moderator_permissions for all using (
  exists (select 1 from profiles m where m.user_id = auth.uid() and m.role = 'admin')
);

-- Reports: Anyone can create, moderators/admins can view/update
create policy "anyone can report" on mai_reports for insert with check (auth.uid() is not null);
create policy "moderators view reports" on mai_reports for select using (
  exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin', 'moderator'))
);
create policy "moderators update reports" on mai_reports for update using (
  exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin', 'moderator'))
);

-- Moderation Actions: Only moderators/admins can insert, everyone can view their own
create policy "moderators insert actions" on mai_moderation_actions for insert with check (
  exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin', 'moderator'))
);
create policy "users view actions on themselves" on mai_moderation_actions for select using (
  target_user_id = current_user_profile_id()
);
create policy "moderators view all actions" on mai_moderation_actions for select using (
  exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin', 'moderator'))
);

-- User Penalties: Moderators/admins can manage, users can view their own
create policy "moderators manage penalties" on mai_user_penalties for all using (
  exists (select 1 from profiles m where m.user_id = auth.uid() and m.role in ('admin', 'moderator'))
);
create policy "users view own penalties" on mai_user_penalties for select using (
  user_id = current_user_profile_id()
);

-- RPC Functions for Moderation Actions

-- Moderate Video: Hide or Delete
create or replace function moderate_video(
  p_video_id uuid,
  p_action text, -- 'hide', 'delete'
  p_reason text,
  p_violation_type text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_moderator_id uuid;
  v_moderator_role text;
  v_creator_id uuid;
  v_creator_role text;
begin
  -- Check if moderator
  select id, role into v_moderator_id, v_moderator_role from profiles where user_id = auth.uid() and role in ('admin', 'moderator');
  if v_moderator_id is null then
    raise exception 'Access denied';
  end if;

  -- Get video creator
  select v.creator_id, a.role into v_creator_id, v_creator_role from videos v join profiles a on v.creator_id = a.id where v.id = p_video_id;
  if v_creator_id is null then
    raise exception 'Video not found';
  end if;

  -- Check if creator is admin and moderator is not admin
  if v_creator_role = 'admin' and v_moderator_role != 'admin' then
    raise exception 'Cannot moderate admin content';
  end if;

  if p_action = 'hide' then
    update videos set visibility = 'private', moderation_status = 'rejected' where id = p_video_id;
  elsif p_action = 'delete' then
    delete from videos where id = p_video_id;
  else
    raise exception 'Invalid action';
  end if;

  -- Log action
  insert into mai_moderation_actions (moderator_id, target_user_id, content_type, content_id, action_type, violation_type, reason)
  values (v_moderator_id, v_creator_id, 'video', p_video_id, p_action || '_video', p_violation_type, p_reason);
end;
$$;

-- Moderate User: Timeout, Ban, Suspend
create or replace function moderate_user(
  p_target_user_id uuid,
  p_action text, -- 'timeout', 'ban', 'suspend'
  p_reason text,
  p_duration_minutes integer default null,
  p_penalty_type text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_moderator_id uuid;
  v_expires_at timestamp with time zone;
begin
  -- Check if moderator
  select id into v_moderator_id from profiles where user_id = auth.uid() and role in ('admin', 'moderator');
  if v_moderator_id is null then
    raise exception 'Access denied';
  end if;

  if p_action = 'timeout' then
    v_expires_at := now() + interval '1 minute' * coalesce(p_duration_minutes, 10);
    insert into mai_user_penalties (user_id, penalty_type, expires_at) values (p_target_user_id, 'chat_timeout', v_expires_at);
  elsif p_action = 'ban' then
    v_expires_at := case
      when p_duration_minutes = 10080 then now() + interval '7 days' -- 1 week
      when p_duration_minutes = 43200 then now() + interval '30 days' -- 30 days
      else null -- permanent
    end;
    insert into mai_user_penalties (user_id, penalty_type, expires_at) values (p_target_user_id, 'live_ban', v_expires_at);
  elsif p_action = 'suspend' then
    v_expires_at := now() + interval '1 minute' * coalesce(p_duration_minutes, 1440); -- default 1 day
    insert into mai_user_penalties (user_id, penalty_type, expires_at) values (p_target_user_id, 'account_suspension', v_expires_at);
  else
    raise exception 'Invalid action';
  end if;

  -- Log action
  insert into mai_moderation_actions (moderator_id, target_user_id, action_type, reason, duration_minutes)
  values (v_moderator_id, p_target_user_id, p_action || '_user', p_reason, p_duration_minutes);
end;
$$;

-- Moderate Chat: Remove Message or Disable Chat
create or replace function moderate_chat(
  p_action text, -- 'remove_message', 'disable_chat'
  p_room_id uuid,
  p_reason text,
  p_message_id uuid default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_moderator_id uuid;
  v_target_user_id uuid;
begin
  -- Check if moderator
  select id into v_moderator_id from profiles where user_id = auth.uid() and role in ('admin', 'moderator');
  if v_moderator_id is null then
    raise exception 'Access denied';
  end if;

  if p_action = 'remove_message' and p_message_id is not null then
    -- Get target user from message
    select user_id into v_target_user_id from room_messages where id = p_message_id and room_id = p_room_id;
    delete from room_messages where id = p_message_id and room_id = p_room_id;
    -- Log
    insert into mai_moderation_actions (moderator_id, target_user_id, content_type, content_id, action_type, reason)
    values (v_moderator_id, v_target_user_id, 'chat', p_message_id, 'remove_message', p_reason);
  elsif p_action = 'disable_chat' then
    -- Assuming live_sessions table has disable_chat field
    update live_sessions set chat_disabled = true where id = p_room_id;
    -- Log without specific target
    insert into mai_moderation_actions (moderator_id, content_type, content_id, action_type, reason)
    values (v_moderator_id, 'live', p_room_id, 'disable_chat', p_reason);
  else
    raise exception 'Invalid action';
  end if;
end;
$$;

-- End Live Session
create or replace function end_live_session(
  p_session_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
as $$
declare
  v_moderator_id uuid;
  v_creator_id uuid;
begin
  -- Check if moderator
  select id into v_moderator_id from profiles where user_id = auth.uid() and role in ('admin', 'moderator');
  if v_moderator_id is null then
    raise exception 'Access denied';
  end if;

  -- Get creator
  select creator_id into v_creator_id from live_sessions where id = p_session_id;
  -- End session (assuming a field to mark ended)
  update live_sessions set ended_at = now(), ended_by = 'moderator' where id = p_session_id;

  -- Log
  insert into mai_moderation_actions (moderator_id, target_user_id, content_type, content_id, action_type, reason)
  values (v_moderator_id, v_creator_id, 'live', p_session_id, 'end_live', p_reason);
end;
$$;

-- Restrict User Actions
create or replace function restrict_user(
  p_target_user_id uuid,
  p_restriction_type text, -- 'upload_restriction', 'live_restriction'
  p_reason text,
  p_permanent boolean default false
)
returns void
language plpgsql
security definer
as $$
declare
  v_moderator_id uuid;
  v_expires_at timestamp with time zone;
  v_penalty_type text;
begin
  -- Check if moderator
  select id into v_moderator_id from profiles where user_id = auth.uid() and role in ('admin', 'moderator');
  if v_moderator_id is null then
    raise exception 'Access denied';
  end if;

  if p_restriction_type = 'upload_restriction' then
    v_penalty_type := 'upload_suspension';
  elsif p_restriction_type = 'live_restriction' then
    v_penalty_type := 'live_ban';
  else
    raise exception 'Invalid restriction type';
  end if;

  if p_permanent then
    v_expires_at := null;
  else
    v_expires_at := now() + interval '1 year'; -- default to 1 year
  end if;

  insert into mai_user_penalties (user_id, penalty_type, expires_at)
  values (p_target_user_id, v_penalty_type, v_expires_at)
  on conflict (user_id, penalty_type) do update set
    expires_at = excluded.expires_at,
    active = true;

  -- Log action
  insert into mai_moderation_actions (moderator_id, target_user_id, action_type, reason, duration_minutes)
  values (v_moderator_id, p_target_user_id, p_restriction_type, p_reason, case when p_permanent then -1 else 525600 end);
end;
$$;
