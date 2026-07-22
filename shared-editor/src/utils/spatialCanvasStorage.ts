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
    try {
      supabase.from("canvas_edges").upsert({
        id: "spatial_workspace",
        data: data,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // offline fallback
    }
  }
}
