import { useState, useMemo } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { CheckCircle2, Circle, Clock, FileText } from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface DocChecklistGroup {
  docId: string;
  docTitle: string;
  items: ChecklistItem[];
}

function extractChecklists(editorState: string): ChecklistItem[] {
  if (!editorState) return [];
  try {
    const parsed = JSON.parse(editorState);
    const items: ChecklistItem[] = [];
    const traverse = (node: any) => {
      if (typeof node.checked === "boolean") {
        items.push({ id: node.id || crypto.randomUUID(), text: node.text || "", checked: node.checked });
      }
      if (node.children) node.children.forEach(traverse);
    };
    if (parsed.root) traverse(parsed.root);
    return items;
  } catch {
    return [];
  }
}

export function KanbanBoard() {
  const documents = useNoteStore((s) => s.documents);
  const selectDocument = useNoteStore((s) => s.selectDocument);

  const [filterDoc, setFilterDoc] = useState<string | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "todo" | "in_progress" | "done">("all");

  const checklistGroups = useMemo(() => {
    const groups: DocChecklistGroup[] = [];
    for (const [docId, doc] of Object.entries(documents)) {
      if (doc.isArchived) continue;
      const items = extractChecklists(doc.editorState);
      if (items.length > 0) {
        groups.push({ docId, docTitle: doc.title || "Untitled", items });
      }
    }
    return groups;
  }, [documents]);

  const allItems = useMemo(() => {
    const items: { item: ChecklistItem; docId: string; docTitle: string }[] = [];
    for (const group of checklistGroups) {
      for (const item of group.items) {
        items.push({ item, docId: group.docId, docTitle: group.docTitle });
      }
    }
    return items;
  }, [checklistGroups]);

  const filteredItems = useMemo(() => {
    return allItems.filter(({ item, docId }) => {
      if (filterDoc !== "all" && docId !== filterDoc) return false;
      if (filterStatus === "todo" && item.checked) return false;
      if (filterStatus === "done" && !item.checked) return false;
      return true;
    });
  }, [allItems, filterDoc, filterStatus]);

  const toggleItem = (docId: string, itemId: string, checked: boolean) => {
    const doc = documents[docId];
    if (!doc) return;
    try {
      const parsed = JSON.parse(doc.editorState);
      const toggle = (node: any) => {
        if ((node.id === itemId || typeof node.checked === "boolean") && node.id === itemId) {
          node.checked = checked;
        }
        if (node.children) node.children.forEach(toggle);
      };
      if (parsed.root) toggle(parsed.root);
      useNoteStore.getState().updateCurrentContent(JSON.stringify(parsed), doc.canvasData);
    } catch {}
  };

  const todoItems = filteredItems.filter(({ item }) => !item.checked);
  const inProgressItems = filteredItems.filter(({ item }) => item.checked);
  const doneItems: typeof filteredItems = [];

  const columns = [
    { id: "todo" as const, title: "To Do", icon: Circle, color: "#f59e0b", items: todoItems },
    { id: "in_progress" as const, title: "In Progress", icon: Clock, color: "#6366f1", items: inProgressItems },
    { id: "done" as const, title: "Completed", icon: CheckCircle2, color: "#10b981", items: doneItems },
  ];

  return (
    <div className="graphite-kanban-board" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "16px", margin: "16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={16} /> Kanban — {allItems.length} items across {checklistGroups.length} docs
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select value={filterDoc} onChange={(e) => setFilterDoc(e.target.value)} style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px" }}>
            <option value="all">All Docs</option>
            {checklistGroups.map((g) => <option key={g.docId} value={g.docId}>{g.docTitle}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px" }}>
            <option value="all">All</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Completed</option>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {columns.map((col) => {
          const Icon = col.icon;
          return (
            <div key={col.id} style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", minHeight: "200px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: col.color, marginBottom: "10px" }}>
                <Icon size={16} /> {col.title} ({col.items.length})
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                {col.items.map(({ item, docId, docTitle }) => (
                  <div key={item.id} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <input type="checkbox" checked={item.checked} onChange={(e) => toggleItem(docId, item.id, e.target.checked)} style={{ marginTop: "2px", accentColor: "var(--accent-color)" }} />
                      <div style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, textDecoration: item.checked ? "line-through" : "none", opacity: item.checked ? 0.6 : 1 }}>
                        {item.text}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                      <button onClick={() => selectDocument(docId)} style={{ background: "rgba(99, 102, 241, 0.15)", border: "none", color: "var(--accent-color)", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", fontSize: "11px" }}>
                        {docTitle}
                      </button>
                    </div>
                  </div>
                ))}
                {col.items.length === 0 && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "12px", fontStyle: "italic" }}>
                    {col.id === "todo" ? "No pending tasks" : col.id === "in_progress" ? "No items in progress" : "No completed items"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
