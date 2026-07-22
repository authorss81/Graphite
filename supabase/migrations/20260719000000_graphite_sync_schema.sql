-- Setup Postgres schema for Graphite Note Taking App
-- Enabled Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- Enable pgvector for AI semantic search embeddings

-- Trigger function for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Create note_nodes table
CREATE TABLE IF NOT EXISTS note_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    parent_id UUID REFERENCES note_nodes(id) ON DELETE CASCADE,
    is_folder BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    is_tombstone BOOLEAN NOT NULL DEFAULT FALSE, -- Soft deletion / zombie column for CRDT sync
    tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    database_id UUID
);

CREATE TRIGGER trigger_update_note_nodes_timestamp
BEFORE UPDATE ON note_nodes
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- 2. Create block_entities table
CREATE TABLE IF NOT EXISTS block_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES note_nodes(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    order_index TEXT NOT NULL, -- LexoRank string key (fractional index)
    is_tombstone BOOLEAN NOT NULL DEFAULT FALSE, -- Soft deletion / zombie column
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TRIGGER trigger_update_block_entities_timestamp
BEFORE UPDATE ON block_entities
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- 3. Create backlink_entities table
CREATE TABLE IF NOT EXISTS backlink_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_note_id UUID NOT NULL REFERENCES note_nodes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES note_nodes(id) ON DELETE CASCADE,
    context_text TEXT NOT NULL
);

-- 4. Create document_embeddings table for Local-to-Cloud AI Semantic Search
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID UNIQUE NOT NULL REFERENCES note_nodes(id) ON DELETE CASCADE,
    embedding VECTOR(384), -- 384 dimensions matching MiniLM-L6-v2 embeddings
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row-Level Security (RLS) policies for user isolation
ALTER TABLE note_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Note Nodes Policies
CREATE POLICY "Users can manage their own note nodes" 
    ON note_nodes FOR ALL 
    USING (auth.uid() = user_id);

-- Block Entities Policies (checks user ownership of parent Note)
CREATE POLICY "Users can manage blocks of their own notes" 
    ON block_entities FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM note_nodes 
            WHERE note_nodes.id = block_entities.note_id 
              AND note_nodes.user_id = auth.uid()
        )
    );

-- Backlinks Policies (Checks BOTH source_note_id and target_note_id ownership - F7 Fix)
CREATE POLICY "Users can manage backlinks of their own notes" 
    ON backlink_entities FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM note_nodes 
            WHERE note_nodes.id = backlink_entities.source_note_id 
              AND note_nodes.user_id = auth.uid()
        ) AND EXISTS (
            SELECT 1 FROM note_nodes 
            WHERE note_nodes.id = backlink_entities.target_note_id 
              AND note_nodes.user_id = auth.uid()
        )
    );

-- Embeddings Policies
CREATE POLICY "Users can manage embeddings of their own notes" 
    ON document_embeddings FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM note_nodes 
            WHERE note_nodes.id = document_embeddings.note_id 
              AND note_nodes.user_id = auth.uid()
        )
    );

-- Setup Realtime replication for collaborative document edits
ALTER PUBLICATION supabase_realtime ADD TABLE note_nodes, block_entities, backlink_entities;

-- 5. Create document_sync table for tracking sync state
CREATE TABLE IF NOT EXISTS document_sync (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    synced BOOLEAN NOT NULL DEFAULT FALSE
);

-- Add index on doc_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_document_sync_doc_id ON document_sync(doc_id);

-- Add index on created_at for incremental pulls
CREATE INDEX IF NOT EXISTS idx_document_sync_created_at ON document_sync(created_at);

-- Insert policies for authenticated users
CREATE POLICY "Users can insert into document_sync" 
  ON document_sync FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can read their own sync records" 
  ON document_sync FOR SELECT 
  USING (auth.uid() IS NOT NULL);
