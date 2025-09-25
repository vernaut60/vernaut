-- Add Row Level Security policies for ideas table

-- Policy 1: Allow anyone to insert ideas (supports anonymous users)
CREATE POLICY "Anyone can insert ideas" ON ideas
FOR INSERT WITH CHECK (true);

-- Policy 2: Allow users to read their own ideas + anonymous ideas
CREATE POLICY "Users can read accessible ideas" ON ideas
FOR SELECT USING (
  user_id = auth.uid() OR  -- Users can read their own ideas
  user_id IS NULL          -- Anyone can read anonymous ideas
);

-- Policy 3: Allow users to update only their own ideas
CREATE POLICY "Users can update own ideas" ON ideas
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 4: Allow users to delete only their own ideas
CREATE POLICY "Users can delete own ideas" ON ideas
FOR DELETE USING (user_id = auth.uid());