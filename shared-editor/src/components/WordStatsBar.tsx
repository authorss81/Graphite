import { useNoteStore } from "../store/useNoteStore";
import { Clock, FileText, Hash } from "lucide-react";

export function WordStatsBar() {
  const wordCount = useNoteStore((s) => s.wordCount);
  const charCount = useNoteStore((s) => s.charCount);
  const mins = Math.max(1, Math.ceil(wordCount / 200));
  const readTime = wordCount === 0 ? "< 1 min" : `${mins} min read`;

  return (
    <div
      className="graphite-word-stats-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 14px",
        marginTop: "12px",
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(8px)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        fontSize: "11px",
        fontFamily: "'JetBrains Mono', var(--font-mono)",
        color: "var(--text-muted)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <FileText size={12} style={{ color: "var(--accent-color)" }} />
          <strong style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{wordCount}</strong> words
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Hash size={12} />
          <strong style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{charCount}</strong> chars
        </span>
      </div>
      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <Clock size={12} />
        {readTime}
      </span>
    </div>
  );
}
