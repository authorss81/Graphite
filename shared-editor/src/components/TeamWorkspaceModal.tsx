import { useState, useEffect, useRef, useCallback } from "react";
import { X, Users, Plus, Trash2, MessageCircle, CheckCircle, Send, AtSign, Shield, Loader2 } from "lucide-react";
import type { Workspace, WorkspaceRole, Comment } from "../utils/teamWorkspace";
import {
  loadWorkspaces,
  createWorkspace,
  deleteWorkspace,
  addMemberToWorkspace,
  updateMemberRole,
  removeMemberFromWorkspace,
  getDocComments,
  addComment,
  resolveComment,
  deleteComment,
  getInitials,
  randomAvatarColor,
  subscribeToComments,
} from "../utils/teamWorkspace";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentDocId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
}



const ROLE_COLORS: Record<WorkspaceRole, string> = {
  admin: "#f59e0b",
  editor: "#6366f1",
  viewer: "#64748b",
};

export function TeamWorkspaceModal({
  isOpen,
  onClose,
  currentDocId,
  currentUserId,
  currentUserName,
  currentUserEmail,
}: Props) {
  const [tab, setTab] = useState<"workspaces" | "comments">("workspaces");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWs, setSelectedWs] = useState<Workspace | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newWsName, setNewWsName] = useState("");
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("editor");
  const [loading, setLoading] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ws, cmts] = await Promise.all([loadWorkspaces(), getDocComments(currentDocId)]);
    setWorkspaces(ws);
    setComments(cmts);
    setLoading(false);
  }, [currentDocId]);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToComments((cmts) => {
      setComments(cmts.filter((c) => c.docId === currentDocId).sort((a, b) => a.createdAt - b.createdAt));
    });
    return unsub;
  }, [isOpen, currentDocId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  if (!isOpen) return null;

  const refresh = async () => {
    const [ws, cmts] = await Promise.all([loadWorkspaces(), getDocComments(currentDocId)]);
    setWorkspaces(ws);
    setComments(cmts);
  };

  const handleCreateWs = async () => {
    if (!newWsName.trim()) return;
    await createWorkspace(newWsName.trim(), currentUserId, currentUserName, currentUserEmail);
    setNewWsName("");
    await refresh();
  };

  const handleInvite = async () => {
    if (!selectedWs || !inviteEmail.trim()) return;
    const displayName = inviteEmail.split("@")[0];
    await addMemberToWorkspace(selectedWs.id, {
      userId: "user_" + Math.random().toString(36).slice(2, 8),
      displayName,
      email: inviteEmail.trim(),
      avatarColor: randomAvatarColor(),
      role: inviteRole,
    });
    setInviteEmail("");
    await refresh();
    const all = await loadWorkspaces();
    setSelectedWs(all.find((w) => w.id === selectedWs.id) ?? null);
  };

  const handleRoleChange = async (wsId: string, userId: string, role: WorkspaceRole) => {
    await updateMemberRole(wsId, userId, role);
    const all = await loadWorkspaces();
    setWorkspaces(all);
    setSelectedWs(all.find((w) => w.id === wsId) ?? null);
  };

  const handleRemoveMember = async (wsId: string, userId: string) => {
    await removeMemberFromWorkspace(wsId, userId);
    const all = await loadWorkspaces();
    setWorkspaces(all);
    setSelectedWs(all.find((w) => w.id === wsId) ?? null);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment(currentDocId, currentUserId, currentUserName, newComment.trim(), replyTo?.id);
    setNewComment("");
    setReplyTo(null);
    setComments(await getDocComments(currentDocId));
  };

  const handleResolve = async (id: string) => {
    await resolveComment(id);
    setComments(await getDocComments(currentDocId));
  };

  const handleDeleteComment = async (id: string) => {
    await deleteComment(id);
    setComments(await getDocComments(currentDocId));
  };

  const rootComments = comments.filter((c) => !c.parentId);
  const getReplies = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="graphite-modal-card"
        style={{
          width: "min(820px, 98vw)",
          height: "min(680px, 95vh)",
          background: "var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 0",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            gap: "0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Shield size={18} color="#fff" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Team Workspace
                </h2>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
                  Shared docs, permissions & threaded comments
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", borderRadius: "8px", padding: "6px" }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0" }}>
            {(["workspaces", "comments"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: tab === t ? "2px solid var(--accent-color)" : "2px solid transparent",
                  color: tab === t ? "var(--accent-color)" : "var(--text-muted)",
                  fontWeight: tab === t ? 600 : 400,
                  fontSize: "13px",
                  padding: "8px 16px",
                  cursor: "pointer",
                  textTransform: "capitalize",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {t === "workspaces" ? <Users size={14} /> : <MessageCircle size={14} />}
                {t}
                {t === "comments" && comments.filter((c) => !c.resolved).length > 0 && (
                  <span
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      borderRadius: "999px",
                      padding: "0 5px",
                      fontSize: "10px",
                      fontWeight: 700,
                    }}
                  >
                    {comments.filter((c) => !c.resolved).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          {/* ── Workspaces Tab ── */}
          {tab === "workspaces" && (
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Left: workspace list */}
              <div
                style={{
                  width: 220,
                  borderRight: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px",
                  gap: "6px",
                  overflowY: "auto",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                  My Workspaces
                </div>
                {loading && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0", color: "var(--text-muted)" }}>
                    <Loader2 size={16} />
                  </div>
                )}
                {!loading && workspaces.length === 0 && (
                  <div style={{ color: "var(--text-muted)", fontSize: "12px", padding: "8px 0" }}>
                    No workspaces yet.
                  </div>
                )}
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => setSelectedWs(ws)}
                    style={{
                      background: selectedWs?.id === ws.id ? "rgba(99,102,241,0.15)" : "transparent",
                      border: "1px solid",
                      borderColor: selectedWs?.id === ws.id ? "var(--accent-color)" : "transparent",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      textAlign: "left",
                      cursor: "pointer",
                      color: "var(--text-primary)",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>{ws.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{ws.members.length} members</div>
                  </button>
                ))}

                {/* Create workspace */}
                <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                  <input
                    type="text"
                    placeholder="New workspace name..."
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateWs()}
                    style={{
                      width: "100%",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "6px 8px",
                      fontSize: "12px",
                      color: "var(--text-primary)",
                      boxSizing: "border-box",
                      marginBottom: "6px",
                    }}
                  />
                  <button
                    onClick={handleCreateWs}
                    style={{
                      width: "100%",
                      background: "var(--accent-color)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                    }}
                  >
                    <Plus size={14} /> Create
                  </button>
                </div>
              </div>

              {/* Right: members & roles */}
              <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
                {!selectedWs ? (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      gap: "8px",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Users size={40} strokeWidth={1.2} />
                    <p style={{ margin: 0, fontSize: "14px" }}>Select a workspace to manage members</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                          {selectedWs.name}
                        </h3>
                        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-muted)" }}>
                          {selectedWs.members.length} member{selectedWs.members.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <button
                        onClick={async () => { await deleteWorkspace(selectedWs.id); setSelectedWs(null); await refresh(); }}
                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", color: "#ef4444", cursor: "pointer", padding: "6px 10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>

                    {/* Member list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                      {selectedWs.members.map((m) => {
                        return (
                          <div
                            key={m.userId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "10px",
                              background: "var(--bg-secondary)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "8px",
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: m.avatarColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#fff",
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(m.displayName)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{m.displayName}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.email}</div>
                            </div>
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(selectedWs.id, m.userId, e.target.value as WorkspaceRole)}
                              style={{
                                background: "var(--bg-tertiary)",
                                border: "1px solid var(--border-color)",
                                color: ROLE_COLORS[m.role],
                                borderRadius: "6px",
                                padding: "4px 6px",
                                fontSize: "11px",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            {m.userId !== currentUserId && (
                              <button
                                onClick={() => handleRemoveMember(selectedWs.id, m.userId)}
                                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Invite form */}
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "10px",
                        padding: "14px",
                      }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "10px" }}>
                        Invite Member
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="email"
                          placeholder="colleague@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                          style={{
                            flex: 1,
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            padding: "7px 10px",
                            fontSize: "13px",
                            color: "var(--text-primary)",
                          }}
                        />
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                          style={{
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--border-color)",
                            color: "var(--text-primary)",
                            borderRadius: "6px",
                            padding: "7px 8px",
                            fontSize: "12px",
                          }}
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          onClick={handleInvite}
                          style={{
                            background: "var(--accent-color)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "7px 14px",
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: 600,
                          }}
                        >
                          <Plus size={14} /> Invite
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Comments Tab ── */}
          {tab === "comments" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Thread */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {rootComments.length === 0 && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      color: "var(--text-muted)",
                      paddingTop: "60px",
                    }}
                  >
                    <MessageCircle size={40} strokeWidth={1.2} />
                    <p style={{ margin: 0, fontSize: "14px" }}>No comments yet. Start a discussion!</p>
                  </div>
                )}
                {rootComments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    replies={getReplies(comment.id)}
                    currentUserId={currentUserId}
                    onReply={() => setReplyTo(comment)}
                    onResolve={handleResolve}
                    onDelete={handleDeleteComment}
                  />
                ))}
                <div ref={commentsEndRef} />
              </div>

              {/* Composer */}
              <div
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid var(--border-color)",
                  background: "var(--bg-secondary)",
                }}
              >
                {replyTo && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 10px",
                      background: "rgba(99,102,241,0.1)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      borderRadius: "6px",
                      marginBottom: "8px",
                      fontSize: "11px",
                      color: "var(--accent-color)",
                    }}
                  >
                    Replying to @{replyTo.authorName}
                    <button onClick={() => setReplyTo(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--accent-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(currentUserName)}
                  </div>
                  <textarea
                    rows={2}
                    placeholder={`Add a comment... use @name to mention`}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    style={{
                      flex: 1,
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      color: "var(--text-primary)",
                      resize: "none",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleAddComment}
                    style={{
                      background: "var(--accent-color)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <Send size={14} />
                  </button>
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px", paddingLeft: "36px" }}>
                  <AtSign size={10} style={{ verticalAlign: "middle" }} /> mention teammates · Enter to send · Shift+Enter for newline
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comment Thread Sub-component ────────────────────────────────────────────

function CommentThread({
  comment,
  replies,
  currentUserId,
  onReply,
  onResolve,
  onDelete,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId: string;
  onReply: () => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
    if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
    return new Date(ts).toLocaleDateString();
  };

  const renderContent = (text: string) =>
    text.split(/(@[\w.\-]+)/g).map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} style={{ color: "var(--accent-color)", fontWeight: 600 }}>
          {part}
        </span>
      ) : (
        part
      )
    );

  const CommentCard = ({ c, isReply }: { c: Comment; isReply?: boolean }) => (
    <div
      style={{
        display: "flex",
        gap: "10px",
        opacity: c.resolved ? 0.5 : 1,
        paddingLeft: isReply ? "36px" : 0,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: c.authorColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
        }}
      >
        {getInitials(c.authorName)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{c.authorName}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatTime(c.createdAt)}</span>
          {c.resolved && (
            <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "2px" }}>
              <CheckCircle size={10} /> Resolved
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            lineHeight: "1.5",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "8px 12px",
          }}
        >
          {renderContent(c.content)}
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
          {!isReply && !c.resolved && (
            <button
              onClick={onReply}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
            >
              <MessageCircle size={11} /> Reply
            </button>
          )}
          {!c.resolved && (
            <button
              onClick={() => onResolve(c.id)}
              style={{ background: "transparent", border: "none", color: "#10b981", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
            >
              <CheckCircle size={11} /> Resolve
            </button>
          )}
          {c.authorId === currentUserId && (
            <button
              onClick={() => onDelete(c.id)}
              style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
            >
              <Trash2 size={11} /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <CommentCard c={comment} />
      {replies.map((r) => (
        <div key={r.id} style={{ marginTop: "8px" }}>
          <CommentCard c={r} isReply />
        </div>
      ))}
    </div>
  );
}
