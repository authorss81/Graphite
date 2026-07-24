import { useState, useMemo } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { TEMPLATES, CATEGORIES, type Template } from "../utils/templates";
import { X, Search, FileText } from "lucide-react";

interface TemplatesGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function applyPlaceholders(content: string): string {
  const now = new Date();
  return content
    .replace(/\{\{date\}\}/g, now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))
    .replace(/\{\{date:week\}\}/g, `Week ${Math.ceil((now.getDate() - now.getDay() + 1) / 7)}`)
    .replace(/\{\{date:month\}\}/g, now.toLocaleDateString("en-US", { month: "long", year: "numeric" }))
    .replace(/\{\{date:quarter\}\}/g, `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`);
}

export function TemplatesGalleryModal({ isOpen, onClose }: TemplatesGalleryModalProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const createDocument = useNoteStore((s) => s.createDocument);
  const updateContentForDoc = useNoteStore((s) => s.updateContentForDoc);

  const filtered = useMemo(() => {
    let list = TEMPLATES;
    if (category) list = list.filter((t) => t.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [search, category]);

  const useTemplate = (template: Template) => {
    const id = createDocument(template.name);
    const content = JSON.stringify({
      root: {
        children: [{ type: "paragraph", children: [{ text: applyPlaceholders(template.content), type: "text" }] }],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    });
    updateContentForDoc(id, content);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="graphite-modal-overlay" onClick={onClose} role="dialog" aria-label="Templates gallery" aria-modal="true">
      <div
        className="graphite-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "700px", width: "90%", maxHeight: "80vh", display: "flex", flexDirection: "column", padding: "0", overflow: "hidden" }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "12px" }}>
          <FileText size={20} style={{ color: "var(--accent-color)" }} />
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, flex: 1 }}>Templates</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: "160px", padding: "6px 10px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <Search size={14} style={{ color: "var(--text-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: "13px", color: "var(--text-primary)" }}
            />
          </div>
          <button
            onClick={() => setCategory(null)}
            style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "12px", border: "1px solid var(--border-color)", background: !category ? "var(--accent-color)" : "transparent", color: !category ? "#fff" : "var(--text-secondary)", cursor: "pointer" }}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? null : c)}
              style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "12px", border: "1px solid var(--border-color)", background: category === c ? "var(--accent-color)" : "transparent", color: category === c ? "#fff" : "var(--text-secondary)", cursor: "pointer" }}
            >
              {c}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
          {filtered.map((t) => (
            <div
              key={t.id}
              onClick={() => useTemplate(t)}
              style={{ padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", cursor: "pointer", transition: "border-color 0.15s, transform 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-color)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>{t.name}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4 }}>{t.description}</div>
              <div style={{ fontSize: "10px", color: "var(--accent-color)", marginTop: "6px", opacity: 0.7 }}>{t.category}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
