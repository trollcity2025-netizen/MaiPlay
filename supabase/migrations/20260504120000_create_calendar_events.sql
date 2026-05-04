-- Calendar events for scheduling content
create table if not exists public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  content_type text not null check (content_type in ('live', 'short', 'movie', 'track', 'album')),
  content_id uuid,
  title text not null,
  description text,
  scheduled_date date not null,
  scheduled_time time,
  scheduled_at timestamptz,
  duration_minutes integer,
  status text default 'scheduled' check (status in ('scheduled', 'live', 'completed', 'cancelled')),
  visibility text default 'followers' check (visibility in ('public', 'followers', 'private')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.calendar_events enable row level security;

-- Create policies
create policy "Calendar events are viewable by everyone for public/followers content" 
  on public.calendar_events for select using (visibility = 'public');
create policy "Followers can view their followed creators' scheduled events"
  on public.calendar_events for select using (
    visibility in ('public', 'followers') 
    and creator_id in (
      select following_id from public.creator_follows where follower_id = current_user_profile_id()
    )
  );
create policy "Creators can view their own calendar events"
  on public.calendar_events for select using (current_user_profile_id() = creator_id);

create policy "Creators can insert their own calendar events"
  on public.calendar_events for insert with check (current_user_profile_id() = creator_id);

create policy "Creators can update their own calendar events"
  on public.calendar_events for update using (current_user_profile_id() = creator_id);

create policy "Creators can delete their own calendar events"
  on public.calendar_events for delete using (current_user_profile_id() = creator_id);

-- Create indexes
create index if not exists idx_calendar_events_creator_id on public.calendar_events(creator_id);
create index if not exists idx_calendar_events_scheduled_date on public.calendar_events(scheduled_date);
create index if not exists idx_calendar_events_content_type on public.calendar_events(content_type);
create index if not exists idx_calendar_events_status on public.calendar_events(status);
