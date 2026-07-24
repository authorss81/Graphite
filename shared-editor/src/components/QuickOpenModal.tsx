import { useState, useEffect, useRef, useMemo } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { Search, FileText, ArrowRight } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickOpenModal({ isOpen, onClose }: Props) {
  const documents = useNoteStore((s) => s.documents);
  const selectDocument = useNoteStore((s) => s.selectDocument);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) { setQuery(""); setSelectedIndex(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const docs = Object.values(documents).filter((d) => !d.isFolder && !d.isArchived);
    if (!q) return docs.slice(0, 10);
    return docs
      .filter((d) => (d.title || "").toLowerCase().includes(q) || (d.editorState || "").toLowerCase().includes(q))
      .slice(0, 10);
  }, [query, documents]);

  const handleSelect = (docId: string) => {
    selectDocument(docId);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((p) => Math.min(p + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[selectedIndex]) handleSelect(filtered[selectedIndex].id); }
    else if (e.key === "Escape") onClose();
  };

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Quick open" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", paddingTop: "80px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "520px", background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)", borderRadius: "12px", overflow: "hidden", alignSelf: "flex-start", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 14px", borderBottom: "1px solid var(--border-color)" }}>
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input ref={inputRef} type="text" placeholder="Search notes..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} style={{ flex: 1, background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "14px", outline: "none" }} />
        </div>
        <div style={{ maxHeight: "360px", overflow: "auto", padding: "4px 0" }}>
          {filtered.map((doc, i) => (
            <div key={doc.id} onClick={() => handleSelect(doc.id)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", cursor: "pointer", background: i === selectedIndex ? "rgba(99,102,241,0.12)" : "transparent", color: i === selectedIndex ? "var(--accent-color)" : "var(--text-primary)", fontSize: "13px" }}>
              <FileText size={14} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title || "Untitled"}</div>
              <ArrowRight size={14} style={{ opacity: i === selectedIndex ? 1 : 0 }} />
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No matching notes found</div>}
        </div>
      </div>
    </div>
  );
}
