-- Migration: Add wizard/question flow fields to ideas table
-- Description: Adds fields for question generation, wizard answers, and status tracking
-- Date: 2025-01-15

-- Step 1: Add status column for tracking wizard flow progress
ALTER TABLE ideas
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Step 2: Add wizard-related columns
ALTER TABLE ideas
ADD COLUMN IF NOT EXISTS questions JSONB,                    -- AI-generated questions array
ADD COLUMN IF NOT EXISTS wizard_answers JSONB DEFAULT '{}',  -- User answers
ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 0,     -- Current question index
ADD COLUMN IF NOT EXISTS total_questions INTEGER,            -- Total number of questions
ADD COLUMN IF NOT EXISTS questions_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS wizard_completed_at TIMESTAMP WITH TIME ZONE;

-- Step 3: Add error tracking columns
ALTER TABLE ideas
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS error_occurred_at TIMESTAMP WITH TIME ZONE;

-- Step 4: Add timestamp columns (if they don't exist)
ALTER TABLE ideas
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 5: Create indexes for wizard fields
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_questions_gin ON ideas USING GIN (questions);
CREATE INDEX IF NOT EXISTS idx_ideas_wizard_answers_gin ON ideas USING GIN (wizard_answers);
CREATE INDEX IF NOT EXISTS idx_ideas_current_step ON ideas(current_step);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);

-- Step 6: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ideas_updated_at ON ideas;
CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Add comments for documentation
COMMENT ON COLUMN ideas.status IS 'Wizard flow status: draft | generating_questions | questions_ready | generation_failed | generating_stage1 | stage1_failed | complete | error';
COMMENT ON COLUMN ideas.questions IS 'AI-generated questions array - FIXED after generation, contains 5-12 questions';
COMMENT ON COLUMN ideas.wizard_answers IS 'User answers object - CHANGES as user navigates, format: { "q1": "answer", "q2": "answer" }';
COMMENT ON COLUMN ideas.current_step IS 'Current question index user is viewing (0-based), 0 = first question';
COMMENT ON COLUMN ideas.total_questions IS 'Total number of questions generated (for progress display)';
COMMENT ON COLUMN ideas.questions_generated_at IS 'Timestamp when AI finished generating questions';
COMMENT ON COLUMN ideas.wizard_completed_at IS 'Timestamp when user completed all questions';
COMMENT ON COLUMN ideas.error_message IS 'Error message if generation failed';
COMMENT ON COLUMN ideas.error_occurred_at IS 'Timestamp when error occurred';

-- Step 8: Add constraint for status values
DO $$
BEGIN
  -- Drop constraint if it exists (for idempotency)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ideas_status_check'
  ) THEN
    ALTER TABLE ideas DROP CONSTRAINT ideas_status_check;
  END IF;
  
  -- Add constraint for valid status values
  ALTER TABLE ideas ADD CONSTRAINT ideas_status_check
  CHECK (status IN (
    'draft',
    'generating_questions',
    'questions_ready',
    'generation_failed',
    'generating_stage1',
    'stage1_failed',
    'complete',
    'error'
  ));
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

-- Step 9: Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added columns: status, questions, wizard_answers, current_step, total_questions';
  RAISE NOTICE 'Added indexes: status, questions (GIN), wizard_answers (GIN), current_step, created_at';
  RAISE NOTICE 'Added trigger: update_updated_at_column';
END $$;

