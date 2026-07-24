import { useState, useEffect } from "react";
import { Link, Sparkles } from "lucide-react";
import { useNoteStore } from "../store/useNoteStore";
import { suggestSmartBacklinks } from "../utils/aiService";
import type { AISuggestedLink } from "../utils/aiService";

export function SmartBacklinks() {
  const docId = useNoteStore((s) => s.docId);
  const documents = useNoteStore((s) => s.documents);
  const currentDoc = documents[docId];
  const navigateToDoc = useNoteStore((s) => s.setDocId);
  const backlinks = useNoteStore((s) => s.backlinks);

  const [suggestions, setSuggestions] = useState<AISuggestedLink[]>([]);

  useEffect(() => {
    if (!currentDoc || !currentDoc.editorState) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await suggestSmartBacklinks(currentDoc.editorState || "", documents);
        const existingLinkedIds = new Set(
          (backlinks[docId] || []).map((b: any) => b.sourceDocId || b.targetDocId)
        );
        const filtered = result.filter((s) => !existingLinkedIds.has(s.docId) && s.docId !== docId);
        setSuggestions(filtered.slice(0, 3));
      } catch {
        setSuggestions([]);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentDoc?.editorState, docId, documents, backlinks]);

  if (suggestions.length === 0) return null;

  return (
    <div style={{ marginTop: "16px", padding: "12px", background: "var(--bg-tertiary)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        <Sparkles size={14} style={{ color: "var(--accent-color)" }} />
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Suggested Connections</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {suggestions.map((s) => (
          <button
            key={s.docId}
            type="button"
            onClick={() => navigateToDoc(s.docId)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 8px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: "12px",
              textAlign: "left",
              width: "100%",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <Link size={12} style={{ color: "var(--accent-color)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.reason}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
