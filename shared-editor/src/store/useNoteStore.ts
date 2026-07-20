import { create } from "zustand";

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

interface NoteStore {
  docId: string;
  editorState: string;
  canvasData: any;
  activeTab: "editor" | "canvas" | "meta";
  wordCount: number;
  charCount: number;
  backlinks: string[];
  gitStatus: string;

  setDocId: (id: string) => void;
  setEditorState: (state: string) => void;
  setCanvasData: (data: any) => void;
  setActiveTab: (tab: "editor" | "canvas" | "meta") => void;
  setGitStatus: (status: string) => void;
}

export const useNoteStore = create<NoteStore>((set) => ({
  docId: "default-doc",
  editorState: "",
  canvasData: null,
  activeTab: "editor",
  wordCount: 0,
  charCount: 0,
  backlinks: [],
  gitStatus: "Idle",

  setDocId: (id: string) => set({ docId: id }),

  setEditorState: (state: string) =>
    set({ editorState: state, ...parseStats(state) }),

  setCanvasData: (data: any) => set({ canvasData: data }),

  setActiveTab: (tab: "editor" | "canvas" | "meta") => set({ activeTab: tab }),

  setGitStatus: (status: string) => set({ gitStatus: status }),
}));
