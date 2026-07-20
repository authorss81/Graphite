-- Setup Postgres schema for Graphite Note Taking App
-- Enabled Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- Enable pgvector for AI semantic search embeddings

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
    tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    database_id UUID
);

-- 2. Create block_entities table
CREATE TABLE IF NOT EXISTS block_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES note_nodes(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    order_index TEXT NOT NULL, -- LexoRank string key (fractional index)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

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

-- Backlinks Policies
CREATE POLICY "Users can manage backlinks of their own notes" 
    ON backlink_entities FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM note_nodes 
            WHERE note_nodes.id = backlink_entities.source_note_id 
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
