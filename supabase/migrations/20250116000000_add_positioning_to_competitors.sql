-- =====================================================
-- Migration: Add positioning JSONB column to competitors
-- Description: Store structured positioning data instead of formatted text
-- Date: 2025-01-16
-- =====================================================

-- Step 1: Add positioning JSONB column (only if competitors table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'competitors'
  ) THEN
    ALTER TABLE competitors
    ADD COLUMN IF NOT EXISTS positioning JSONB;
  END IF;
END $$;

-- Step 2: Create GIN index for JSONB queries (only if competitors table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'competitors'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_competitors_positioning_gin 
    ON competitors USING GIN (positioning);

    -- Step 3: Create specific path indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_competitors_company_stage 
    ON competitors ((positioning->>'company_stage'))
    WHERE positioning IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_competitors_geographic_focus 
    ON competitors ((positioning->>'geographic_focus'))
    WHERE positioning IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_competitors_price_tier 
    ON competitors ((positioning->>'price_tier'))
    WHERE positioning IS NOT NULL;
  END IF;
END $$;

-- Step 4: Add composite indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_ideas_user_status_created 
ON ideas(user_id, status, created_at DESC);

-- Step 5: Add partial index for polling (generating_stage1 status)
CREATE INDEX IF NOT EXISTS idx_ideas_generating_stage1 
ON ideas(status) 
WHERE status = 'generating_stage1';

-- Step 6: Add index for completed ideas
CREATE INDEX IF NOT EXISTS idx_ideas_wizard_completed 
ON ideas(wizard_completed_at) 
WHERE wizard_completed_at IS NOT NULL;

-- Step 7: Add data integrity constraints
-- Status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_ideas_status'
  ) THEN
    ALTER TABLE ideas 
    ADD CONSTRAINT check_ideas_status 
    CHECK (status IN (
      'draft', 'generating_questions', 'questions_ready', 
      'generating_stage1', 'complete', 'generation_failed', 
      'stage1_failed'
    ));
  END IF;
END $$;

-- Score range constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_ideas_score_range'
  ) THEN
    ALTER TABLE ideas 
    ADD CONSTRAINT check_ideas_score_range 
    CHECK (score IS NULL OR (score >= 0 AND score <= 100));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_ideas_risk_score_range'
  ) THEN
    ALTER TABLE ideas 
    ADD CONSTRAINT check_ideas_risk_score_range 
    CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 10));
  END IF;
END $$;

-- Step 8: Add column comment (only if competitors table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'competitors'
  ) THEN
    COMMENT ON COLUMN competitors.positioning IS 'Structured positioning data: target_market, price_tier, price_details, key_strengths, company_stage, geographic_focus';
  END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================

