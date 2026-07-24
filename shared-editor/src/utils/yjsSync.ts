import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { awarenessStates } from "./userRegistry";

const YJS_DB_PREFIX = "graphite_yjs_";

const docs = new Map<string, { doc: Y.Doc; provider: IndexeddbPersistence; channel: BroadcastChannel }>();
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
  const existing = docs.get(docId);
  if (existing) return existing.doc;

  const doc = new Y.Doc({ guid: docId });
  const provider = new IndexeddbPersistence(`${YJS_DB_PREFIX}${docId}`, doc);
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
      const states = event.data.states;
      for (const [clientId, state] of Object.entries(states)) {
        awarenessStates.set(Number(clientId), state as any);
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

  provider.on("synced", () => {
    provider.destroy(); // Keep IndexedDB updated but don't keep sync connection alive
  });

  docs.set(docId, { doc, provider, channel });

  return doc;
}

export function closeYDoc(docId: string): void {
  const existing = docs.get(docId);
  if (!existing) return;
  existing.channel.close();
  existing.provider.destroy();
  existing.doc.destroy();
  docs.delete(docId);
}

export function setAwarenessState(userId: string, userName: string, color: string, state: Partial<{
  cursor: { x: number; y: number; };
  focused: boolean;
  docId: string;
}>) {
  const clientId = new Date().getTime();
  awarenessStates.set(clientId, {
    user: { id: userId, name: userName, color: color || getUserColor(userId) },
    cursor: state.cursor || null,
    focused: state.focused ?? true,
    docId: state.docId || "",
    lastSeen: Date.now(),
  });
  return clientId;
}

export function clearAwareness(clientId: number): void {
  awarenessStates.delete(clientId);
}
