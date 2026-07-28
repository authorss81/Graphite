/**
 * Graphite Team Workspace — shared docs, permissions & threaded comments.
 * NOTE: Workspace data and comment content are stored in IndexedDB in plaintext.
 * This data is NOT E2E encrypted. Do not store sensitive information in
 * workspace names, member displays, or comment content.
 */
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
const commentsChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("graphite-comments") : null;

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

const MAX_NAME_LENGTH = 200;
const MAX_CONTENT_LENGTH = 10000;
const MAX_COMMENTS_PER_DOC = 1000;
const COMMENT_COOLDOWN_MS = 1000;
let lastCommentTime = 0;

function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem("graphite_current_user");
    if (raw) {
      const user = JSON.parse(raw);
      return user.id || "";
    }
  } catch {}
  return "";
}

async function getWorkspace(wsId: string): Promise<Workspace | null> {
  const all = await loadWorkspaces();
  return all.find((w) => w.id === wsId) || null;
}

async function requireAdmin(wsId: string, userId: string): Promise<void> {
  const ws = await getWorkspace(wsId);
  if (!ws) throw new Error("Workspace not found");
  const member = ws.members.find((m) => m.userId === userId);
  if (!member || member.role !== "admin") {
    throw new Error("Unauthorized: admin role required");
  }
}

async function requireOwnerOrAdmin(wsId: string, userId: string): Promise<void> {
  const ws = await getWorkspace(wsId);
  if (!ws) throw new Error("Workspace not found");
  if (ws.ownerId === userId) return;
  const member = ws.members.find((m) => m.userId === userId);
  if (!member || member.role !== "admin") {
    throw new Error("Unauthorized: owner or admin role required");
  }
}

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
  for (const ws of workspaces) {
    await tx.store.put(ws);
  }
  await tx.done;
}

export async function createWorkspace(name: string, ownerId: string, ownerName: string, ownerEmail: string): Promise<Workspace> {
  const cleanName = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!cleanName) throw new Error("Workspace name is required");
  const ws: Workspace = {
    id: "ws_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    name,
    description: "",
    createdAt: Date.now(),
    ownerId,
    members: [
      { userId: ownerId, displayName: ownerName, email: ownerEmail, avatarColor: randomAvatarColor(), role: "admin", joinedAt: Date.now() },
    ],
    docIds: [],
  };
  const db = await getDB();
  await db.put("workspaces", ws);
  return ws;
}

export async function updateWorkspace(id: string, patch: Partial<Workspace>, userId?: string): Promise<void> {
  const uid = userId || getCurrentUserId();
  await requireAdmin(id, uid);
  const db = await getDB();
  const ws = await db.get("workspaces", id);
  if (ws) {
    await db.put("workspaces", { ...ws, ...patch });
  }
}

export async function deleteWorkspace(id: string, userId?: string): Promise<void> {
  const uid = userId || getCurrentUserId();
  await requireOwnerOrAdmin(id, uid);
  const db = await getDB();
  await db.delete("workspaces", id);
}

export async function addMemberToWorkspace(wsId: string, member: Omit<WorkspaceMember, "joinedAt">, userId?: string): Promise<void> {
  const uid = userId || getCurrentUserId();
  await requireAdmin(wsId, uid);
  const cleanEmail = member.email.trim().slice(0, 254);
  if (!validateEmail(cleanEmail)) throw new Error("Invalid email address");
  const cleanDisplayName = member.displayName.trim().slice(0, MAX_NAME_LENGTH);
  if (!cleanDisplayName) throw new Error("Display name is required");
  const db = await getDB();
  const ws = await db.get("workspaces", wsId);
  if (ws && !ws.members.some((m: any) => m.userId === member.userId)) {
    ws.members.push({ ...member, email: cleanEmail, displayName: cleanDisplayName, joinedAt: Date.now() });
    await db.put("workspaces", ws);
  }
}

export async function updateMemberRole(wsId: string, targetUserId: string, role: WorkspaceRole, userId?: string): Promise<void> {
  const uid = userId || getCurrentUserId();
  await requireAdmin(wsId, uid);
  const db = await getDB();
  const ws = await db.get("workspaces", wsId);
  if (ws) {
    const idx = ws.members.findIndex((m: any) => m.userId === targetUserId);
    if (idx !== -1) {
      ws.members[idx].role = role;
      await db.put("workspaces", ws);
    }
  }
}

export async function removeMemberFromWorkspace(wsId: string, targetUserId: string, userId?: string): Promise<void> {
  const uid = userId || getCurrentUserId();
  await requireAdmin(wsId, uid);
  const db = await getDB();
  const ws = await db.get("workspaces", wsId);
  if (ws) {
    ws.members = ws.members.filter((m: any) => m.userId !== targetUserId);
    await db.put("workspaces", ws);
  }
}

export async function loadComments(): Promise<Comment[]> {
  await migrateToIDB();
  const db = await getDB();
  return (await db.getAll("comments")) || [];
}

export async function saveComments(comments: Comment[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("comments", "readwrite");
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
  const now = Date.now();
  if (now - lastCommentTime < COMMENT_COOLDOWN_MS) throw new Error("Please wait before commenting again");
  lastCommentTime = now;
  const cleanContent = content.trim().slice(0, MAX_CONTENT_LENGTH);
  if (!cleanContent) throw new Error("Comment content is required");
  // Check comment cap per doc
  const existing = await getDocComments(docId);
  if (existing.length >= MAX_COMMENTS_PER_DOC) throw new Error("Maximum comments per document reached");
  const mentions = parseMentions(cleanContent);
  const comment: Comment = {
    id: "cmt_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    docId,
    blockId,
    authorId,
    authorName: authorName.trim().slice(0, 100),
    authorColor: randomAvatarColor(),
    content: cleanContent,
    mentions,
    createdAt: Date.now(),
    parentId,
    resolved: false,
  };
  const db = await getDB();
  await db.put("comments", comment);
  return comment;
}

export async function resolveComment(id: string): Promise<void> {
  const db = await getDB();
  const c = await db.get("comments", id);
  if (c) {
    c.resolved = true;
    await db.put("comments", c);
  }
}

export async function deleteComment(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("comments", id);
}

export function subscribeToComments(callback: (comments: Comment[]) => void): () => void {
  const handler = async () => {
    const comments = await loadComments();
    callback(comments);
  };
  commentsChannel?.addEventListener("message", handler);
  return () => {
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
