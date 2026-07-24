import { useState, useEffect, useRef, useCallback } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { searchIndex, type SearchResult, indexDocument } from "../utils/searchIndex";
import { Search, FileText, RefreshCw, X } from "lucide-react";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectDocument = useNoteStore((s) => s.selectDocument);

  const handleReindex = useCallback(async () => {
    setReindexing(true);
    await reindexAll();
    setReindexing(false);
    if (query.trim()) {
      setResults(await searchIndex(query));
    }
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      const res = await searchIndex(query);
      setResults(res);
      setLoading(false);
    }, 200);
    return () => clearTimeout(id);
  }, [query]);

  const handleSelect = useCallback((id: string) => {
    selectDocument(id);
    onClose();
  }, [selectDocument, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="graphite-modal-overlay" onClick={onClose} role="dialog" aria-label="Full-text search" aria-modal="true">
      <div
        className="graphite-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "600px", width: "90%", padding: "0", overflow: "hidden" }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border-color)" }}>
          <Search size={18} style={{ color: "var(--text-muted)", marginRight: "10px", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all notes…"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "15px", color: "var(--text-primary)" }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>
              <X size={16} />
            </button>
          )}
          <button onClick={handleReindex} disabled={reindexing} title="Rebuild search index" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", marginLeft: "4px", padding: "4px", opacity: reindexing ? 0.5 : 1 }}>
            <RefreshCw size={16} className={reindexing ? "spin" : ""} />
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", marginLeft: "4px", padding: "4px" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ maxHeight: "400px", overflowY: "auto", padding: results.length > 0 ? "8px 0" : "0" }}>
          {loading && <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>Searching…</div>}
          {!loading && query && results.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              No results for "{query}"
            </div>
          )}
          {results.map((r) => (
            <div
              key={r.id}
              onClick={() => handleSelect(r.id)}
              style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid var(--border-color)", transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                <FileText size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{r.title}</span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>{r.snippet}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function reindexAll() {
  const docs = useNoteStore.getState().documents;
  for (const doc of Object.values(docs)) {
    if (doc.isFolder || doc.isArchived) continue;
    const plain = doc.editorState
      ? doc.editorState.replace(/<[^>]*>/g, "").replace(/\\n/g, " ")
      : "";
    await indexDocument(doc.id, doc.title || "Untitled", plain, doc.tags || []);
  }
}
