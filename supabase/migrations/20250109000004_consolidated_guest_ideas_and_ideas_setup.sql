-- Consolidated migration for guest ideas and ideas table setup
-- This replaces all previous migrations for a clean development state

-- Create guest_ideas table for demo analytics and tracking (if not exists)
CREATE TABLE IF NOT EXISTS guest_ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_session_id TEXT NOT NULL,
  idea_text TEXT NOT NULL,
  problem TEXT NOT NULL,
  audience TEXT NOT NULL,
  solution TEXT NOT NULL,
  monetization TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_guest_ideas_session ON guest_ideas(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_guest_ideas_created_at ON guest_ideas(created_at DESC);

-- Enable Row Level Security for guest_ideas
ALTER TABLE guest_ideas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for guest_ideas (allow anonymous access)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous guest idea creation" ON guest_ideas;
DROP POLICY IF EXISTS "Allow reading own guest ideas" ON guest_ideas;
DROP POLICY IF EXISTS "Allow anonymous guest idea reading" ON guest_ideas;
DROP POLICY IF EXISTS "Allow anonymous guest idea update" ON guest_ideas;
DROP POLICY IF EXISTS "Allow anonymous guest idea delete" ON guest_ideas;

CREATE POLICY "Allow anonymous guest idea creation" ON guest_ideas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous guest idea reading" ON guest_ideas
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous guest idea update" ON guest_ideas
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous guest idea delete" ON guest_ideas
  FOR DELETE USING (true);

-- Create ideas table (if not exists)
CREATE TABLE IF NOT EXISTS ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_text TEXT NOT NULL,
  problem TEXT NOT NULL,
  audience TEXT NOT NULL,
  solution TEXT NOT NULL,
  monetization TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for ideas table
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);

-- Enable Row Level Security for ideas
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ideas (allow authenticated users)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Anyone can insert ideas" ON ideas;
DROP POLICY IF EXISTS "Users can read accessible ideas" ON ideas;
DROP POLICY IF EXISTS "Users can update own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can delete own ideas" ON ideas;
DROP POLICY IF EXISTS "Allow authenticated users to insert ideas" ON ideas;
DROP POLICY IF EXISTS "Users can read their own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can update their own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can delete their own ideas" ON ideas;

CREATE POLICY "Allow authenticated users to insert ideas" ON ideas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read their own ideas" ON ideas
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own ideas" ON ideas
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own ideas" ON ideas
  FOR DELETE USING (user_id = auth.uid());
