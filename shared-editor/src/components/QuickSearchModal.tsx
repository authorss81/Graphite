import { useState, useEffect, useRef, useMemo } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { Search, FileText, X, Folder } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickSearchModal({ isOpen, onClose }: Props) {
  const documents = useNoteStore((s) => s.documents);
  const selectDocument = useNoteStore((s) => s.selectDocument);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fuzzy filter: matches all query words in title or snippet (case-insensitive)
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const docs = Object.values(documents).filter((d) => !d.isArchived);
    if (!q) {
      // Show recent docs when no query (sorted by updatedAt desc)
      return [...docs]
        .filter((d) => !d.isFolder)
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
        .slice(0, 8);
    }
    const words = q.split(/\s+/).filter(Boolean);
    return docs
      .map((doc) => {
        const haystack = `${doc.title} ${doc.editorState ?? ""}`.toLowerCase();
        const titleHaystack = doc.title.toLowerCase();
        const allMatch = words.every((w) => haystack.includes(w));
        if (!allMatch) return null;
        const titleMatch = words.every((w) => titleHaystack.includes(w));
        // Generate snippet around first match
        const firstWord = words[0];
        const idx = haystack.indexOf(firstWord);
        const snippetStart = Math.max(0, idx - 30);
        const snippet = `${snippetStart > 0 ? "…" : ""}${(doc.editorState ?? "").slice(snippetStart, snippetStart + 120)}${(doc.editorState ?? "").length > snippetStart + 120 ? "…" : ""}`;
        return { doc, titleMatch, snippet };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Title matches first
        if (a!.titleMatch !== b!.titleMatch) return a!.titleMatch ? -1 : 1;
        return a!.doc.title.localeCompare(b!.doc.title);
      })
      .slice(0, 10)
      .map((r) => r!.doc);
  }, [query, documents]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const doc = results[selectedIndex];
        if (doc) {
          selectDocument(doc.id);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, results, selectedIndex, onClose, selectDocument]);

  // Scroll selected item into view
  useEffect(() => {
    const item = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const highlightText = (text: string, q: string) => {
    if (!q.trim()) return text;
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const regex = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} style={{ background: "var(--accent-color)", color: "#fff", borderRadius: "2px", padding: "0 1px" }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      className="graphite-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center" }}
    >
      <div
        className="quick-search-modal"
        role="dialog"
        aria-label="Quick Search"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          width: "min(600px, 95vw)",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          marginTop: "10vh",

        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <Search size={20} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "18px",
              fontFamily: "var(--font-body)",
            }}
            aria-label="Search notes"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px" }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <kbd
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "2px 8px",
              fontSize: "11px",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ overflowY: "auto", flex: 1 }}>
          {results.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
              {query ? `No notes matching "${query}"` : "No notes yet"}
            </div>
          ) : (
            <>
              {!query && (
                <div style={{ padding: "8px 20px 4px", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Recent Notes
                </div>
              )}
              {results.map((doc, idx) => (
                <div
                  key={doc.id}
                  data-idx={idx}
                  onClick={() => { selectDocument(doc.id); onClose(); }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "12px 20px",
                    cursor: "pointer",
                    background: idx === selectedIndex ? "var(--bg-tertiary)" : "transparent",
                    borderLeft: idx === selectedIndex ? "3px solid var(--accent-color)" : "3px solid transparent",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div style={{ flexShrink: 0, marginTop: "2px", color: "var(--text-muted)" }}>
                    {doc.isFolder ? <Folder size={16} /> : <FileText size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {query ? highlightText(doc.title, query) : doc.title}
                    </div>
                    {!doc.isFolder && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {doc.editorState?.replace(/<[^>]*>/g, "").slice(0, 100) || "Empty note"}
                      </div>
                    )}
                  </div>
                  {idx === selectedIndex && (
                    <kbd
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "4px",
                        padding: "2px 6px",
                        fontSize: "10px",
                        color: "var(--text-muted)",
                        flexShrink: 0,
                        alignSelf: "center",
                      }}
                    >
                      ↵
                    </kbd>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            padding: "10px 20px",
            borderTop: "1px solid var(--border-color)",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>ESC close</span>
        </div>
      </div>
    </div>
  );
}
