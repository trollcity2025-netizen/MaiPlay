-- Create content tables for the new architecture

-- Tracks table for music/audio only
create table if not exists public.tracks (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text check (category in ('music', 'cars', 'business', 'gaming', 'education', 'entertainment')),
  audio_url text not null,
  cover_art_url text,
  track_type text check (track_type in ('instrumental', 'full')),
  view_count integer default 0,
  like_count integer default 0,
  comment_count integer default 0,
  gift_count integer default 0,
  boost_score numeric default 0,
  moderation_status text default 'pending' check (moderation_status in ('pending', 'approved', 'flagged', 'rejected', 'deleted')),
  upload_status text default 'created' check (upload_status in ('created', 'uploading', 'processing', 'ready', 'errored', 'invalid', 'deleted')),
  visibility text default 'private' check (visibility in ('draft','public','private','hidden','deleted')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Albums table for album metadata
create table if not exists public.albums (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text check (category in ('music_album')),
  cover_art_url text,
  view_count integer default 0,
  like_count integer default 0,
  comment_count integer default 0,
  gift_count integer default 0,
  boost_score numeric default 0,
  moderation_status text default 'pending' check (moderation_status in ('pending', 'approved', 'flagged', 'rejected', 'deleted')),
  upload_status text default 'created' check (upload_status in ('created', 'uploading', 'processing', 'ready', 'errored', 'invalid', 'deleted')),
  visibility text default 'private' check (visibility in ('draft','public','private','hidden','deleted')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Album tracks table for track ordering in albums
create table if not exists public.album_tracks (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid references public.albums(id) on delete cascade not null,
  track_id uuid references public.tracks(id) on delete cascade not null,
  track_number integer not null,
  created_at timestamp with time zone default now(),
  unique(album_id, track_number),
  unique(album_id, track_id)
);

-- Shorts table for short-form video (uses Mux)
create table if not exists public.shorts (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text check (category in ('music', 'cars', 'business', 'gaming', 'education', 'entertainment', 'music_video')),
  mux_upload_id text,
  mux_asset_id text unique,
  mux_playback_id text,
  mux_status text,
  mux_duration_seconds integer,
  mux_aspect_ratio text,
  mux_thumbnail_url text,
  mux_preview_url text,
  mux_stream_url text,
  view_count integer default 0,
  like_count integer default 0,
  comment_count integer default 0,
  gift_count integer default 0,
  boost_score numeric default 0,
  moderation_status text default 'pending' check (moderation_status in ('pending', 'approved', 'flagged', 'rejected', 'deleted')),
  upload_status text default 'created' check (upload_status in ('created', 'uploading', 'processing', 'ready', 'errored', 'invalid', 'deleted')),
  visibility text default 'draft' check (visibility in ('draft','public','private','hidden','deleted')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Movies table for long-form/premium video (uses Mux)
create table if not exists public.movies (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text check (category in ('music', 'cars', 'business', 'gaming', 'education', 'entertainment')),
  mux_upload_id text,
  mux_asset_id text unique,
  mux_playback_id text,
  mux_status text,
  mux_duration_seconds integer,
  mux_aspect_ratio text,
  mux_thumbnail_url text,
  mux_preview_url text,
  mux_stream_url text,
  view_count integer default 0,
  like_count integer default 0,
  comment_count integer default 0,
  gift_count integer default 0,
  boost_score numeric default 0,
  moderation_status text default 'pending' check (moderation_status in ('pending', 'approved', 'flagged', 'rejected', 'deleted')),
  upload_status text default 'created' check (upload_status in ('created', 'uploading', 'processing', 'ready', 'errored', 'invalid', 'deleted')),
  visibility text default 'draft' check (visibility in ('draft','public','private','hidden','deleted')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Lives table for live sessions + optional Mux recording fields
create table if not exists public.lives (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text check (category in ('music', 'cars', 'business', 'gaming', 'education', 'entertainment')),
  agora_channel text,
  mux_live_playback_id text,
  scheduled_start_at timestamptz not null,
  scheduled_duration_minutes integer not null default 60 check (scheduled_duration_minutes > 0 and scheduled_duration_minutes <= 60),
  status text not null default 'scheduled' check (status in ('scheduled','live','ended','cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  view_count integer default 0,
  like_count integer default 0,
  comment_count integer default 0,
  gift_count integer default 0,
  boost_score numeric default 0,
  moderation_status text default 'pending' check (moderation_status in ('pending', 'approved', 'flagged', 'rejected', 'deleted')),
  upload_status text default 'created' check (upload_status in ('created', 'uploading', 'processing', 'ready', 'errored', 'invalid', 'deleted')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.tracks enable row level security;
alter table public.albums enable row level security;
alter table public.album_tracks enable row level security;
alter table public.shorts enable row level security;
alter table public.movies enable row level security;
alter table public.lives enable row level security;

-- Create policies for tracks
create policy "Tracks are viewable by everyone" on public.tracks for select using (true);
create policy "Creators can insert their own tracks" on public.tracks for insert with check (current_user_profile_id() = creator_id);
create policy "Creators can update their own tracks" on public.tracks for update using (current_user_profile_id() = creator_id);
create policy "Creators can delete their own tracks" on public.tracks for delete using (current_user_profile_id() = creator_id);

-- Create policies for albums
create policy "Albums are viewable by everyone" on public.albums for select using (true);
create policy "Creators can insert their own albums" on public.albums for insert with check (current_user_profile_id() = creator_id);
create policy "Creators can update their own albums" on public.albums for update using (current_user_profile_id() = creator_id);
create policy "Creators can delete their own albums" on public.albums for delete using (current_user_profile_id() = creator_id);

-- Create policies for album_tracks
create policy "Album tracks are viewable by everyone" on public.album_tracks for select using (true);
create policy "Creators can insert their own album tracks" on public.album_tracks for insert with check (current_user_profile_id() = (select creator_id from public.albums where id = album_id));
create policy "Creators can update their own album tracks" on public.album_tracks for update using (current_user_profile_id() = (select creator_id from public.albums where id = album_id));
create policy "Creators can delete their own album tracks" on public.album_tracks for delete using (current_user_profile_id() = (select creator_id from public.albums where id = album_id));

-- Create policies for shorts
create policy "Shorts are viewable by everyone" on public.shorts for select using (true);
create policy "Creators can insert their own shorts" on public.shorts for insert with check (current_user_profile_id() = creator_id);
create policy "Creators can update their own shorts" on public.shorts for update using (current_user_profile_id() = creator_id);
create policy "Creators can delete their own shorts" on public.shorts for delete using (current_user_profile_id() = creator_id);

-- Create policies for movies
create policy "Movies are viewable by everyone" on public.movies for select using (true);
create policy "Creators can insert their own movies" on public.movies for insert with check (current_user_profile_id() = creator_id);
create policy "Creators can update their own movies" on public.movies for update using (current_user_profile_id() = creator_id);
create policy "Creators can delete their own movies" on public.movies for delete using (current_user_profile_id() = creator_id);

-- Create policies for lives
create policy "Lives are viewable by everyone" on public.lives for select using (true);
create policy "Creators can insert their own lives" on public.lives for insert with check (current_user_profile_id() = creator_id);
create policy "Creators can update their own lives" on public.lives for update using (current_user_profile_id() = creator_id);
create policy "Creators can delete their own lives" on public.lives for delete using (current_user_profile_id() = creator_id);

-- Create indexes for performance
create index if not exists idx_tracks_creator_id on public.tracks(creator_id);
create index if not exists idx_tracks_created_at on public.tracks(created_at desc);
create index if not exists idx_albums_creator_id on public.albums(creator_id);
create index if not exists idx_albums_created_at on public.albums(created_at desc);
create index if not exists idx_album_tracks_album_id on public.album_tracks(album_id);
create index if not exists idx_album_tracks_track_id on public.album_tracks(track_id);
create index if not exists idx_shorts_creator_id on public.shorts(creator_id);
create index if not exists idx_shorts_created_at on public.shorts(created_at desc);
create index if not exists idx_movies_creator_id on public.movies(creator_id);
create index if not exists idx_movies_created_at on public.movies(created_at desc);
create index if not exists idx_lives_creator_id on public.lives(creator_id);
create index if not exists idx_lives_scheduled_start_at on public.lives(scheduled_start_at);
