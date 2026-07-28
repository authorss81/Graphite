/**
 * Spatial Canvas Storage — saved to localStorage and synced to Supabase canvas_edges table.
 * NOTE: RLS should be enabled on canvas_edges table with policy:
 *   CREATE POLICY user_isolation ON canvas_edges FOR ALL USING (auth.uid() = user_id);
 */
import { supabase, isSupabaseAvailable } from "./supabase";

export interface SpatialCard {
  id: string;
  docId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  imageUrl?: string;
  content?: string;
}

export interface SpatialEdge {
  id: string;
  fromCardId: string;
  toCardId: string;
  label?: string;
}

export interface SpatialCanvasData {
  cards: SpatialCard[];
  edges: SpatialEdge[];
}

const SPATIAL_KEY = "graphite_spatial_canvas_v1";
const SPATIAL_WORKSPACE_ID_KEY = "graphite_spatial_workspace_id";

function getWorkspaceId(): string {
  try {
    const existing = localStorage.getItem(SPATIAL_WORKSPACE_ID_KEY);
    if (existing) return existing;
    const id = "ws_" + crypto.randomUUID();
    localStorage.setItem(SPATIAL_WORKSPACE_ID_KEY, id);
    return id;
  } catch {
    return "spatial_workspace";
  }
}

export function loadSpatialCanvasData(): SpatialCanvasData {
  try {
    const raw = localStorage.getItem(SPATIAL_KEY);
    if (!raw) return { cards: [], edges: [] };
    const parsed = JSON.parse(raw);
    return {
      cards: parsed.cards || [],
      edges: parsed.edges || [],
    };
  } catch {
    return { cards: [], edges: [] };
  }
}

export function saveSpatialCanvasData(data: SpatialCanvasData): void {
  try {
    localStorage.setItem(SPATIAL_KEY, JSON.stringify(data));
  } catch {
    // quota fallback
  }

  if (isSupabaseAvailable() && supabase) {
    const client = supabase;
    client.auth.getSession().then(({ data: { session } }) => {
      client
        .from("canvas_edges")
        .upsert({
          id: getWorkspaceId(),
          user_id: session?.user?.id,
          data: data,
          updated_at: new Date().toISOString(),
        })
        .then(
          (res: any) => {
            if (res?.error) console.warn("Spatial canvas sync failed:", res.error.message);
          },
          (err: unknown) => {
            console.warn("Spatial sync error:", err);
          }
        );
    });
  }
}
