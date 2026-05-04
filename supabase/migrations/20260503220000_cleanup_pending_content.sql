-- Cleanup test/demo content for production
-- Removes all pending content that was uploaded for review.
-- This ensures only manually approved content goes live,
-- and the moderation queues start fresh for real user submissions.

BEGIN;

-- Delete all videos that are pending moderation (not yet approved/rejected)
DELETE FROM videos WHERE moderation_status = 'pending';

-- Delete all creator merch items pending review
DELETE FROM creator_merch_items WHERE status = 'pending_review';

-- Note: Creator applications and payout requests are intentionally left untouched
-- as they represent real business actions, not demo content.

COMMIT;
