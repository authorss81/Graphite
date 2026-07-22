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
    const payload = JSON.stringify(docs);
    if (new Blob([payload]).size <= MAX_BYTES) {
      localStorage.setItem(STORAGE_KEY, payload);
      return;
    }
    // Quota would be exceeded — use trimmed version
    const trimmed = trimForStorage(docs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // Last resort — try saving without any canvasData at all
    try {
      const noCanvas: Record<string, GraphiteDoc> = {};
      for (const [id, doc] of Object.entries(docs)) {
        noCanvas[id] = { ...doc, canvasData: null };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(noCanvas));
    } catch {
      console.warn("Failed to persist documents even after trimming canvas data", e);
    }
  }
}
