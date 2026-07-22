import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle, Clock } from "lucide-react";

export interface KanbanCard {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  tag?: string;
}

export function KanbanBoard() {
  const [cards, setCards] = useState<KanbanCard[]>([
    { id: "k1", title: "Setup database schema", status: "done", tag: "Backend" },
    { id: "k2", title: "Implement Kanban block view", status: "in_progress", tag: "UI" },
    { id: "k3", title: "Add drag & drop sorting", status: "todo", tag: "Feature" },
  ]);

  const [newTitle, setNewTitle] = useState("");
  const [activeColumn, setActiveColumn] = useState<"todo" | "in_progress" | "done">("todo");

  const addCard = (column: "todo" | "in_progress" | "done") => {
    if (!newTitle.trim()) return;
    const card: KanbanCard = {
      id: "k_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
      title: newTitle.trim(),
      status: column,
      tag: "Task",
    };
    setCards([...cards, card]);
    setNewTitle("");
  };

  const moveCard = (cardId: string, nextStatus: "todo" | "in_progress" | "done") => {
    setCards(cards.map((c) => (c.id === cardId ? { ...c, status: nextStatus } : c)));
  };

  const deleteCard = (cardId: string) => {
    setCards(cards.filter((c) => c.id !== cardId));
  };

  const columns: { id: "todo" | "in_progress" | "done"; title: string; icon: any; color: string }[] = [
    { id: "todo", title: "To Do", icon: Circle, color: "#f59e0b" },
    { id: "in_progress", title: "In Progress", icon: Clock, color: "#6366f1" },
    { id: "done", title: "Completed", icon: CheckCircle2, color: "#10b981" },
  ];

  return (
    <div
      className="graphite-kanban-board"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        padding: "16px",
        margin: "16px 0",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
        📊 Database — Kanban View
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {columns.map((col) => {
          const Icon = col.icon;
          const colCards = cards.filter((c) => c.status === col.id);

          return (
            <div
              key={col.id}
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: col.color }}>
                  <Icon size={16} />
                  {col.title} ({colCards.length})
                </div>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", minHeight: "120px" }}>
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{card.title}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ padding: "1px 6px", background: "rgba(99, 102, 241, 0.15)", color: "var(--accent-color)", borderRadius: "4px" }}>
                        {card.tag}
                      </span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {col.id !== "todo" && (
                          <button type="button" onClick={() => moveCard(card.id, "todo")} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "10px" }}>
                            ← ToDo
                          </button>
                        )}
                        {col.id !== "in_progress" && (
                          <button type="button" onClick={() => moveCard(card.id, "in_progress")} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "10px" }}>
                            Progress
                          </button>
                        )}
                        {col.id !== "done" && (
                          <button type="button" onClick={() => moveCard(card.id, "done")} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "10px" }}>
                            Done →
                          </button>
                        )}
                        <button type="button" onClick={() => deleteCard(card.id)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer" }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Card Input */}
              <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                <input
                  type="text"
                  placeholder="+ New task..."
                  value={activeColumn === col.id ? newTitle : ""}
                  onChange={(e) => { setActiveColumn(col.id); setNewTitle(e.target.value); }}
                  onKeyDown={(e) => e.key === "Enter" && addCard(col.id)}
                  style={{
                    flex: 1,
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "12px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => addCard(col.id)}
                  style={{ background: "var(--accent-color)", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
