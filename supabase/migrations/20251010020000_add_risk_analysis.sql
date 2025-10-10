-- Add risk analysis columns to guest_ideas and ideas tables

-- Add risk_score and risk_analysis to guest_ideas
ALTER TABLE guest_ideas 
ADD COLUMN IF NOT EXISTS risk_score DECIMAL(3,1),           -- Overall risk score (0-10)
ADD COLUMN IF NOT EXISTS risk_analysis JSONB;                -- Detailed risk breakdown

-- Create indexes for guest_ideas risk columns
CREATE INDEX IF NOT EXISTS idx_guest_ideas_risk_score ON guest_ideas(risk_score);
CREATE INDEX IF NOT EXISTS idx_guest_ideas_risk_analysis_gin ON guest_ideas USING GIN (risk_analysis);

-- Add risk_score and risk_analysis to ideas
ALTER TABLE ideas 
ADD COLUMN IF NOT EXISTS risk_score DECIMAL(3,1),           -- Overall risk score (0-10)
ADD COLUMN IF NOT EXISTS risk_analysis JSONB;                -- Detailed risk breakdown

-- Create indexes for ideas risk columns
CREATE INDEX IF NOT EXISTS idx_ideas_risk_score ON ideas(risk_score);
CREATE INDEX IF NOT EXISTS idx_ideas_risk_analysis_gin ON ideas USING GIN (risk_analysis);

-- Existing RLS policies permit insert/update; no changes needed for new columns
