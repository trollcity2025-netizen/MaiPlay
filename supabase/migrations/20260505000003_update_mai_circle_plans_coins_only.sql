-- Update mai_circle_plans to use only MAI coins (remove USD pricing)

-- Remove the price_usd column since we only use MAI coins
ALTER TABLE mai_circle_plans DROP COLUMN IF EXISTS price_usd;

-- Handle price column migration (rename price to price_coins if needed)
DO $$
BEGIN
    -- If price column exists but price_coins doesn't, rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mai_circle_plans'
        AND column_name = 'price'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mai_circle_plans'
        AND column_name = 'price_coins'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE mai_circle_plans RENAME COLUMN price TO price_coins;
    END IF;

    -- If both exist, drop the old price column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mai_circle_plans'
        AND column_name = 'price'
        AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mai_circle_plans'
        AND column_name = 'price_coins'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE mai_circle_plans DROP COLUMN price;
    END IF;
END $$;

-- Ensure price_coins is integer type (convert if needed)
DO $$
BEGIN
    -- Only alter type if it's not already integer
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mai_circle_plans'
        AND column_name = 'price_coins'
        AND table_schema = 'public'
        AND data_type != 'integer'
    ) THEN
        ALTER TABLE mai_circle_plans ALTER COLUMN price_coins TYPE integer USING price_coins::integer;
    END IF;
END $$;

-- Handle benefits/features column migration
DO $$
BEGIN
    -- If benefits column exists but features doesn't, rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mai_circle_plans'
        AND column_name = 'benefits'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mai_circle_plans'
        AND column_name = 'features'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE mai_circle_plans RENAME COLUMN benefits TO features;
    END IF;

    -- If both exist, drop the old benefits column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mai_circle_plans'
        AND column_name = 'benefits'
        AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mai_circle_plans'
        AND column_name = 'features'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE mai_circle_plans DROP COLUMN benefits;
    END IF;
END $$;

-- Ensure features column exists and is jsonb type
DO $$
BEGIN
    -- Add features column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mai_circle_plans'
        AND column_name = 'features'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE mai_circle_plans ADD COLUMN features jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Ensure features is jsonb type (convert if needed)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mai_circle_plans'
        AND column_name = 'features'
        AND table_schema = 'public'
        AND data_type != 'jsonb'
    ) THEN
        ALTER TABLE mai_circle_plans ALTER COLUMN features TYPE jsonb USING features::jsonb;
    END IF;
END $$;