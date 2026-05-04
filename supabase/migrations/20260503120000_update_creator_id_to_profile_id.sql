-- Fix videos.creator_id foreign key constraint to reference profiles(id)

-- Check current constraint and drop if it exists
DO $$
BEGIN
    -- Drop constraint if it references profiles
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'videos'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'creator_id'
        AND ccu.table_name = 'profiles'
    ) THEN
        ALTER TABLE videos DROP CONSTRAINT videos_creator_id_fkey;
    END IF;
END $$;

-- Update any videos that still have creator_id pointing to user_id instead of profile_id
UPDATE videos
SET creator_id = profiles.id
FROM profiles
WHERE videos.creator_id = profiles.user_id
AND videos.creator_id != profiles.id;

-- Ensure the FK constraint exists and references profiles(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'videos'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'creator_id'
        AND ccu.table_name = 'profiles'
        AND ccu.column_name = 'id'
    ) THEN
        ALTER TABLE videos ADD CONSTRAINT videos_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
