import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { awarenessStates } from "./userRegistry";

const YJS_DB_PREFIX = "graphite_yjs_";

const docs = new Map<string, { doc: Y.Doc; provider: any; channel: BroadcastChannel; interval: any }>();
const authorizedDocs = new Set<string>();

export function authorizeYDoc(docId: string): void {
  authorizedDocs.add(docId);
}

export function deauthorizeYDoc(docId: string): void {
  authorizedDocs.delete(docId);
}
const userColors = [
  "#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#8b5cf6", "#f97316",
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash) + userId.charCodeAt(i);
  return userColors[Math.abs(hash) % userColors.length];
}

export function getYDoc(docId: string): Y.Doc {
  if (!authorizedDocs.has(docId)) {
    throw new Error(`Unauthorized access to document: ${docId}`);
  }
  const existing = docs.get(docId);
  if (existing) return existing.doc;

  const doc = new Y.Doc({ guid: docId });
  const isTest = typeof globalThis !== "undefined" && (globalThis as any).process?.env?.NODE_ENV === "test";
  const provider = !isTest && typeof indexedDB !== "undefined"
    ? new IndexeddbPersistence(`${YJS_DB_PREFIX}${docId}`, doc)
    : null;
  const channel = new BroadcastChannel(`yjs-sync-${docId}`);

  // Broadcast Yjs updates to other tabs
  doc.on("updateV2", (update: Uint8Array, origin: any) => {
    if (origin !== channel) {
      channel.postMessage({ type: "yjs-update", data: Array.from(update) });
    }
  });

  // Receive Yjs updates from other tabs
  channel.onmessage = (event) => {
    if (event.data.type === "yjs-update") {
      const update = new Uint8Array(event.data.data);
      Y.applyUpdateV2(doc, update, channel);
    }
    if (event.data.type === "yjs-awareness") {
      try {
        const states = event.data.states;
        if (!states || typeof states !== 'object') return;
        const entries = Object.entries(states);
        const capped = entries.slice(0, 50);
        for (const [clientId, state] of capped) {
          const s = state as Record<string, any>;
          if (!s || typeof s !== 'object' || !s.user) continue;
          const user = s.user;
          if (typeof user.id !== 'string' || user.id.length > 64) continue;
          if (typeof user.name !== 'string') continue;
          const sanitizedName = user.name.replace(/[\x00-\x1f\x7f-\x9f]/g, '').slice(0, 30);
          if (typeof user.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(user.color)) continue;
          awarenessStates.set(Number(clientId), {
            ...state,
            user: { ...user, name: sanitizedName },
          } as any);
        }
      } catch (e) {
        console.warn('[Yjs] Failed to process awareness state:', e);
      }
    }
  };

  // Broadcast awareness state changes
  const awarenessInterval = setInterval(() => {
    if (awarenessStates.size > 0) {
      const states: Record<string, any> = {};
      awarenessStates.forEach((state, clientId) => {
        states[clientId] = state;
      });
      channel.postMessage({ type: "yjs-awareness", states });
    }
  }, 200);

  if (provider) {
    provider.on("synced", () => {
      provider.destroy(); // Keep IndexedDB updated but don't keep sync connection alive
    });
  }

  docs.set(docId, { doc, provider, channel, interval: awarenessInterval });

  return doc;
}

export function closeYDoc(docId: string): void {
  const existing = docs.get(docId);
  if (!existing) return;
  existing.channel.close();
  if (existing.provider) existing.provider.destroy();
  if (existing.interval) clearInterval(existing.interval);
  existing.doc.destroy();
  docs.delete(docId);
}

export function setAwarenessState(userId: string, userName: string, color: string, state: Partial<{
  cursor: { x: number; y: number; };
  focused: boolean;
  docId: string;
}>, clientId?: number) {
  const id = clientId ?? new Date().getTime();
  awarenessStates.set(id, {
    user: { id: userId, name: userName, color: color || getUserColor(userId) },
    cursor: state.cursor || null,
    focused: state.focused ?? true,
    docId: state.docId || "",
    lastSeen: Date.now(),
  });
  return id;
}

export function clearAwareness(clientId: number): void {
  awarenessStates.delete(clientId);
}
