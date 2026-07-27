import { createClient } from "@supabase/supabase-js";
import { decodeBase64, encodeBase64 } from "./bridge";
import type { GraphiteDoc } from "./docStorage";
import { logToNative } from "./bridge";

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
  private session: any = null;
  private onPullCallback: ((docs: Record<string, GraphiteDoc>) => void) | null = null;
  private pendingSyncs: Map<string, { payload: Partial<GraphiteDoc>; timer: ReturnType<typeof setTimeout> }> = new Map();
  private readonly DEBOUNCE_MS = 500;

  private constructor() {
    this.loadOfflineQueue();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        this.session = session;
        if (session) {
          this.flushOfflineQueue().catch(console.error);
          this.autoPull().catch(console.error);
        }
      });
      supabase.auth.onAuthStateChange((_event, session) => {
        this.session = session;
        if (session) {
          this.flushOfflineQueue().catch(console.error);
          this.autoPull().catch(console.error);
        }
      });
    }
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.flushOfflineQueue().catch(console.error);
      });
      window.addEventListener("beforeunload", () => {
        this.flushPendingSyncs();
      });
    }
  }

  syncDocumentDebounced(docId: string, docPayload: Partial<GraphiteDoc>): void {
    if (!supabase || !this.session) {
      this.queueOfflineOp({ docId, action: "upsert", payload: docPayload }).catch(() => {});
      this.state.status = "offline";
      return;
    }

    const existing = this.pendingSyncs.get(docId);
    if (existing) {
      clearTimeout(existing.timer);
      existing.payload = { ...existing.payload, ...docPayload, updatedAt: Date.now() };
    }

    const payload = existing ? existing.payload : { ...docPayload, updatedAt: Date.now() };
    const timer = setTimeout(() => {
      this.pendingSyncs.delete(docId);
      this.syncDocument(docId, payload).catch((err) => {
        console.error("[Sync] debounced sync failed:", err);
      });
    }, this.DEBOUNCE_MS);

    if (existing) {
      existing.timer = timer;
    } else {
      this.pendingSyncs.set(docId, { payload, timer });
    }
  }

  flushPendingSyncs(): void {
    const entries = Array.from(this.pendingSyncs.entries());
    this.pendingSyncs.clear();
    for (const [docId, { payload, timer }] of entries) {
      clearTimeout(timer);
      this.syncDocument(docId, payload).catch((err) => {
        console.error(`[Sync] flush failed for ${docId}:`, err);
      });
    }
  }

  setOnPullCallback(cb: (docs: Record<string, GraphiteDoc>) => void) {
    this.onPullCallback = cb;
  }

  private async autoPull() {
    try {
      const docs = await this.pullFromSupabase();
      if (this.onPullCallback && Object.keys(docs).length > 0) {
        this.onPullCallback(docs);
      }
    } catch (err) {
      logToNative("warn", `auto-pull failed: ${err instanceof Error ? err.message : String(err)}`);
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

  private queueKey: CryptoKey | null = null;
  private encryptedQueueRaw: string | null = null;

  private async getQueueKey(): Promise<CryptoKey | null> {
    if (this.queueKey) return this.queueKey;
    try {
      let seed = localStorage.getItem("graphite_offline_queue_seed");
      if (!seed) {
        seed = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, "0")).join("");
        localStorage.setItem("graphite_offline_queue_seed", seed);
      }
      const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(seed), "PBKDF2", false, ["deriveKey"]);
      const salt = new Uint8Array(16);
      this.queueKey = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 10000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
      return this.queueKey;
    } catch {
      return null;
    }
  }

  private async ensureQueueDecrypted(): Promise<void> {
    if (this.encryptedQueueRaw && this.state.offlineQueue.length === 0) {
      try {
        const key = await this.getQueueKey();
        if (!key) return;
        const raw = this.encryptedQueueRaw;
        const decoded = atob(raw.slice(5));
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
        const iv = bytes.slice(0, 12);
        const data = bytes.slice(12);
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
        this.state.offlineQueue = JSON.parse(new TextDecoder().decode(decrypted));
      } catch {}
      this.encryptedQueueRaw = null;
    }
  }

  private async encryptQueue(data: string): Promise<string | null> {
    try {
      const key = await this.getQueueKey();
      if (!key) return null;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(data));
      const packed = new Uint8Array(12 + encrypted.byteLength);
      packed.set(iv, 0);
      packed.set(new Uint8Array(encrypted), 12);
      return "encq:" + btoa(String.fromCharCode(...packed));
    } catch {
      return null;
    }
  }

  private loadOfflineQueue() {
    try {
      const raw = localStorage.getItem("graphite_offline_queue");
      if (raw && raw.startsWith("encq:")) {
        this.encryptedQueueRaw = raw;
        this.state.offlineQueue = [];
      } else if (raw) {
        this.state.offlineQueue = JSON.parse(raw);
      }
    } catch {
      this.state.offlineQueue = [];
    }
  }

  private async saveOfflineQueue() {
    try {
      if (this.state.offlineQueue.length > 15) {
        this.state.offlineQueue = this.state.offlineQueue.slice(-15);
      }
      const data = JSON.stringify(this.state.offlineQueue);
      const encrypted = await this.encryptQueue(data);
      if (encrypted) {
        localStorage.setItem("graphite_offline_queue", encrypted);
      } else {
        localStorage.setItem("graphite_offline_queue", data);
      }
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

  async queueOfflineOp(op: Omit<OfflineSyncOp, "id" | "timestamp">) {
    const fullOp: OfflineSyncOp = {
      ...op,
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };

    // Coalesce queued upserts for the same docId to keep queue bounded and prevent duplicates
    const filtered = this.state.offlineQueue.filter(
      (existing) => !(existing.docId === op.docId && existing.action === op.action)
    );
    filtered.push(fullOp);
    this.state.offlineQueue = filtered.slice(-100);
    await this.saveOfflineQueue();
  }

  async flushOfflineQueue(): Promise<void> {
    await this.ensureQueueDecrypted();
    if (!supabase || !this.session || !navigator.onLine || this.state.offlineQueue.length === 0) {
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
    await this.saveOfflineQueue();
    this.state.status = failed.length > 0 ? "error" : "idle";
  }

  /**
   * NOTE: Row-Level Security (RLS) must be enabled on note_nodes and block_entities.
   * SQL migration to create:
   *   CREATE POLICY user_isolation ON note_nodes FOR ALL USING (auth.uid() = user_id);
   *   CREATE POLICY user_isolation ON block_entities FOR ALL USING (auth.uid() = user_id);
   */
  async pullFromSupabase(): Promise<Record<string, GraphiteDoc>> {
    if (!supabase || !this.session) return {};

    const { data: nodes, error: nodeError } = await supabase
      .from("note_nodes")
      .select("*");

    if (nodeError) throw nodeError;
    if (!nodes || nodes.length === 0) return {};

    const noteIds = nodes.map((n: any) => n.id);
    const { data: blocks, error: blockError } = await supabase
      .from("block_entities")
      .select("*")
      .in("note_id", noteIds)
      .eq("type", "document_content");

    if (blockError) throw blockError;

    const docs: Record<string, GraphiteDoc> = {};
    for (const node of nodes) {
      const block = blocks?.find((b: any) => b.note_id === node.id);
      let editorState = "";
      let canvasData = null;

      if (block?.content) {
        try {
          const parsed = JSON.parse(block.content);
          editorState = parsed.editorState
            ? decodeBase64(parsed.editorState)
            : "";
          canvasData = parsed.canvasData || null;
        } catch {}
      }

      docs[node.id] = {
        id: node.id,
        title: node.title || "Untitled",
        isFolder: node.is_folder || false,
        parentId: node.parent_id || null,
        updatedAt: new Date(node.updated_at || Date.now()).getTime(),
        editorState,
        canvasData,
        tags: node.tags || [],
        isPinned: node.is_pinned || false,
        isArchived: node.is_archived || false,
      };
    }

    return docs;
  }

  async syncDocument(docId: string, docPayload: Partial<GraphiteDoc>): Promise<void> {
    if (!supabase || !this.session) {
      this.queueOfflineOp({ docId, action: "upsert", payload: docPayload }).catch(() => {});
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
          user_id: this.session.user.id,
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
      this.queueOfflineOp({ docId, action: "upsert", payload: docPayload }).catch(() => {});
      throw err;
    }
  }

  subscribeRealtime(
    onDocUpdated: (docId: string, data: Partial<GraphiteDoc>) => void,
    onDocDeleted: (docId: string) => void
  ): () => void {
    if (!supabase || !this.session) return () => {};
    const channelTopic = `graphite_realtime_${crypto.randomUUID().slice(0, 7)}`;
    const userId = this.session?.user?.id;
    if (!userId) return () => {};
    const channel = supabase
      .channel(channelTopic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "note_nodes", filter: `user_id=eq.${userId}` },
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
        { event: "*", schema: "public", table: "block_entities", filter: `user_id=eq.${userId}` },
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
