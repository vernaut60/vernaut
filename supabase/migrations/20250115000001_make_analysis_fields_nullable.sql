-- Migration: Make analysis fields nullable for wizard flow
-- Description: problem, audience, solution, monetization should be nullable
--               since they're populated later (from wizard or Stage 1 analysis)
-- Date: 2025-01-15

-- Make these fields nullable (they're populated during wizard/analysis)
ALTER TABLE ideas
ALTER COLUMN problem DROP NOT NULL,
ALTER COLUMN audience DROP NOT NULL,
ALTER COLUMN solution DROP NOT NULL,
ALTER COLUMN monetization DROP NOT NULL;

-- Add comments explaining why nullable
COMMENT ON COLUMN ideas.problem IS 'Problem statement - populated from wizard answers or Stage 1 analysis';
COMMENT ON COLUMN ideas.audience IS 'Target audience - populated from wizard answers or Stage 1 analysis';
COMMENT ON COLUMN ideas.solution IS 'Solution description - populated from wizard answers or Stage 1 analysis';
COMMENT ON COLUMN ideas.monetization IS 'Monetization strategy - populated from wizard answers or Stage 1 analysis';

