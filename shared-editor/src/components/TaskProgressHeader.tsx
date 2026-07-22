import { useNoteStore } from "../store/useNoteStore";
import { CheckCircle2, CheckCheck } from "lucide-react";
import { toast } from "./Toast";

export function TaskProgressHeader() {
  const totalTodos = useNoteStore((s) => s.totalTodos);
  const completedTodos = useNoteStore((s) => s.completedTodos);

  if (totalTodos === 0) return null;

  const percentage = Math.round((completedTodos / totalTodos) * 100);

  return (
    <div
      className="graphite-task-progress"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        marginBottom: "12px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "10px",
        fontSize: "13px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
        <CheckCircle2 size={16} color="var(--accent-color)" />
        <span>
          <strong>{completedTodos}</strong> of <strong>{totalTodos}</strong> tasks completed ({percentage}%)
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "100px",
            height: "6px",
            background: "var(--bg-tertiary)",
            borderRadius: "3px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: "100%",
              background: "linear-gradient(90deg, #6366f1, #a855f7)",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <button
          type="button"
          className="graphite-toolbar-btn"
          title="All tasks status summary"
          onClick={() => toast(`${completedTodos} of ${totalTodos} tasks completed (${percentage}%)`, "info")}
          style={{ padding: "2px 6px", fontSize: "11px" }}
        >
          <CheckCheck size={14} color="var(--accent-color)" />
        </button>
      </div>
    </div>
  );
}
