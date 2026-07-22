// ─── Workspace Types ─────────────────────────────────────────────────────────

export type WorkspaceRole = "admin" | "editor" | "viewer";

export interface WorkspaceMember {
  userId: string;
  displayName: string;
  email: string;
  avatarColor: string; // hex color for avatar placeholder
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
  docIds: string[]; // documents belonging to this workspace
}

// ─── Comment Types ───────────────────────────────────────────────────────────

export interface CommentMention {
  userId: string;
  displayName: string;
}

export interface Comment {
  id: string;
  docId: string;
  blockId?: string; // optional block anchor
  authorId: string;
  authorName: string;
  authorColor: string;
  content: string; // supports @mentions as plain text @displayName
  mentions: CommentMention[];
  createdAt: number;
  updatedAt?: number;
  parentId?: string; // threading — reply to another comment
  resolved?: boolean;
}

// ─── Storage Keys ────────────────────────────────────────────────────────────

const WS_KEY = "graphite_workspaces_v1";
const COMMENTS_KEY = "graphite_comments_v1";

// ─── Workspace CRUD ──────────────────────────────────────────────────────────

export function loadWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(WS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWorkspaces(workspaces: Workspace[]): void {
  try {
    localStorage.setItem(WS_KEY, JSON.stringify(workspaces));
  } catch {
    // silently ignore on quota edge cases
  }
}

export function createWorkspace(name: string, ownerId: string, ownerName: string, ownerEmail: string): Workspace {
  const ws: Workspace = {
    id: "ws_" + Math.random().toString(36).slice(2, 10),
    name,
    description: "",
    createdAt: Date.now(),
    ownerId,
    members: [
      {
        userId: ownerId,
        displayName: ownerName,
        email: ownerEmail,
        avatarColor: randomAvatarColor(),
        role: "admin",
        joinedAt: Date.now(),
      },
    ],
    docIds: [],
  };
  const all = loadWorkspaces();
  saveWorkspaces([...all, ws]);
  return ws;
}

export function updateWorkspace(id: string, patch: Partial<Workspace>): void {
  const all = loadWorkspaces();
  saveWorkspaces(all.map((w) => (w.id === id ? { ...w, ...patch } : w)));
}

export function deleteWorkspace(id: string): void {
  saveWorkspaces(loadWorkspaces().filter((w) => w.id !== id));
}

export function addMemberToWorkspace(
  wsId: string,
  member: Omit<WorkspaceMember, "joinedAt">
): void {
  const all = loadWorkspaces();
  saveWorkspaces(
    all.map((w) => {
      if (w.id !== wsId) return w;
      const exists = w.members.some((m) => m.userId === member.userId);
      if (exists) return w;
      return { ...w, members: [...w.members, { ...member, joinedAt: Date.now() }] };
    })
  );
}

export function updateMemberRole(wsId: string, userId: string, role: WorkspaceRole): void {
  const all = loadWorkspaces();
  saveWorkspaces(
    all.map((w) => {
      if (w.id !== wsId) return w;
      return { ...w, members: w.members.map((m) => (m.userId === userId ? { ...m, role } : m)) };
    })
  );
}

export function removeMemberFromWorkspace(wsId: string, userId: string): void {
  const all = loadWorkspaces();
  saveWorkspaces(
    all.map((w) => {
      if (w.id !== wsId) return w;
      return { ...w, members: w.members.filter((m) => m.userId !== userId) };
    })
  );
}

// ─── Comments CRUD ───────────────────────────────────────────────────────────

export function loadComments(): Comment[] {
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveComments(comments: Comment[]): void {
  try {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  } catch {
    // silently ignore quota edge cases
  }
}

export function getDocComments(docId: string): Comment[] {
  return loadComments()
    .filter((c) => c.docId === docId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function addComment(
  docId: string,
  authorId: string,
  authorName: string,
  content: string,
  parentId?: string,
  blockId?: string
): Comment {
  const mentions = parseMentions(content);
  const comment: Comment = {
    id: "cmt_" + Math.random().toString(36).slice(2, 10),
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
  saveComments([...loadComments(), comment]);
  return comment;
}

export function resolveComment(id: string): void {
  saveComments(loadComments().map((c) => (c.id === id ? { ...c, resolved: true } : c)));
}

export function deleteComment(id: string): void {
  saveComments(loadComments().filter((c) => c.id !== id));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseMentions(text: string): CommentMention[] {
  const regex = /@([\w.\-]+)/g;
  const mentions: CommentMention[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    mentions.push({ userId: match[1], displayName: match[1] });
  }
  return mentions;
}

const AVATAR_COLORS = [
  "#6366f1", "#ec4899", "#10b981", "#f59e0b",
  "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6",
];

export function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
