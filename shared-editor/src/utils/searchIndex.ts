const DB_NAME = "graphite_search";
const DB_VERSION = 1;
const STORE_NAME = "fts";

interface SearchDoc {
  id: string;
  title: string;
  text: string;
  tags: string[];
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("title", "title", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function indexDocument(id: string, title: string, text: string, tags: string[] = []) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id, title, text, tags, updatedAt: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // silent fail
  }
}

export async function removeFromIndex(id: string) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // silent fail
  }
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
}

function snippet(text: string, query: string, context: number = 60): string {
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return text.slice(0, context * 2);
  const start = Math.max(0, idx - context);
  const end = Math.min(text.length, idx + query.length + context);
  let result = "";
  if (start > 0) result += "…";
  result += text.slice(start, end);
  if (end < text.length) result += "…";
  return result;
}

export async function searchIndex(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const all: SearchDoc[] = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    const results: SearchResult[] = [];
    for (const doc of all) {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const textLower = doc.text.toLowerCase();
      if (titleLower.includes(q)) {
        score += 10;
        if (titleLower === q) score += 20;
        if (titleLower.startsWith(q)) score += 5;
      }
      if (textLower.includes(q)) {
        score += 1;
        const count = (textLower.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
        score += count * 0.5;
      }
      for (const tag of doc.tags) {
        if (tag.toLowerCase().includes(q)) score += 3;
      }
      if (score > 0) {
        results.push({
          id: doc.id,
          title: doc.title,
          snippet: snippet(doc.text, q),
          score,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 50);
  } catch {
    return [];
  }
}
