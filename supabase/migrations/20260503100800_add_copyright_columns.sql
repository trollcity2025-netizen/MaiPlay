-- Add copyright and fingerprint columns to videos table
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS fingerprint_id text,
ADD COLUMN IF NOT EXISTS copyright_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS copyright_match jsonb,
ADD COLUMN IF NOT EXISTS copyright_checked_at timestamptz;
