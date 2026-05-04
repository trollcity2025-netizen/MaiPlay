-- Drop old subscription system tables
-- This removes user_subscriptions, creator_subscription_tiers, and subscription_transactions

-- Drop foreign key constraints first
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_creator_id_fkey;
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_tier_id_fkey;
ALTER TABLE creator_subscription_tiers DROP CONSTRAINT IF EXISTS creator_subscription_tiers_creator_id_fkey;
ALTER TABLE subscription_transactions DROP CONSTRAINT IF EXISTS subscription_transactions_user_id_fkey;
ALTER TABLE subscription_transactions DROP CONSTRAINT IF EXISTS subscription_transactions_creator_id_fkey;
ALTER TABLE subscription_transactions DROP CONSTRAINT IF EXISTS subscription_transactions_tier_id_fkey;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_subscriptions_user_creator;
DROP INDEX IF EXISTS idx_user_subscriptions_renewal;
DROP INDEX IF EXISTS idx_creator_subscription_tiers_creator;
DROP INDEX IF EXISTS idx_subscription_transactions_user;
DROP INDEX IF EXISTS idx_subscription_transactions_created;

-- Drop tables
DROP TABLE IF EXISTS subscription_transactions CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS creator_subscription_tiers CASCADE;

-- Clean up any remaining references in RLS policies (these will be handled by the migration system)