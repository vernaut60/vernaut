-- Consolidated migration for complete ideas table structure
-- This replaces all previous migrations for a clean, single migration

-- Step 1: Create the complete ideas table with all columns
CREATE TABLE IF NOT EXISTS ideas (
  -- Core Identity & Content
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_text TEXT NOT NULL,
  problem TEXT NOT NULL,
  audience TEXT NOT NULL,
  solution TEXT NOT NULL,
  monetization TEXT NOT NULL,
  title VARCHAR(255),
  
  -- User & Timestamps
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Basic Analysis (Free Tier)
  ai_insights JSONB,                    -- AI-generated insights and breakdown
  score INTEGER,                         -- Overall idea score (0-100)
  risk_score DECIMAL(3,1),              -- Overall risk score (0-10)
  risk_analysis JSONB,                  -- Detailed risk breakdown with categories
  
  -- Pro Analysis (Premium Tier)
  full_analysis_unlocked BOOLEAN DEFAULT false,     -- Has user unlocked Pro analysis?
  market_analysis JSONB,                            -- Market data & insights (TAM, SAM, SOM, etc.)
  analysis_metadata JSONB,                          -- Analysis generation metadata
  full_analysis_generated_at TIMESTAMP WITH TIME ZONE  -- When Pro analysis was created
);

-- Step 2: Add any missing columns to existing table (safe for existing data)
ALTER TABLE ideas 
ADD COLUMN IF NOT EXISTS ai_insights JSONB,
ADD COLUMN IF NOT EXISTS score INTEGER,
ADD COLUMN IF NOT EXISTS risk_score DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS risk_analysis JSONB,
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS full_analysis_unlocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS market_analysis JSONB,
ADD COLUMN IF NOT EXISTS analysis_metadata JSONB,
ADD COLUMN IF NOT EXISTS full_analysis_generated_at TIMESTAMP WITH TIME ZONE;

-- Step 3: Create all indexes
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_title ON ideas(title);
CREATE INDEX IF NOT EXISTS idx_ideas_ai_insights_gin ON ideas USING GIN (ai_insights);
CREATE INDEX IF NOT EXISTS idx_ideas_score ON ideas(score);
CREATE INDEX IF NOT EXISTS idx_ideas_risk_score ON ideas(risk_score);
CREATE INDEX IF NOT EXISTS idx_ideas_risk_analysis_gin ON ideas USING GIN (risk_analysis);
CREATE INDEX IF NOT EXISTS idx_ideas_full_analysis_unlocked ON ideas(full_analysis_unlocked);
CREATE INDEX IF NOT EXISTS idx_ideas_market_analysis_gin ON ideas USING GIN (market_analysis);
CREATE INDEX IF NOT EXISTS idx_ideas_analysis_metadata_gin ON ideas USING GIN (analysis_metadata);
CREATE INDEX IF NOT EXISTS idx_ideas_full_analysis_generated_at ON ideas(full_analysis_generated_at);
CREATE INDEX IF NOT EXISTS idx_ideas_user_idea_text ON ideas(user_id, idea_text);

-- Step 4: Add unique constraint (safe - will skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_idea_text'
  ) THEN
    ALTER TABLE ideas ADD CONSTRAINT unique_user_idea_text 
    UNIQUE (user_id, idea_text);
  END IF;
END $$;

-- Step 5: Enable RLS and create policies
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to insert ideas" ON ideas;
DROP POLICY IF EXISTS "Users can read their own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can update their own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can delete their own ideas" ON ideas;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to insert ideas" ON ideas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read their own ideas" ON ideas
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own ideas" ON ideas
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own ideas" ON ideas
  FOR DELETE USING (user_id = auth.uid());

-- Step 6: Add column comments
COMMENT ON COLUMN ideas.ai_insights IS 'AI-generated insights and breakdown';
COMMENT ON COLUMN ideas.score IS 'Overall idea score (0-100)';
COMMENT ON COLUMN ideas.risk_score IS 'Overall risk score (0-10)';
COMMENT ON COLUMN ideas.risk_analysis IS 'Detailed risk breakdown with categories';
COMMENT ON COLUMN ideas.title IS 'Clean, truncated title for display purposes';
COMMENT ON COLUMN ideas.full_analysis_unlocked IS 'Tracks if user has unlocked Pro-level analysis features';
COMMENT ON COLUMN ideas.market_analysis IS 'Stores market data: TAM, SAM, SOM, growth_rate, trends, confidence';
COMMENT ON COLUMN ideas.analysis_metadata IS 'Stores analysis generation metadata: sources, costs, confidence scores';
COMMENT ON COLUMN ideas.full_analysis_generated_at IS 'Timestamp when Pro analysis was created';