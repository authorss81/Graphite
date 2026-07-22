import { idbSaveDoc } from "./idbStorage";

export interface GraphiteDoc {
  id: string;
  title: string;
  isFolder: boolean;
  parentId: string | null;
  updatedAt: number;
  editorState: string;
  canvasData: any;
  tags?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
}

const STORAGE_KEY = "graphite_docs_v1";
// ~4MB safe limit (localStorage quota is 5MB total; leave 1MB for other keys)
const MAX_BYTES = 4 * 1024 * 1024;

export function newDocId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return "doc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function loadDocs(): Record<string, GraphiteDoc> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const PAGE_SIZE = 50;

export function loadDocsPaginated(page: number = 0): { docs: Record<string, GraphiteDoc>; total: number } {
  const all = loadDocs();
  const entries = Object.entries(all).sort(
    ([, a], [, b]) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  );
  const total = entries.length;
  const start = page * PAGE_SIZE;
  const slice = entries.slice(start, start + PAGE_SIZE);
  const docs: Record<string, GraphiteDoc> = {};
  for (const [id, doc] of slice) {
    docs[id] = doc;
  }
  return { docs, total };
}

/**
 * Trims canvas data for docs to reduce storage footprint.
 * If the JSON is still too large, drops canvasData from oldest documents first.
 */
function trimForStorage(docs: Record<string, GraphiteDoc>): Record<string, GraphiteDoc> {
  // Shallow clone with canvasData nulled out for all docs
  const slim: Record<string, GraphiteDoc> = {};
  for (const [id, doc] of Object.entries(docs)) {
    slim[id] = { ...doc, canvasData: null };
  }

  const slimStr = JSON.stringify(slim);
  if (new Blob([slimStr]).size <= MAX_BYTES) {
    // Slim version fits — include canvasData only for recent 5 docs
    const recent = Object.values(docs)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5)
      .map((d) => d.id);
    for (const id of recent) {
      if (docs[id]) slim[id] = { ...docs[id] };
    }
    const withCanvas = JSON.stringify(slim);
    if (new Blob([withCanvas]).size <= MAX_BYTES) return slim;
  }

  return slim;
}

export function saveDocs(docs: Record<string, GraphiteDoc>): void {
  try {
    const diskDocs = loadDocs();
    const merged: Record<string, GraphiteDoc> = { ...diskDocs };

    for (const [id, incoming] of Object.entries(docs)) {
      const diskDoc = diskDocs[id];
      if (!diskDoc || incoming.updatedAt >= diskDoc.updatedAt) {
        merged[id] = incoming;
      }
    }

    const payload = JSON.stringify(merged);
    if (new Blob([payload]).size <= MAX_BYTES) {
      localStorage.setItem(STORAGE_KEY, payload);
    } else {
      const trimmed = trimForStorage(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    }
    // Async persist full docs into IndexedDB for unlimited quota
    for (const doc of Object.values(merged)) {
      idbSaveDoc(doc).catch(() => {});
    }
  } catch {
    // Fallback: trim canvas and write to IndexedDB + localStorage
    try {
      const noCanvas: Record<string, GraphiteDoc> = {};
      for (const [id, doc] of Object.entries(docs)) {
        noCanvas[id] = { ...doc, canvasData: null };
        idbSaveDoc(doc).catch(() => {});
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(noCanvas));
    } catch {
      // Memory backup fallback
    }
  }
}
