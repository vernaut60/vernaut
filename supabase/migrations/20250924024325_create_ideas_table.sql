-- Create ideas table (if not exists - may already exist from earlier migration)
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

-- Add indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);

-- Enable Row Level Security (idempotent - safe if already enabled)
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;