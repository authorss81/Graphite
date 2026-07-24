import { useMemo } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { Calendar, Plus } from "lucide-react";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

export function DailyJournal() {
  const documents = useNoteStore((s) => s.documents);
  const selectDocument = useNoteStore((s) => s.selectDocument);

  const todayDocs = useMemo(() => {
    const today = formatDate(new Date());
    return Object.values(documents).filter((d: any) => !d.isFolder && d.title && d.title.includes(today));
  }, [documents]);

  const recentDocs = useMemo(() => {
    return Object.values(documents)
      .filter((d: any) => !d.isFolder && !d.isArchived)
      .sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 5);
  }, [documents]);

  const createDailyNote = () => {
    const today = formatDate(new Date());
    const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    useNoteStore.getState().createDocument(`${dayName} — ${today}`);
  };

  return (
    <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "12px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
          <Calendar size={16} /> Daily Journal
        </div>
        <button onClick={createDailyNote} title="Create today's note" style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--accent-color)", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "11px", fontWeight: 500 }}>
          <Plus size={12} /> Today
        </button>
      </div>
      {todayDocs.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {todayDocs.map((d: any) => (
            <div key={d.id} onClick={() => selectDocument(d.id)} style={{ padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", color: "var(--accent-color)", background: "rgba(99,102,241,0.08)" }}>
              {d.title}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>No note for today yet. Click "Today" to create one.</div>
      )}
      {recentDocs.length > 0 && (
        <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Recently updated</div>
          {recentDocs.slice(0, 3).map((d: any) => (
            <div key={d.id} onClick={() => selectDocument(d.id)} style={{ padding: "3px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)" }}>
              {d.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
