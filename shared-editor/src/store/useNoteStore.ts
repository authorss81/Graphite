import { create } from "zustand";
import type { GraphiteDoc } from "../utils/docStorage";
import { newDocId, loadDocs, saveDocs, loadDocsPaginated } from "../utils/docStorage";
import type { SpatialCard, SpatialEdge } from "../utils/spatialCanvasStorage";
import { SupabaseSyncService } from "../utils/supabase";
import { createDocCommit } from "../utils/versionHistory";

let unsubscribeRealtime: (() => void) | null = null;

function parseStats(editorState: string): {
  wordCount: number;
  charCount: number;
  backlinks: string[];
  totalTodos: number;
  completedTodos: number;
} {
  if (!editorState) return { wordCount: 0, charCount: 0, backlinks: [], totalTodos: 0, completedTodos: 0 };
  try {
    const parsed = JSON.parse(editorState);
    let text = "";
    let totalTodos = 0;
    let completedTodos = 0;

    const traverse = (node: any) => {
      if (node.type === "checklistitem" || typeof node.checked === "boolean") {
        totalTodos++;
        if (node.checked) completedTodos++;
      }
      if (node.text) text += node.text + " ";
      if (node.children) node.children.forEach(traverse);
    };
    if (parsed.root) traverse(parsed.root);

    const words = text.trim().split(/\s+/).filter(Boolean);
    const linkRegex = /\[\[(.*?)\]\]/g;
    const foundLinks: string[] = [];
    let match;
    while ((match = linkRegex.exec(text)) !== null) {
      foundLinks.push(match[1]);
    }
    return {
      wordCount: words.length,
      charCount: text.length,
      backlinks: [...new Set(foundLinks)],
      totalTodos,
      completedTodos,
    };
  } catch {
    return { wordCount: 0, charCount: 0, backlinks: [], totalTodos: 0, completedTodos: 0 };
  }
}

interface Toast {
  id: number;
  message: string;
  type: "info" | "error" | "success";
}

interface NoteStore {
  documents: Record<string, GraphiteDoc>;
  docId: string;
  editorState: string;
  canvasData: any;
  activeTab: "editor" | "canvas" | "split" | "spatial" | "graph" | "kanban" | "meta";
  wordCount: number;
  charCount: number;
  backlinks: string[];
  totalTodos: number;
  completedTodos: number;
  gitStatus: string;
  toasts: Toast[];
  spatialCards: SpatialCard[];
  spatialEdges: SpatialEdge[];
  docPage: number;
  docTotal: number;

  setActiveTab: (tab: "editor" | "canvas" | "split" | "spatial" | "graph" | "kanban" | "meta") => void;
  setGitStatus: (status: string) => void;

  addToast: (toast: Toast) => void;
  removeToast: (id: number) => void;

  initDocs: () => void;
  selectDocument: (id: string) => void;
  createDocument: (title?: string, parentId?: string | null) => string;
  createFolder: (title?: string, parentId?: string | null) => string;
  renameDocument: (id: string, title: string) => void;
  deleteDocument: (id: string) => void;
  updateCurrentContent: (editorState?: string, canvasData?: any) => void;
  updateContentForDoc: (targetDocId: string, editorState?: string, canvasData?: any) => void;
  togglePinDocument: (id: string) => void;
  toggleArchiveDocument: (id: string) => void;
  addTagToDocument: (id: string, tag: string) => void;
  removeTagFromDocument: (id: string, tag: string) => void;
  setSpatialData: (cards: SpatialCard[], edges: SpatialEdge[]) => void;
  loadNextPage: () => void;
}

function persistAndSet(documents: Record<string, GraphiteDoc>, extra: Partial<NoteStore> = {}) {
  saveDocs(documents);
  return { documents, ...extra };
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  documents: {},
  docId: "",
  editorState: "",
  canvasData: null,
  activeTab: "editor",
  wordCount: 0,
  charCount: 0,
  backlinks: [],
  totalTodos: 0,
  completedTodos: 0,
  gitStatus: "",
  toasts: [],
  spatialCards: [],
  spatialEdges: [],
  docPage: 0,
  docTotal: 0,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setGitStatus: (status) => set({ gitStatus: status }),
  addToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  initDocs: () => {
    let documents = loadDocs();
    const ids = Object.keys(documents);
    if (ids.length === 0) {
      const id = newDocId();
      documents[id] = {
        id,
        title: "Welcome",
        isFolder: false,
        parentId: null,
        updatedAt: Date.now(),
        editorState: "",
        canvasData: null,
      };
      saveDocs(documents);
    }
    const docs = Object.values(documents);
    const mostRecent = docs
      .filter((d) => !d.isFolder)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    const current = mostRecent ?? docs[0];
    set({
      documents,
      docId: current.id,
      editorState: current.editorState,
      canvasData: current.canvasData,
      docPage: 0,
      docTotal: Object.keys(documents).length,
      ...parseStats(current.editorState),
    });

    // Subscribe to Supabase Realtime updates, clean up previous subscription
    if (unsubscribeRealtime) {
      unsubscribeRealtime();
    }
    const syncService = SupabaseSyncService.getInstance();
    unsubscribeRealtime = syncService.subscribeRealtime(
      (updatedId, partialDoc) => {
        const currentDocs = get().documents;
        const existing = currentDocs[updatedId] || {
          id: updatedId,
          title: "Synced Note",
          isFolder: false,
          parentId: null,
          updatedAt: Date.now(),
          editorState: "",
          canvasData: null,
        };
        const updatedDoc = { ...existing, ...partialDoc };
        const nextDocs = { ...currentDocs, [updatedId]: updatedDoc };
        saveDocs(nextDocs);
        if (updatedId === get().docId) {
          set({
            documents: nextDocs,
            editorState: updatedDoc.editorState,
            canvasData: updatedDoc.canvasData,
            ...parseStats(updatedDoc.editorState),
          });
        } else {
          set({ documents: nextDocs });
        }
      },
      (deletedId) => {
        get().deleteDocument(deletedId);
      }
    );
  },

  selectDocument: (id) => {
    const doc = get().documents[id];
    if (!doc) return;
    set({
      docId: id,
      editorState: doc.editorState,
      canvasData: doc.canvasData,
      activeTab: "editor",
      ...parseStats(doc.editorState),
    });
  },

  createDocument: (title, parentId = null) => {
    const id = newDocId();
    const doc: GraphiteDoc = {
      id,
      title: title?.trim() || "Untitled",
      isFolder: false,
      parentId,
      updatedAt: Date.now(),
      editorState: "",
      canvasData: null,
    };
    const documents = { ...get().documents, [id]: doc };
    set(
      persistAndSet(documents, {
        docId: id,
        editorState: "",
        canvasData: null,
        activeTab: "editor",
      })
    );
    SupabaseSyncService.getInstance().syncDocument(id, doc).catch((err) => console.error("[Sync]", err));
    return id;
  },

  createFolder: (title, parentId = null) => {
    const id = newDocId();
    const doc: GraphiteDoc = {
      id,
      title: title?.trim() || "New Folder",
      isFolder: true,
      parentId,
      updatedAt: Date.now(),
      editorState: "",
      canvasData: null,
    };
    const documents = { ...get().documents, [id]: doc };
    set(persistAndSet(documents));
    SupabaseSyncService.getInstance().syncDocument(id, doc).catch((err) => console.error("[Sync]", err));
    return id;
  },

  renameDocument: (id, title) => {
    const documents = { ...get().documents };
    if (!documents[id]) return;
    const updated = { ...documents[id], title: title.trim() || "Untitled", updatedAt: Date.now() };
    documents[id] = updated;
    set(persistAndSet(documents));
    SupabaseSyncService.getInstance().syncDocument(id, updated).catch((err) => console.error("[Sync]", err));
  },

  deleteDocument: (id) => {
    const documents = { ...get().documents };
    if (!documents[id]) return;
    const toDelete = new Set<string>([id]);
    if (documents[id].isFolder) {
      for (const d of Object.values(documents)) {
        const visited = new Set<string>();
        let p = d.parentId;
        while (p && !visited.has(p)) {
          visited.add(p);
          if (toDelete.has(p)) {
            toDelete.add(d.id);
            break;
          }
          p = documents[p]?.parentId ?? null;
        }
      }
    }
    for (const del of toDelete) {
      if (documents[del]) {
        documents[del] = { ...documents[del], isArchived: true, updatedAt: Date.now() };
      }
    }
    set(persistAndSet(documents));

    if (toDelete.has(get().docId)) {
      const remaining = Object.values(documents);
      const next =
        remaining.filter((d) => !d.isFolder).sort((a, b) => b.updatedAt - a.updatedAt)[0] ??
        remaining[0];
      if (next) {
        set({
          documents,
          docId: next.id,
          editorState: next.editorState,
          canvasData: next.canvasData,
          ...parseStats(next.editorState),
        });
      } else {
        set({ documents, docId: "", editorState: "", canvasData: null });
      }
    } else {
      set({ documents });
    }
  },

  updateCurrentContent: (editorState, canvasData) => {
    const { docId, documents } = get();
    if (!docId || !documents[docId]) return;
    const cur = documents[docId];
    const nextEditorState = editorState ?? cur.editorState;
    const nextCanvasData =
      canvasData !== undefined ? canvasData : cur.canvasData;
    const next: GraphiteDoc = {
      ...cur,
      editorState: nextEditorState,
      canvasData: nextCanvasData,
      updatedAt: Date.now(),
    };
    const nextDocs = { ...documents, [docId]: next };
    saveDocs(nextDocs);
    const stats = parseStats(nextEditorState);
    set({
      documents: nextDocs,
      wordCount: stats.wordCount,
      charCount: stats.charCount,
      backlinks: stats.backlinks,
      totalTodos: stats.totalTodos,
      completedTodos: stats.completedTodos,
      canvasData: nextCanvasData,
    });
    createDocCommit(docId, cur.title, nextEditorState, nextCanvasData);
    SupabaseSyncService.getInstance().syncDocument(docId, next).catch((err) => console.error("[Sync] update failed:", err));
  },

  updateContentForDoc: (targetDocId, editorState, canvasData) => {
    const { documents } = get();
    if (!targetDocId || !documents[targetDocId]) return;
    const cur = documents[targetDocId];
    if (cur.editorState?.trim().startsWith("enc:") && editorState && !editorState.trim().startsWith("enc:")) {
      return;
    }
    const nextEditorState = editorState ?? cur.editorState;
    const nextCanvasData = canvasData !== undefined ? canvasData : cur.canvasData;
    const next: GraphiteDoc = {
      ...cur,
      editorState: nextEditorState,
      canvasData: nextCanvasData,
      updatedAt: Date.now(),
    };
    const nextDocs = { ...documents, [targetDocId]: next };
    saveDocs(nextDocs);

    if (targetDocId === get().docId) {
      const stats = parseStats(nextEditorState);
      set({
        documents: nextDocs,
        editorState: nextEditorState,
        canvasData: nextCanvasData,
        ...stats,
      });
    } else {
      set({ documents: nextDocs });
    }

    createDocCommit(targetDocId, next.title, nextEditorState, nextCanvasData);
    SupabaseSyncService.getInstance().syncDocument(targetDocId, next).catch((err) => console.error("[Sync] updateForDoc failed:", err));
  },

  togglePinDocument: (id) => {
    const { documents } = get();
    if (!documents[id]) return;
    const cur = documents[id];
    const updated = { ...cur, isPinned: !cur.isPinned, updatedAt: Date.now() };
    const nextDocs = { ...documents, [id]: updated };
    set(persistAndSet(nextDocs));
    SupabaseSyncService.getInstance().syncDocument(id, updated).catch((err) => console.error("[Sync]", err));
  },

  toggleArchiveDocument: (id) => {
    const { documents } = get();
    if (!documents[id]) return;
    const cur = documents[id];
    const updated = { ...cur, isArchived: !cur.isArchived, updatedAt: Date.now() };
    const nextDocs = { ...documents, [id]: updated };
    set(persistAndSet(nextDocs));
    SupabaseSyncService.getInstance().syncDocument(id, updated).catch((err) => console.error("[Sync] toggleArchive failed:", err));
  },

  addTagToDocument: (id, tag) => {
    const { documents } = get();
    if (!documents[id]) return;
    const cur = documents[id];
    const cleanTag = tag.trim().replace(/^#/, "");
    if (!cleanTag) return;
    const existing = cur.tags || [];
    if (existing.includes(cleanTag)) return;
    const updated = { ...cur, tags: [...existing, cleanTag], updatedAt: Date.now() };
    const nextDocs = { ...documents, [id]: updated };
    set(persistAndSet(nextDocs));
    SupabaseSyncService.getInstance().syncDocument(id, updated).catch((err) => console.error("[Sync] addTag failed:", err));
  },

  removeTagFromDocument: (id, tag) => {
    const { documents } = get();
    if (!documents[id]) return;
    const cur = documents[id];
    const existing = cur.tags || [];
    const updated = { ...cur, tags: existing.filter((t) => t !== tag), updatedAt: Date.now() };
    const nextDocs = { ...documents, [id]: updated };
    set(persistAndSet(nextDocs));
    SupabaseSyncService.getInstance().syncDocument(id, updated).catch((err) => console.error("[Sync] removeTag failed:", err));
  },

  setSpatialData: (cards, edges) => set({ spatialCards: cards, spatialEdges: edges }),

  loadNextPage: () => {
    const { docPage } = get();
    const nextPage = docPage + 1;
    const { docs } = loadDocsPaginated(nextPage);
    if (Object.keys(docs).length === 0) return;
    set({
      docPage: nextPage,
      documents: { ...get().documents, ...docs },
    });
  },
}));
