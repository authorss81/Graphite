import { useState, useMemo, useRef } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { useAuthStore } from "../store/useAuthStore";
import { toast } from "./Toast";
import type { GraphiteDoc } from "../utils/docStorage";
import {
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  Trash2,
  Pencil,
  ChevronRight,
  ChevronDown,
  LogOut,
  Pin,
  Archive,
  Tag,
  X,
} from "lucide-react";

interface TreeNode {
  doc: GraphiteDoc;
  children: TreeNode[];
  depth: number;
}

function buildTree(documents: Record<string, GraphiteDoc>, filterTag: string | null, showArchived: boolean): TreeNode[] {
  const activeDocs = Object.values(documents).filter((d) => {
    if (showArchived) return d.isArchived;
    if (d.isArchived) return false;
    if (filterTag && !d.isFolder) {
      return d.tags?.includes(filterTag);
    }
    return true;
  });

  const nodes = new Map<string, TreeNode>();
  for (const doc of activeDocs) {
    nodes.set(doc.id, { doc, children: [], depth: 0 });
  }

  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    const parentId = node.doc.parentId;
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRec = (list: TreeNode[]) => {
    list.sort((a, b) => {
      if (a.doc.isFolder !== b.doc.isFolder) return a.doc.isFolder ? -1 : 1;
      return a.doc.title.localeCompare(b.doc.title);
    });
    list.forEach((n) => {
      n.depth = (nodes.get(n.doc.parentId ?? "")?.depth ?? -1) + 1;
      sortRec(n.children);
    });
  };
  sortRec(roots);
  return roots;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const documents = useNoteStore((s) => s.documents);
  const docId = useNoteStore((s) => s.docId);
  const selectDocument = useNoteStore((s) => s.selectDocument);
  const createDocument = useNoteStore((s) => s.createDocument);
  const createFolder = useNoteStore((s) => s.createFolder);
  const renameDocument = useNoteStore((s) => s.renameDocument);
  const deleteDocument = useNoteStore((s) => s.deleteDocument);
  const docPage = useNoteStore((s) => s.docPage);
  const docTotal = useNoteStore((s) => s.docTotal);
  const loadNextPage = useNoteStore((s) => s.loadNextPage);
  const logout = useAuthStore((s) => s.logout);

  const handleSelect = (id: string) => {
    selectDocument(id);
    if (onClose) onClose();
  };

  const handleCreateDocument = (title?: string, parentId?: string | null) => {
    createDocument(title, parentId);
    if (onClose) onClose();
  };

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pinnedCollapsed, setPinnedCollapsed] = useState(
    () => localStorage.getItem("graphite_sidebar_pinned_collapsed") === "true"
  );
  const [docsCollapsed, setDocsCollapsed] = useState(
    () => localStorage.getItem("graphite_sidebar_docs_collapsed") === "true"
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const tree = buildTree(documents, activeTagFilter, showArchived);

  const pinnedNotes = useMemo(() => {
    return Object.values(documents).filter((d) => !d.isFolder && d.isPinned && !d.isArchived);
  }, [documents]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    Object.values(documents).forEach((d) => {
      if (!d.isArchived && d.tags) {
        d.tags.forEach((t) => map.set(t, (map.get(t) || 0) + 1));
      }
    });
    return Array.from(map.entries());
  }, [documents]);

  const parentForNew = () => {
    const current = documents[docId];
    if (current?.isFolder) return current.id;
    return null;
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startRename = (doc: GraphiteDoc) => {
    setRenamingId(doc.id);
    setRenameValue(doc.title);
  };

  const commitRename = () => {
    if (renamingId) renameDocument(renamingId, renameValue);
    setRenamingId(null);
  };

  const handleLogout = async () => {
    await logout();
    toast("Signed out", "info");
  };

  // Drawer Swipe & Pull-to-refresh hooks
  const asideRef = useRef<HTMLElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwipeClosing = useRef(false);
  const isPullingDown = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Row swipe-to-delete hooks
  const [swipedDocId, setSwipedDocId] = useState<string | null>(null);
  const [rowSwipeOffset, setRowSwipeOffset] = useState(0);
  const rowSwipeStartX = useRef(0);
  const isDraggingRow = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const el = asideRef.current;
    if (!el || isRefreshing) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwipeClosing.current = false;
    isPullingDown.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const el = asideRef.current;
    if (!el || isRefreshing) return;

    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    // Detect direction
    if (!isSwipeClosing.current && !isPullingDown.current) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0 && window.innerWidth <= 900) {
          isSwipeClosing.current = true;
        }
      } else if (el.scrollTop === 0 && diffY > 0) {
        isPullingDown.current = true;
      }
    }

    if (isSwipeClosing.current) {
      setSwipeOffset(Math.min(0, diffX));
    } else if (isPullingDown.current) {
      const resistanceDiff = Math.pow(diffY, 0.8);
      setPullDistance(Math.min(resistanceDiff, 80));
    }
  };

  const handleTouchEnd = () => {
    if (isSwipeClosing.current) {
      if (swipeOffset < -80) {
        if (onClose) onClose();
      }
      setSwipeOffset(0);
    } else if (isPullingDown.current) {
      if (pullDistance > 45) {
        setIsRefreshing(true);
        setPullDistance(50);
        toast("Syncing with Supabase...", "info");
        useNoteStore.getState().fetchAndMergeDocs()
          .then(() => {
            setIsRefreshing(false);
            setPullDistance(0);
            toast("Sync complete!", "success");
          })
          .catch((err) => {
            setIsRefreshing(false);
            setPullDistance(0);
            toast("Sync failed: " + (err instanceof Error ? err.message : String(err)), "error");
          });
      } else {
        setPullDistance(0);
      }
    }
    isSwipeClosing.current = false;
    isPullingDown.current = false;
  };

  const renderNode = (node: TreeNode) => {
    const { doc, children, depth } = node;
    const isExpanded = expanded.has(doc.id);
    const isSelected = doc.id === docId && !doc.isFolder;
    const isRenaming = renamingId === doc.id;
    const translateX = swipedDocId === doc.id ? rowSwipeOffset : 0;

    return (
      <div key={doc.id}>
        <div
          className={`sidebar-row${isSelected ? " selected" : ""}${translateX !== 0 ? " swiping" : ""}`}
          role="treeitem"
          aria-selected={isSelected}
          style={{
            paddingLeft: 8 + depth * 16,
            transform: translateX ? `translateX(${translateX}px)` : undefined,
            transition: isDraggingRow.current ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            touchAction: "pan-y",
            position: "relative",
          }}
          onTouchStart={(e) => {
            if (swipedDocId && swipedDocId !== doc.id) {
              setSwipedDocId(null);
              setRowSwipeOffset(0);
            }
            rowSwipeStartX.current = e.touches[0].clientX;
            isDraggingRow.current = true;
          }}
          onTouchMove={(e) => {
            if (!isDraggingRow.current) return;
            const diffX = e.touches[0].clientX - rowSwipeStartX.current;
            if (diffX < 0) {
              setSwipedDocId(doc.id);
              setRowSwipeOffset(Math.max(diffX, -80));
            } else if (diffX > 0 && swipedDocId === doc.id) {
              setRowSwipeOffset(Math.min(-80 + diffX, 0));
            }
          }}
          onTouchEnd={() => {
            isDraggingRow.current = false;
            if (rowSwipeOffset < -40) {
              setRowSwipeOffset(-80);
              setSwipedDocId(doc.id);
            } else {
              setRowSwipeOffset(0);
              setSwipedDocId(null);
            }
          }}
        >
          {doc.isFolder ? (
            <button
              className="sidebar-toggle"
              onClick={() => toggleExpand(doc.id)}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="sidebar-toggle-placeholder" />
          )}

          {doc.isFolder ? (
            isExpanded ? (
              <FolderOpen size={16} className="sidebar-icon" />
            ) : (
              <Folder size={16} className="sidebar-icon" />
            )
          ) : (
            <FileText size={16} className="sidebar-icon" />
          )}

          {isRenaming ? (
            <input
              className="sidebar-rename-input"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenamingId(null);
              }}
            />
          ) : (
            <span
              className="sidebar-label"
              onClick={() => (doc.isFolder ? toggleExpand(doc.id) : handleSelect(doc.id))}
            >
              {doc.title || "Untitled"}
            </span>
          )}

          <span className="sidebar-actions">
            {doc.isFolder && (
              <>
                <button
                  className="sidebar-action-btn"
                  title="Add Note in Folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateDocument(undefined, doc.id);
                    setExpanded((prev) => new Set(prev).add(doc.id));
                    if (navigator.vibrate) navigator.vibrate(10);
                  }}
                >
                  <FilePlus size={13} />
                </button>
                <button
                  className="sidebar-action-btn"
                  title="Add Subfolder"
                  onClick={(e) => {
                    e.stopPropagation();
                    createFolder(undefined, doc.id);
                    setExpanded((prev) => new Set(prev).add(doc.id));
                    if (navigator.vibrate) navigator.vibrate(10);
                  }}
                >
                  <FolderPlus size={13} />
                </button>
              </>
            )}
            <button
              className="sidebar-action-btn"
              title="Rename"
              onClick={() => startRename(doc)}
            >
              <Pencil size={13} />
            </button>
            <button
              className="sidebar-action-btn"
              title="Delete"
              onClick={() => {
                if (
                  confirm(
                    `Delete "${doc.title}"${
                      doc.isFolder ? " and all its contents" : ""
                    }?`
                  )
                ) {
                  deleteDocument(doc.id);
                  if (navigator.vibrate) navigator.vibrate(20);
                }
              }}
            >
              <Trash2 size={13} />
            </button>
          </span>

          {swipedDocId === doc.id && rowSwipeOffset < -20 && (
            <button
              type="button"
              className="sidebar-row-delete-action"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${doc.title}"${doc.isFolder ? " and all its contents" : ""}?`)) {
                  deleteDocument(doc.id);
                  if (navigator.vibrate) navigator.vibrate(20);
                }
                setSwipedDocId(null);
                setRowSwipeOffset(0);
              }}
              style={{
                position: "absolute",
                right: -80,
                top: 0,
                bottom: 0,
                width: 80,
                backgroundColor: "#ef4444",
                color: "#fff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              <Trash2 size={14} color="#fff" />
            </button>
          )}
        </div>

        {doc.isFolder && isExpanded && children.map(renderNode)}
      </div>
    );
  };

  return (
    <aside
      ref={asideRef as any}
      className={`graphite-sidebar${isOpen ? " open" : ""}`}
      style={{
        transform: isOpen && swipeOffset < 0 ? `translateX(${swipeOffset}px)` : undefined,
        transition: isSwipeClosing.current ? "none" : undefined
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <span className="sidebar-title">
          {showArchived ? "Archive" : activeTagFilter ? `#${activeTagFilter}` : "Documents"}
        </span>
        <button
          className="mobile-sidebar-close-btn"
          onClick={onClose}
          title="Close Sidebar"
          style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px", alignItems: "center", justifyContent: "center" }}
        >
          <X size={16} />
        </button>
        <div className="sidebar-new-buttons">
          <button
            className={`graphite-btn sidebar-new-btn${showArchived ? " active" : ""}`}
            title={showArchived ? "View active notes" : "View archived notes"}
            onClick={() => setShowArchived((p) => !p)}
          >
            <Archive size={14} />
          </button>
          <button
            className="graphite-btn sidebar-new-btn"
            title="New document"
            onClick={() => handleCreateDocument(undefined, parentForNew())}
          >
            <FilePlus size={14} />
          </button>
          <button
            className="graphite-btn sidebar-new-btn"
            title="New folder"
            onClick={() => createFolder(undefined, parentForNew())}
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {pullDistance > 0 && (
        <div
          style={{
            height: pullDistance,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            transition: isPullingDown.current ? "none" : "height 0.2s ease",
            color: "var(--accent-color)"
          }}
        >
          <div
            className={`sync-spinner${isRefreshing ? " spinning" : ""}`}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "2px solid var(--accent-color)",
              borderTopColor: "transparent",
              transform: `rotate(${pullDistance * 6}deg)`,
              transition: isRefreshing ? "none" : "transform 0.1s ease"
            }}
          />
        </div>
      )}

      {/* Pinned Notes Section */}
      {!showArchived && pinnedNotes.length > 0 && (
        <div style={{ padding: "8px 12px 4px 12px", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--accent-color)", textTransform: "uppercase", marginBottom: "4px" }}>
            <Pin size={12} /> Pinned Notes
          </div>
          {pinnedNotes.map((note) => (
            <div
              key={note.id}
              className={`sidebar-row${note.id === docId ? " selected" : ""}`}
              onClick={() => handleSelect(note.id)}
              style={{ paddingLeft: "8px", fontSize: "13px" }}
            >
              <FileText size={14} className="sidebar-icon" />
              <span className="sidebar-label">{note.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tags Section */}
      {!showArchived && tagCounts.length > 0 && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-color)", display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {activeTagFilter && (
            <button
              type="button"
              onClick={() => setActiveTagFilter(null)}
              style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "none", borderRadius: "10px", padding: "2px 6px", fontSize: "11px", cursor: "pointer" }}
            >
              Clear Filter
            </button>
          )}
          {tagCounts.map(([t, cnt]) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTagFilter(activeTagFilter === t ? null : t)}
              style={{
                background: activeTagFilter === t ? "var(--accent-color)" : "var(--bg-tertiary)",
                color: activeTagFilter === t ? "#fff" : "var(--text-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                padding: "2px 8px",
                fontSize: "11px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Tag size={10} />
              #{t} ({cnt})
            </button>
          ))}
        </div>
      )}

      {pinnedNotes.length > 0 && (
        <div style={{ marginBottom: "4px" }}>
          <div
            onClick={() => {
            const next = !pinnedCollapsed;
            setPinnedCollapsed(next);
            localStorage.setItem("graphite_sidebar_pinned_collapsed", String(next));
          }}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 8px", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", userSelect: "none" }}
          >
            {pinnedCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            Pinned ({pinnedNotes.length})
          </div>
          {!pinnedCollapsed && (
            <div className="sidebar-tree" role="tree">
              {pinnedNotes.map((doc) => {
                const isSelected = doc.id === docId;
                return (
                  <div
                    key={doc.id}
                    className={`sidebar-row${isSelected ? " selected" : ""}`}
                    role="treeitem"
                    aria-description="pinned"
                    onClick={() => !doc.isFolder && handleSelect(doc.id)}
                    style={{ paddingLeft: 24, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)" }}
                  >
                    <Pin size={10} style={{ color: "var(--accent-color)", opacity: 0.7 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: "4px" }}>
        <div
          onClick={() => {
            const next = !docsCollapsed;
            setDocsCollapsed(next);
            localStorage.setItem("graphite_sidebar_docs_collapsed", String(next));
          }}
          style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 8px", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", userSelect: "none" }}
        >
          {docsCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          Documents
        </div>
        {!docsCollapsed && (
          <div className="sidebar-tree" role="tree">
            {tree.length === 0 ? (
              <p className="sidebar-empty">
                {showArchived ? "No archived documents." : activeTagFilter ? `No notes with #${activeTagFilter}` : "No documents yet."}
              </p>
            ) : (
              <>
                {tree.map(renderNode)}
                {docTotal > (docPage + 1) * 50 && (
                  <button
                    className="sidebar-load-more"
                    onClick={loadNextPage}
                    style={{
                      width: "100%",
                      padding: "6px",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      background: "transparent",
                      border: "none",
                      borderTop: "1px solid var(--border-color)",
                      cursor: "pointer",
                    }}
                  >
                    Load more...
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <button className="graphite-btn sidebar-logout-btn" onClick={handleLogout} title="Sign out">
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
