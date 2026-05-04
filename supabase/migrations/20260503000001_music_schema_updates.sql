-- Add music support columns to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS album_cover_url text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS tracks jsonb default '[]'::jsonb;

-- Update category check constraint to include music categories
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_category_check;
ALTER TABLE videos ADD CONSTRAINT videos_category_check 
  CHECK (category IN (
    'music', 'music_track', 'music_album', 'music_video', 'video_music', 
    'short', 'movie', 'film', 'feature', 'cars', 'business', 'gaming', 
    'education', 'entertainment'
  ));

-- Update video_type check constraint to include music video types
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_video_type_check;
ALTER TABLE videos ADD CONSTRAINT videos_video_type_check
  CHECK (video_type IN ('music', 'short', 'music_video', 'movie', 'video'));

-- Update type check constraint to include music types (legacy column)
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_type_check;
-- Allow any string value for type to avoid constraint issues
ALTER TABLE videos ADD CONSTRAINT videos_type_check
  CHECK (type IS NULL OR length(type) > 0);

-- Make type column nullable since it's legacy and not always required
ALTER TABLE videos ALTER COLUMN type DROP NOT NULL;
