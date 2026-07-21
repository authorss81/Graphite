import { create } from "zustand";
import type { GraphiteDoc } from "../utils/docStorage";
import { newDocId, loadDocs, saveDocs } from "../utils/docStorage";

function parseStats(editorState: string): {
  wordCount: number;
  charCount: number;
  backlinks: string[];
} {
  if (!editorState) return { wordCount: 0, charCount: 0, backlinks: [] };
  try {
    const parsed = JSON.parse(editorState);
    let text = "";
    const traverse = (node: any) => {
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
    };
  } catch {
    return { wordCount: 0, charCount: 0, backlinks: [] };
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
  activeTab: "editor" | "canvas" | "meta";
  wordCount: number;
  charCount: number;
  backlinks: string[];
  gitStatus: string;
  toasts: Toast[];

  setActiveTab: (tab: "editor" | "canvas" | "meta") => void;
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
  gitStatus: "",
  toasts: [],

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
      ...parseStats(current.editorState),
    });
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
    return id;
  },

  renameDocument: (id, title) => {
    const documents = { ...get().documents };
    if (!documents[id]) return;
    documents[id] = { ...documents[id], title: title.trim() || "Untitled" };
    set(persistAndSet(documents));
  },

  deleteDocument: (id) => {
    const documents = { ...get().documents };
    if (!documents[id]) return;
    const toDelete = new Set<string>([id]);
    if (documents[id].isFolder) {
      for (const d of Object.values(documents)) {
        let p = d.parentId;
        while (p) {
          if (toDelete.has(p)) {
            toDelete.add(d.id);
            break;
          }
          p = documents[p]?.parentId ?? null;
        }
      }
    }
    for (const del of toDelete) delete documents[del];
    saveDocs(documents);

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
      canvasData: nextCanvasData,
    });
  },
}));
