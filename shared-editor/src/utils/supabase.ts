import { createClient } from "@supabase/supabase-js";
import { decodeBase64, encodeBase64 } from "./bridge";
import type { GraphiteDoc } from "./docStorage";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}

export interface OfflineSyncOp {
  id: string;
  docId: string;
  action: "upsert" | "delete";
  payload: Partial<GraphiteDoc>;
  timestamp: number;
}

export interface SyncState {
  local: {
    notes: Record<string, any>;
    blocks: Record<string, any>;
    dirty: Set<string>;
  };
  remote: {
    version: string;
    lastSync: number;
  };
  status: "idle" | "syncing" | "error" | "offline";
  error: string | null;
  offlineQueue: OfflineSyncOp[];
}

export class SupabaseSyncService {
  private static instance: SupabaseSyncService | null = null;
  private state: SyncState = {
    local: { notes: {}, blocks: {}, dirty: new Set() },
    remote: { version: "0", lastSync: 0 },
    status: "idle",
    error: null,
    offlineQueue: [],
  };

  private constructor() {
    this.loadOfflineQueue();
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.flushOfflineQueue().catch(console.error);
      });
    }
  }

  static getInstance(): SupabaseSyncService {
    if (!SupabaseSyncService.instance) {
      SupabaseSyncService.instance = new SupabaseSyncService();
    }
    return SupabaseSyncService.instance;
  }

  getState(): SyncState {
    return { ...this.state, offlineQueue: [...this.state.offlineQueue] };
  }

  private loadOfflineQueue() {
    try {
      const raw = localStorage.getItem("graphite_offline_queue");
      if (raw) {
        this.state.offlineQueue = JSON.parse(raw);
      }
    } catch {
      this.state.offlineQueue = [];
    }
  }

  private saveOfflineQueue() {
    try {
      if (this.state.offlineQueue.length > 15) {
        this.state.offlineQueue = this.state.offlineQueue.slice(-15);
      }
      localStorage.setItem(
        "graphite_offline_queue",
        JSON.stringify(this.state.offlineQueue)
      );
    } catch (e) {
      this.state.offlineQueue = this.state.offlineQueue.slice(-3);
      try {
        localStorage.setItem(
          "graphite_offline_queue",
          JSON.stringify(this.state.offlineQueue)
        );
      } catch {
        /* ignore storage failure */
      }
    }
  }

  queueOfflineOp(op: Omit<OfflineSyncOp, "id" | "timestamp">) {
    const fullOp: OfflineSyncOp = {
      ...op,
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };

    // Coalesce queued upserts for the same docId to keep queue bounded and prevent duplicates
    const filtered = this.state.offlineQueue.filter(
      (existing) => !(existing.docId === op.docId && existing.action === op.action)
    );
    filtered.push(fullOp);
    this.state.offlineQueue = filtered.slice(-100);
    this.saveOfflineQueue();
  }

  async flushOfflineQueue(): Promise<void> {
    if (!supabase || !navigator.onLine || this.state.offlineQueue.length === 0) {
      return;
    }

    this.state.status = "syncing";
    const queue = [...this.state.offlineQueue];
    const failed: OfflineSyncOp[] = [];

    for (const op of queue) {
      try {
        if (op.action === "upsert") {
          await this.syncDocument(op.docId, op.payload);
        } else if (op.action === "delete") {
          await supabase.from("note_nodes").delete().eq("id", op.docId);
        }
      } catch {
        failed.push(op);
      }
    }

    this.state.offlineQueue = failed;
    this.saveOfflineQueue();
    this.state.status = failed.length > 0 ? "error" : "idle";
  }

  async syncDocument(docId: string, docPayload: Partial<GraphiteDoc>): Promise<void> {
    if (!supabase) {
      this.queueOfflineOp({ docId, action: "upsert", payload: docPayload });
      this.state.status = "offline";
      return;
    }

    this.state.status = "syncing";
    this.state.error = null;

    try {
      const encodedEditor = docPayload.editorState
        ? encodeBase64(docPayload.editorState)
        : "";

      const nodePromise = supabase.from("note_nodes").upsert([
        {
          id: docId,
          title: docPayload.title || "Untitled",
          is_folder: docPayload.isFolder || false,
          parent_id: docPayload.parentId || null,
          updated_at: new Date(docPayload.updatedAt || Date.now()).toISOString(),
          tags: docPayload.tags || [],
        },
      ]);

      const blockPromise = (docPayload.editorState !== undefined || docPayload.canvasData !== undefined)
        ? supabase.from("block_entities").upsert([
            {
              note_id: docId,
              type: "document_content",
              content: JSON.stringify({
                editorState: encodedEditor,
                canvasData: docPayload.canvasData,
              }),
              order_index: 0,
              updated_at: new Date().toISOString(),
            },
          ])
        : Promise.resolve({ error: null });

      const [nodeRes, blockRes] = await Promise.all([nodePromise, blockPromise]);
      if (nodeRes.error) throw nodeRes.error;
      if (blockRes.error) throw blockRes.error;

      this.state.status = "idle";
      this.state.remote.lastSync = Date.now();
    } catch (err) {
      this.state.status = "error";
      this.state.error = (err as Error).message;
      this.queueOfflineOp({ docId, action: "upsert", payload: docPayload });
      throw err;
    }
  }

  subscribeRealtime(
    onDocUpdated: (docId: string, data: Partial<GraphiteDoc>) => void,
    onDocDeleted: (docId: string) => void
  ): () => void {
    if (!supabase) return () => {};
    const channelTopic = `graphite_realtime_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelTopic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "note_nodes" },
        (payload: any) => {
          if (payload.eventType === "DELETE") {
            onDocDeleted(payload.old.id);
          } else if (payload.new) {
            onDocUpdated(payload.new.id, {
              id: payload.new.id,
              title: payload.new.title,
              isFolder: payload.new.is_folder,
              parentId: payload.new.parent_id,
              updatedAt: new Date(payload.new.updated_at).getTime(),
              tags: payload.new.tags,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "block_entities" },
        (payload: any) => {
          if (payload.new && payload.new.type === "document_content") {
            try {
              const parsed = JSON.parse(payload.new.content);
              const decodedEditor = parsed.editorState
                ? decodeBase64(parsed.editorState)
                : "";
              onDocUpdated(payload.new.note_id, {
                editorState: decodedEditor,
                canvasData: parsed.canvasData,
              });
            } catch (err) {
              console.error("Error parsing realtime block content:", err);
            }
          }
        }
      );

    channel.subscribe();
    return () => {
      channel.unsubscribe();
    };
  }
}
