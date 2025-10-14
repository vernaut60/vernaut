-- Add missing analysis columns to guest_ideas table
-- This ensures guest users can save analysis data and handoff works properly

-- Add analysis columns to guest_ideas table
ALTER TABLE guest_ideas 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS ai_insights JSONB,
ADD COLUMN IF NOT EXISTS score INTEGER,
ADD COLUMN IF NOT EXISTS risk_score DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS risk_analysis JSONB;

-- Add indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_guest_ideas_title ON guest_ideas(title);
CREATE INDEX IF NOT EXISTS idx_guest_ideas_score ON guest_ideas(score);
CREATE INDEX IF NOT EXISTS idx_guest_ideas_risk_score ON guest_ideas(risk_score);
CREATE INDEX IF NOT EXISTS idx_guest_ideas_ai_insights_gin ON guest_ideas USING GIN (ai_insights);
CREATE INDEX IF NOT EXISTS idx_guest_ideas_risk_analysis_gin ON guest_ideas USING GIN (risk_analysis);

-- Add column comments for documentation
COMMENT ON COLUMN guest_ideas.title IS 'Clean, truncated title for display purposes';
COMMENT ON COLUMN guest_ideas.ai_insights IS 'AI-generated insights and breakdown';
COMMENT ON COLUMN guest_ideas.score IS 'Overall idea score (0-100)';
COMMENT ON COLUMN guest_ideas.risk_score IS 'Overall risk score (0-10)';
COMMENT ON COLUMN guest_ideas.risk_analysis IS 'Detailed risk breakdown with categories and explanations';
