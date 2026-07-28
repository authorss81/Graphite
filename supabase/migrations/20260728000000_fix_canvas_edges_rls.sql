-- Fix RLS on canvas_edges: add user_id column, data/updated_at columns, proper user isolation

-- Add columns needed by the spatial canvas storage code
ALTER TABLE canvas_edges ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE canvas_edges ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE canvas_edges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- Backfill user_id where doc_id matches a note node
UPDATE canvas_edges ce
SET user_id = nn.user_id
FROM note_nodes nn
WHERE ce.doc_id = nn.id::text
  AND ce.user_id IS NULL;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can manage edges of their own documents" ON canvas_edges;

-- Enforce per-user isolation on all operations
CREATE POLICY "Users can manage their own canvas edges"
  ON canvas_edges FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own canvas edges"
  ON canvas_edges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_canvas_edges_user_id ON canvas_edges(user_id);
