-- Verification script to check if profile consolidation worked correctly
-- Run this after applying the consolidation migration

-- Check that profiles table has all required columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check that mai_accounts table still exists (we'll drop it later)
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'mai_accounts'
    AND table_schema = 'public'
) as mai_accounts_exists;

-- Check that profiles table has data
SELECT
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role IS NOT NULL THEN 1 END) as profiles_with_role,
    COUNT(CASE WHEN moderation_status IS NOT NULL THEN 1 END) as profiles_with_moderation_status,
    COUNT(CASE WHEN is_creator = true THEN 1 END) as creator_profiles
FROM profiles;

-- Check for any orphaned foreign key references
-- This should return no rows if migration worked correctly
SELECT
    'videos' as table_name,
    COUNT(*) as orphaned_refs
FROM videos v
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = v.creator_id)
UNION ALL
SELECT
    'direct_messages' as table_name,
    COUNT(*) as orphaned_refs
FROM direct_messages dm
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = dm.sender_id)
   OR NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = dm.recipient_id);

-- Check that the current_user_profile_id function exists and works
SELECT
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'current_user_profile_id';

-- Test the function (this will only work if user is authenticated)
-- SELECT current_user_profile_id();