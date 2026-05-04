-- Storage buckets and RLS policies for music uploads
-- Create music-files bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'music-files',
  'music-files',
  false,
  104857600, -- 100MB
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac']
) ON CONFLICT (id) DO NOTHING;

-- Create music-covers bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'music-covers',
  'music-covers',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for music-files (private bucket)
-- Insert policy - users can upload to their own user.id folder
DROP POLICY IF EXISTS "Users can upload music files to their folder" ON storage.objects;
CREATE POLICY "Users can upload music files to their folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'music-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Select policy - users can view their own music files
DROP POLICY IF EXISTS "Users can view their own music files" ON storage.objects;
CREATE POLICY "Users can view their own music files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'music-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS policies for music-covers (public bucket)
-- Insert policy - users can upload covers to their own user.id folder
DROP POLICY IF EXISTS "Users can upload music covers to their folder" ON storage.objects;
CREATE POLICY "Users can upload music covers to their folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'music-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Select policy - public read access for music covers
DROP POLICY IF EXISTS "Public can view music covers" ON storage.objects;
CREATE POLICY "Public can view music covers" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'music-covers');

-- Update policy - users can update their own covers
DROP POLICY IF EXISTS "Users can update their own music covers" ON storage.objects;
CREATE POLICY "Users can update their own music covers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'music-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete policy - users can delete their own covers
DROP POLICY IF EXISTS "Users can delete their own music covers" ON storage.objects;
CREATE POLICY "Users can delete their own music covers" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'music-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Videos table RLS policies
-- Creators can insert their own videos
DROP POLICY IF EXISTS "Creators can insert their own videos" ON public.videos;
CREATE POLICY "Creators can insert their own videos" ON public.videos
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Public can read approved ready videos
DROP POLICY IF EXISTS "Public can read approved ready videos" ON public.videos;
CREATE POLICY "Public can read approved ready videos" ON public.videos
  FOR SELECT TO public
  USING (
    visibility = 'public'
    AND upload_status = 'ready'
    AND moderation_status IN ('approved', 'pending')
  );

-- Creators can read their own videos
DROP POLICY IF EXISTS "Creators can read their own videos" ON public.videos;
CREATE POLICY "Creators can read their own videos" ON public.videos
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

-- Creators can update their own videos
DROP POLICY IF EXISTS "Creators can update their own videos" ON public.videos;
CREATE POLICY "Creators can update their own videos" ON public.videos
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid());

-- Creators can delete their own videos
DROP POLICY IF EXISTS "Creators can delete their own videos" ON public.videos;
CREATE POLICY "Creators can delete their own videos" ON public.videos
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());
