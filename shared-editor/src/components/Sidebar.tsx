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

export function Sidebar() {
  const documents = useNoteStore((s) => s.documents);
  const docId = useNoteStore((s) => s.docId);
  const selectDocument = useNoteStore((s) => s.selectDocument);
  const createDocument = useNoteStore((s) => s.createDocument);
  const createFolder = useNoteStore((s) => s.createFolder);
  const renameDocument = useNoteStore((s) => s.renameDocument);
  const deleteDocument = useNoteStore((s) => s.deleteDocument);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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
    const logout = useAuthStore.getState().logout;
    await logout();
    toast("Signed out", "info");
  };

  // Swipe-to-dismiss state (tracked per row via doc.id)
  const swipeState = useMemo<{ [key: string]: number }>(() => ({}), []);
  // We store swipe offsets in a ref to avoid re-renders during drag
  const swipeOffsets = useRef<{ [key: string]: number }>({});

  const renderNode = (node: TreeNode) => {
    const { doc, children, depth } = node;
    const isExpanded = expanded.has(doc.id);
    const isSelected = doc.id === docId && !doc.isFolder;
    const isRenaming = renamingId === doc.id;
    const translateX = swipeOffsets.current[doc.id] || 0;

    return (
      <div key={doc.id}>
        <div
          className={`sidebar-row${isSelected ? " selected" : ""}${translateX !== 0 ? " swiping" : ""}`}
          style={{
            paddingLeft: 8 + depth * 16,
            transform: translateX ? `translateX(${translateX}px)` : undefined,
            transition: swipeOffsets.current[doc.id] === undefined ? "transform 0.2s ease" : undefined,
            touchAction: "pan-y",
            position: "relative",
            overflow: "hidden",
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            swipeState[doc.id] = touch.clientX;
            swipeOffsets.current[doc.id] = 0;
          }}
          onTouchMove={(e) => {
            if (swipeState[doc.id] === undefined) return;
            const touch = e.touches[0];
            const diff = touch.clientX - swipeState[doc.id];
            if (diff < 0) {
              swipeOffsets.current[doc.id] = Math.max(diff, -100);
              // Force re-render by updating a state that causes re-render
              setRenamingId(renamingId); // cheap re-render trigger
            }
          }}
          onTouchEnd={() => {
            const offset = swipeOffsets.current[doc.id] || 0;
            if (offset < -50) {
              // Swiped far enough — delete the document
              const confirmed = confirm(
                `Delete "${doc.title}"${doc.isFolder ? " and all its contents" : ""}?`
              );
              if (confirmed) {
                deleteDocument(doc.id);
                if (navigator.vibrate) navigator.vibrate(20);
              }
            }
            delete swipeState[doc.id];
            delete swipeOffsets.current[doc.id];
            setRenamingId(renamingId); // trigger re-render
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
              onClick={() => (doc.isFolder ? toggleExpand(doc.id) : selectDocument(doc.id))}
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
                    createDocument(undefined, doc.id);
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
        </div>

        {doc.isFolder && isExpanded && children.map(renderNode)}
      </div>
    );
  };

  return (
    <aside className="graphite-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">
          {showArchived ? "Archive" : activeTagFilter ? `#${activeTagFilter}` : "Documents"}
        </span>
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
            onClick={() => createDocument(undefined, parentForNew())}
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
              onClick={() => selectDocument(note.id)}
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

      <div className="sidebar-tree">
        {tree.length === 0 ? (
          <p className="sidebar-empty">
            {showArchived ? "No archived documents." : activeTagFilter ? `No notes with #${activeTagFilter}` : "No documents yet."}
          </p>
        ) : (
          tree.map(renderNode)
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
