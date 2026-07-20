export interface GraphiteDoc {
  id: string;
  title: string;
  isFolder: boolean;
  parentId: string | null;
  updatedAt: number;
  editorState: string;
  canvasData: any;
}

const STORAGE_KEY = "graphite_docs_v1";

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

export function saveDocs(docs: Record<string, GraphiteDoc>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.warn("Failed to persist documents", e);
  }
}
