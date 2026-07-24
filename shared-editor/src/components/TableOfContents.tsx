import { useMemo } from "react";

interface TocEntry {
  level: number;
  text: string;
  id: string;
}

function extractHeadings(editorState: string): TocEntry[] {
  if (!editorState) return [];
  try {
    const parsed = JSON.parse(editorState);
    const entries: TocEntry[] = [];
    const traverse = (node: any) => {
      if (node.type === "heading" && node.tag && node.text) {
        const level = parseInt(node.tag.replace("h", "")) || 1;
        entries.push({ level, text: node.text, id: "heading-" + entries.length });
      }
      if (node.children) node.children.forEach(traverse);
    };
    if (parsed.root) traverse(parsed.root);
    return entries;
  } catch {
    return [];
  }
}

interface Props {
  editorState: string;
}

export function TableOfContents({ editorState }: Props) {
  const headings = useMemo(() => extractHeadings(editorState), [editorState]);
  if (headings.length === 0) return null;
  return (
    <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "12px 16px", margin: "16px 0" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>Table of Contents</div>
      <div className="graphite-toc">
        {headings.map((h) => (
          <div key={h.id} className={`graphite-toc--h${Math.min(h.level, 3)}`} style={{ color: "var(--accent-color)", cursor: "pointer", padding: "2px 0" }} onClick={() => {
            const el = document.querySelector(`[id="${h.id}"]`);
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}>
            {h.text}
          </div>
        ))}
      </div>
    </div>
  );
}
