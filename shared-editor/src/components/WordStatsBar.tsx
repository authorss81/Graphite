import { useMemo } from "react";
import { extractHumanText } from "../utils/versionHistory";
import { Clock, FileText, Hash } from "lucide-react";

interface Props {
  editorState?: string;
}

export function WordStatsBar({ editorState }: Props) {
  const stats = useMemo(() => {
    const text = extractHumanText(editorState || "");
    if (!text.trim()) {
      return { words: 0, chars: 0, readTime: "< 1 min" };
    }
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const mins = Math.max(1, Math.ceil(words / 200));
    return {
      words,
      chars,
      readTime: `${mins} min read`,
    };
  }, [editorState]);

  return (
    <div
      className="graphite-word-stats-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 16px",
        marginTop: "12px",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        fontSize: "11px",
        color: "var(--text-muted)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <FileText size={12} color="var(--accent-color)" />
          <strong style={{ color: "var(--text-secondary)" }}>{stats.words}</strong> words
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Hash size={12} />
          <strong style={{ color: "var(--text-secondary)" }}>{stats.chars}</strong> chars
        </span>
      </div>
      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <Clock size={12} />
        {stats.readTime}
      </span>
    </div>
  );
}
