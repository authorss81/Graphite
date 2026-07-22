import type { GraphiteDoc } from "./docStorage";

const DB_NAME = "GraphiteStudioDB";
const DB_VERSION = 1;
const STORE_DOCS = "documents";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        const store = db.createObjectStore(STORE_DOCS, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
        store.createIndex("title", "title", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSaveDoc(doc: GraphiteDoc): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DOCS, "readwrite");
    const store = tx.objectStore(STORE_DOCS);
    await new Promise<void>((resolve, reject) => {
      const req = store.put(doc);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    /* fallback to localStorage handled in docStorage */
  }
}

export async function idbLoadAllDocs(): Promise<GraphiteDoc[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DOCS, "readonly");
    const store = tx.objectStore(STORE_DOCS);
    return await new Promise<GraphiteDoc[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function idbSearchDocs(query: string): Promise<GraphiteDoc[]> {
  const all = await idbLoadAllDocs();
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter(
    (d) =>
      d.title.toLowerCase().includes(q) ||
      (d.editorState && d.editorState.toLowerCase().includes(q))
  );
}
