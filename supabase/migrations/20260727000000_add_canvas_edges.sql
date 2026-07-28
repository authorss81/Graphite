-- Create canvas_edges table for Spatial Canvas edge persistence
CREATE TABLE IF NOT EXISTS canvas_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id TEXT NOT NULL,
    from_card_id TEXT NOT NULL,
    to_card_id TEXT NOT NULL,
    edge_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_canvas_edges_doc_id ON canvas_edges(doc_id);

ALTER TABLE canvas_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage edges of their own documents" ON canvas_edges;
CREATE POLICY "Users can manage edges of their own documents" 
    ON canvas_edges FOR ALL 
    USING (auth.uid() IS NOT NULL);
