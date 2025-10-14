-- =====================================================
-- Migration: Create Competitors Table
-- Description: Stores competitor intelligence per idea
-- =====================================================

-- 1. Create competitors table
CREATE TABLE IF NOT EXISTS competitors (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Company Info
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  
  -- Funding Info
  funding_amount NUMERIC,               -- e.g., 23000000 for $23M
  funding_stage TEXT,                   -- 'seed', 'series-a', 'series-b', etc.
  last_funding_date DATE,
  total_funding_rounds INTEGER,
  
  -- Company Details
  team_size INTEGER,
  founded_date DATE,
  headquarters TEXT,
  
  -- Product Info
  pricing_model TEXT,                   -- 'freemium', 'subscription', 'one-time', 'enterprise'
  pricing_amount NUMERIC,               -- Monthly price
  key_features JSONB DEFAULT '[]'::JSONB,  -- Array of features
  
  -- Competitive Analysis
  competitive_advantage TEXT,           -- What makes them strong
  our_differentiation TEXT,             -- How we're different/better
  threat_level INTEGER CHECK (threat_level >= 1 AND threat_level <= 10),
  
  -- Metadata
  data_source TEXT DEFAULT 'ai_generated',  -- 'ai_generated', 'user_added', 'web_search'
  confidence_score INTEGER CHECK (confidence_score >= 1 AND confidence_score <= 10),
  is_direct_competitor BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_competitors_idea_id ON competitors(idea_id);
CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_competitors_threat_level ON competitors(threat_level DESC);
CREATE INDEX IF NOT EXISTS idx_competitors_name ON competitors USING gin(to_tsvector('english', name));

-- 3. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
CREATE TRIGGER update_competitors_updated_at 
  BEFORE UPDATE ON competitors
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable Row Level Security
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- Policy: Users can view competitors for their own ideas
CREATE POLICY "Users can view competitors for their ideas"
  ON competitors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ideas 
      WHERE ideas.id = competitors.idea_id 
      AND ideas.user_id = auth.uid()
    )
  );

-- Policy: Users can insert competitors for their own ideas
CREATE POLICY "Users can insert competitors for their ideas"
  ON competitors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ideas 
      WHERE ideas.id = competitors.idea_id 
      AND ideas.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Users can update their own competitors
CREATE POLICY "Users can update their competitors"
  ON competitors
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own competitors
CREATE POLICY "Users can delete their competitors"
  ON competitors
  FOR DELETE
  USING (user_id = auth.uid());

-- 7. Add comment to table
COMMENT ON TABLE competitors IS 'Stores competitor intelligence and analysis for each idea';

-- =====================================================
-- Migration Complete
-- =====================================================
