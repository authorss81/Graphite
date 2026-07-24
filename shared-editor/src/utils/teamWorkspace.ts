import { openDB, type IDBPDatabase } from "idb";

export type WorkspaceRole = "admin" | "editor" | "viewer";

export interface WorkspaceMember {
  userId: string;
  displayName: string;
  email: string;
  avatarColor: string;
  role: WorkspaceRole;
  joinedAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  ownerId: string;
  members: WorkspaceMember[];
  docIds: string[];
}

export interface CommentMention {
  userId: string;
  displayName: string;
}

export interface Comment {
  id: string;
  docId: string;
  blockId?: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  content: string;
  mentions: CommentMention[];
  createdAt: number;
  updatedAt?: number;
  parentId?: string;
  resolved?: boolean;
}

let dbPromise: Promise<IDBPDatabase> | null = null;
let commentsListener: ((comments: Comment[]) => void) | null = null;
const commentsChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("graphite-comments") : null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB("graphite_team", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("workspaces")) {
          db.createObjectStore("workspaces", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("comments")) {
          const store = db.createObjectStore("comments", { keyPath: "id" });
          store.createIndex("docId", "docId");
        }
      },
    });
  }
  return dbPromise;
}

const WS_KEY = "graphite_workspaces_v1";
const COMMENTS_KEY = "graphite_comments_v1";

async function migrateToIDB(): Promise<void> {
  const db = await getDB();
  try {
    if (!(await db.count("workspaces"))) {
      const raw = localStorage.getItem(WS_KEY);
      if (raw) {
        const workspaces: Workspace[] = JSON.parse(raw);
        for (const ws of workspaces) {
          await db.put("workspaces", ws);
        }
      }
    }
    if (!(await db.count("comments"))) {
      const raw = localStorage.getItem(COMMENTS_KEY);
      if (raw) {
        const comments: Comment[] = JSON.parse(raw);
        for (const c of comments) {
          await db.put("comments", c);
        }
      }
    }
  } catch {}
  localStorage.removeItem(WS_KEY);
  localStorage.removeItem(COMMENTS_KEY);
}

export async function loadWorkspaces(): Promise<Workspace[]> {
  await migrateToIDB();
  const db = await getDB();
  return (await db.getAll("workspaces")) || [];
}

export async function saveWorkspaces(workspaces: Workspace[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("workspaces", "readwrite");
  await tx.store.clear();
  for (const ws of workspaces) {
    await tx.store.put(ws);
  }
  await tx.done;
}

export async function createWorkspace(name: string, ownerId: string, ownerName: string, ownerEmail: string): Promise<Workspace> {
  const ws: Workspace = {
    id: "ws_" + crypto.randomUUID().slice(0, 8),
    name,
    description: "",
    createdAt: Date.now(),
    ownerId,
    members: [
      { userId: ownerId, displayName: ownerName, email: ownerEmail, avatarColor: randomAvatarColor(), role: "admin", joinedAt: Date.now() },
    ],
    docIds: [],
  };
  const all = await loadWorkspaces();
  await saveWorkspaces([...all, ws]);
  return ws;
}

export async function updateWorkspace(id: string, patch: Partial<Workspace>): Promise<void> {
  const all = await loadWorkspaces();
  await saveWorkspaces(all.map((w) => (w.id === id ? { ...w, ...patch } : w)));
}

export async function deleteWorkspace(id: string): Promise<void> {
  await saveWorkspaces((await loadWorkspaces()).filter((w) => w.id !== id));
}

export async function addMemberToWorkspace(wsId: string, member: Omit<WorkspaceMember, "joinedAt">): Promise<void> {
  const all = await loadWorkspaces();
  await saveWorkspaces(
    all.map((w) => {
      if (w.id !== wsId) return w;
      if (w.members.some((m) => m.userId === member.userId)) return w;
      return { ...w, members: [...w.members, { ...member, joinedAt: Date.now() }] };
    })
  );
}

export async function updateMemberRole(wsId: string, userId: string, role: WorkspaceRole): Promise<void> {
  const all = await loadWorkspaces();
  await saveWorkspaces(
    all.map((w) => (w.id !== wsId ? w : { ...w, members: w.members.map((m) => (m.userId === userId ? { ...m, role } : m)) }))
  );
}

export async function removeMemberFromWorkspace(wsId: string, userId: string): Promise<void> {
  const all = await loadWorkspaces();
  await saveWorkspaces(
    all.map((w) => (w.id !== wsId ? w : { ...w, members: w.members.filter((m) => m.userId !== userId) }))
  );
}

export async function loadComments(): Promise<Comment[]> {
  await migrateToIDB();
  const db = await getDB();
  return (await db.getAll("comments")) || [];
}

export async function saveComments(comments: Comment[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("comments", "readwrite");
  await tx.store.clear();
  for (const c of comments) {
    await tx.store.put(c);
  }
  await tx.done;
  commentsChannel?.postMessage({ type: "comments-updated" });
}

export async function getDocComments(docId: string): Promise<Comment[]> {
  const all = await loadComments();
  return all.filter((c) => c.docId === docId).sort((a, b) => a.createdAt - b.createdAt);
}

export async function addComment(docId: string, authorId: string, authorName: string, content: string, parentId?: string, blockId?: string): Promise<Comment> {
  const mentions = parseMentions(content);
  const comment: Comment = {
    id: "cmt_" + crypto.randomUUID().slice(0, 8),
    docId,
    blockId,
    authorId,
    authorName,
    authorColor: randomAvatarColor(),
    content,
    mentions,
    createdAt: Date.now(),
    parentId,
    resolved: false,
  };
  await saveComments([...(await loadComments()), comment]);
  return comment;
}

export async function resolveComment(id: string): Promise<void> {
  const all = await loadComments();
  await saveComments(all.map((c) => (c.id === id ? { ...c, resolved: true } : c)));
}

export async function deleteComment(id: string): Promise<void> {
  await saveComments((await loadComments()).filter((c) => c.id !== id));
}

export function subscribeToComments(callback: (comments: Comment[]) => void): () => void {
  commentsListener = callback;
  const handler = async () => {
    const comments = await loadComments();
    callback(comments);
  };
  commentsChannel?.addEventListener("message", handler);
  return () => {
    commentsListener = null;
    commentsChannel?.removeEventListener("message", handler);
  };
}

function parseMentions(text: string): CommentMention[] {
  const regex = /@([\w.\-]+)/g;
  const mentions: CommentMention[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    mentions.push({ userId: match[1], displayName: match[1] });
  }
  return mentions;
}

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

export function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
