import { useState } from "react";
import { useNoteStore } from "../store/useNoteStore";
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
} from "lucide-react";

interface TreeNode {
  doc: GraphiteDoc;
  children: TreeNode[];
  depth: number;
}

function buildTree(documents: Record<string, GraphiteDoc>): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  for (const doc of Object.values(documents)) {
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

  const tree = buildTree(documents);

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

  const renderNode = (node: TreeNode) => {
    const { doc, children, depth } = node;
    const isExpanded = expanded.has(doc.id);
    const isSelected = doc.id === docId && !doc.isFolder;
    const isRenaming = renamingId === doc.id;

    return (
      <div key={doc.id}>
        <div
          className={`sidebar-row${isSelected ? " selected" : ""}`}
          style={{ paddingLeft: 8 + depth * 16 }}
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
            <button
              className="sidebar-action-btn"
              title="Rename"
              onClick={() => startRename(doc)}
            >
              <Pencil size={13} />
            </button>
            <button
              className="sidebar-action-btn danger"
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
        <span className="sidebar-title">Documents</span>
        <div className="sidebar-new-buttons">
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
      <div className="sidebar-tree">
        {tree.length === 0 ? (
          <p className="sidebar-empty">No documents yet.</p>
        ) : (
          tree.map(renderNode)
        )}
      </div>
    </aside>
  );
}
