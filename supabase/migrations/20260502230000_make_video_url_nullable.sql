-- Make video_url nullable for Mux upload flow
-- Video is created without URL, filled later by Mux webhook
alter table videos alter column video_url drop not null;

-- Handle column rename from 'type' to 'video_type'
-- The schema now uses video_type instead of type

-- If video_type doesn't exist but type does, rename it
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'videos' and column_name = 'video_type'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'videos' and column_name = 'type'
  ) then
    execute 'alter table videos rename column type to video_type';
    execute 'alter table videos alter column video_type set not null';
    execute 'alter table videos drop constraint if exists videos_type_check';
    execute 'alter table videos add constraint videos_video_type_check check (video_type in (''short'', ''movie''))';
  end if;
end $$;

-- If both columns exist, copy type to video_type then drop type
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'videos' and column_name = 'video_type'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'videos' and column_name = 'type'
  ) then
    execute 'update videos set video_type = type where video_type is null';
    execute 'alter table videos drop column type';
  end if;
end $$;

-- Add additional Mux columns if they don't exist
alter table videos add column if not exists mux_stream_url text;
alter table videos add column if not exists mux_thumbnail_url text;

-- Backfill video_type for any null values (default to 'short')
update videos set video_type = 'short' where video_type is null;

-- Make video_type not null after backfill
alter table videos alter column video_type set not null;

-- Note: The mux schema uses mux_stream_url for the playback URL
-- which is populated by the Mux webhook after processing completes
