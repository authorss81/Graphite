import git from "isomorphic-git";
import FS from "@isomorphic-git/lightning-fs";
import { sendUpdateToNative } from "./bridge";

export interface DocCommit {
  commitId: string; // Real Git SHA-1 commit hash
  docId: string;
  docTitle: string;
  timestamp: number;
  message: string;
  editorState: string;
  canvasData: any;
}

const HISTORY_KEY = "graphite_doc_history_v1";
const GIT_DIR = "/graphite_vault";

// Virtual Git Filesystem lazy-initialized in browser environment
let fsInstance: any = null;
let isGitInitialized = false;

function getGitFS() {
  if (fsInstance) return fsInstance;
  if (typeof window !== "undefined" && typeof indexedDB !== "undefined") {
    try {
      fsInstance = new FS("graphite_git_v1");
    } catch {
      fsInstance = null;
    }
  }
  return fsInstance;
}

async function ensureGitRepo() {
  const fs = getGitFS();
  if (!fs || isGitInitialized) return;
  try {
    await fs.promises.mkdir(GIT_DIR);
  } catch {
    // dir already exists
  }
  try {
    await git.init({ fs, dir: GIT_DIR, defaultBranch: "main" });
  } catch {
    // repo already initialized
  }
  isGitInitialized = true;
}

function loadHistoryMap(): Record<string, DocCommit[]> {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveHistoryMap(map: Record<string, DocCommit[]>) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(map));
  } catch {
    // fallback
  }
}

export function extractHumanText(editorStateJSON: string): string {
  if (!editorStateJSON) return "";
  let raw = editorStateJSON.trim();

  if (!raw.startsWith("{") && !raw.startsWith("[")) {
    try {
      const decoded = atob(raw);
      if (decoded.startsWith("{") || decoded.startsWith("[")) {
        raw = decoded.trim();
      }
    } catch {
      // not base64
    }
  }

  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      const lines: string[] = [];

      const traverse = (node: any): string => {
        if (!node) return "";
        if (typeof node === "string") return node;
        if (node.text !== undefined) return node.text;

        let text = "";
        if (Array.isArray(node.children)) {
          text = node.children.map(traverse).join("");
        }

        if (node.type === "paragraph") {
          if (text.trim()) lines.push(text);
        } else if (node.type === "heading") {
          const prefix = node.tag === "h1" ? "# " : node.tag === "h2" ? "## " : "### ";
          lines.push(prefix + text);
        } else if (node.type === "quote") {
          lines.push("> " + text);
        } else if (node.type === "listitem") {
          const check = node.checked ? "[x] " : typeof node.checked === "boolean" ? "[ ] " : "• ";
          lines.push(check + text);
        } else if (node.type === "code") {
          lines.push("```\n" + text + "\n```");
        }
        return text;
      };

      if (parsed.root) {
        traverse(parsed.root);
        if (lines.length > 0) return lines.join("\n");
      }
    } catch {
      // fallback
    }
  }

  return raw
    .replace(/"(root|children|detail|format|mode|style|type|version|direction|indent|textFormat|textStyle|tag|checked)":\s*("[^"]*"|\d+|true|false|null)/gi, "")
    .replace(/[{}[\]"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 30) return "Just now";
  if (diffSec < 60) return `${diffSec} sec ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  
  const d = new Date(timestamp);
  const isYesterday = new Date(Date.now() - 86400000).toDateString() === d.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isYesterday) return `Yesterday at ${timeStr}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
}

export function generateHumanCommitMessage(docTitle: string, oldText: string, newText: string, canvasData: any): string {
  const title = docTitle?.trim() || "Untitled Note";
  const oldClean = extractHumanText(oldText);
  const newClean = extractHumanText(newText);

  if (!oldClean && newClean) return `Created "${title}"`;

  const oldWords = oldClean.trim().split(/\s+/).filter(Boolean).length;
  const newWords = newClean.trim().split(/\s+/).filter(Boolean).length;
  const wordDiff = newWords - oldWords;

  if (canvasData?.elements?.length > 0) {
    return `Updated drawing in "${title}"`;
  }
  if (wordDiff > 0) return `Added +${wordDiff} words to "${title}"`;
  if (wordDiff < 0) return `Removed ${Math.abs(wordDiff)} words from "${title}"`;

  return `Edited "${title}"`;
}

export async function createDocCommit(docId: string, docTitle: string, editorState: string, canvasData: any, message?: string): Promise<DocCommit> {
  const map = loadHistoryMap();
  const list = map[docId] || [];
  const prevCommit = list[0];

  const autoMessage = message || generateHumanCommitMessage(docTitle, prevCommit?.editorState || "", editorState, canvasData);

  let realCommitHash = "";
  try {
    const fs = getGitFS();
    if (fs) {
      await ensureGitRepo();
      const filePath = `${docId}.md`;
      const noteText = extractHumanText(editorState);
      await fs.promises.writeFile(`${GIT_DIR}/${filePath}`, noteText || editorState);
      await git.add({ fs, dir: GIT_DIR, filepath: filePath });
      realCommitHash = await git.commit({
        fs,
        dir: GIT_DIR,
        message: autoMessage,
        author: {
          name: "Graphite User",
          email: "user@graphite.local",
        },
      });
    } else {
      realCommitHash = "git_" + crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    }
  } catch {
    realCommitHash = "git_" + crypto.randomUUID().replace(/-/g, "").substring(0, 16);
  }

  const commit: DocCommit = {
    commitId: realCommitHash,
    docId,
    docTitle: docTitle || "Untitled",
    timestamp: Date.now(),
    message: autoMessage,
    editorState,
    canvasData,
  };

  if (prevCommit && prevCommit.editorState === editorState && JSON.stringify(prevCommit.canvasData) === JSON.stringify(canvasData)) {
    return prevCommit;
  }

  map[docId] = [commit, ...list].slice(0, 50);
  saveHistoryMap(map);

  sendUpdateToNative(docId, realCommitHash);
  return commit;
}

export function getDocCommits(docId: string): DocCommit[] {
  const map = loadHistoryMap();
  return map[docId] || [];
}

export function computeTextDiff(oldText: string, newText: string): { type: "add" | "del" | "same"; text: string }[] {
  const oldLines = extractHumanText(oldText).split("\n").filter((l) => l.trim() !== "");
  const newLines = extractHumanText(newText).split("\n").filter((l) => l.trim() !== "");
  const diffs: { type: "add" | "del" | "same"; text: string }[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n) {
      if (o !== undefined) diffs.push({ type: "same", text: o });
    } else {
      if (o !== undefined) diffs.push({ type: "del", text: o });
      if (n !== undefined) diffs.push({ type: "add", text: n });
    }
  }

  return diffs;
}
