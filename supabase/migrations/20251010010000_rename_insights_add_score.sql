-- Rename insights -> ai_insights and add score columns with indexes

-- guest_ideas: rename column and index if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guest_ideas' AND column_name = 'insights'
  ) THEN
    EXECUTE 'ALTER TABLE guest_ideas RENAME COLUMN insights TO ai_insights';
  END IF;
END $$;

-- rename index if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_guest_ideas_insights_gin'
  ) THEN
    EXECUTE 'ALTER INDEX idx_guest_ideas_insights_gin RENAME TO idx_guest_ideas_ai_insights_gin';
  END IF;
END $$;

-- ensure ai_insights exists with JSONB type
ALTER TABLE guest_ideas ADD COLUMN IF NOT EXISTS ai_insights JSONB;

-- create gin index on ai_insights
CREATE INDEX IF NOT EXISTS idx_guest_ideas_ai_insights_gin
ON guest_ideas USING GIN (ai_insights);

-- add score and index
ALTER TABLE guest_ideas ADD COLUMN IF NOT EXISTS score INTEGER;
CREATE INDEX IF NOT EXISTS idx_guest_ideas_score ON guest_ideas(score);

-- ideas: rename column and index if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'insights'
  ) THEN
    EXECUTE 'ALTER TABLE ideas RENAME COLUMN insights TO ai_insights';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_ideas_insights_gin'
  ) THEN
    EXECUTE 'ALTER INDEX idx_ideas_insights_gin RENAME TO idx_ideas_ai_insights_gin';
  END IF;
END $$;

-- ensure ai_insights exists with JSONB type
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS ai_insights JSONB;

-- create gin index on ai_insights
CREATE INDEX IF NOT EXISTS idx_ideas_ai_insights_gin
ON ideas USING GIN (ai_insights);

-- add score and index
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS score INTEGER;
CREATE INDEX IF NOT EXISTS idx_ideas_score ON ideas(score);


