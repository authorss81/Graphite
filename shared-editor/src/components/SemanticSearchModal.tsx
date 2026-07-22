import { useState, useEffect, useMemo, useRef } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { generateEmbedding, cosineSimilarity, storeDocumentEmbedding, getCachedEmbedding } from "../utils/embedding";
import { Sparkles, FileText, X, ArrowRight } from "lucide-react";

interface SearchResult {
  docId: string;
  title: string;
  snippet: string;
  vectorScore: number;
  textScore: number;
  hybridScore: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SemanticSearchModal({ isOpen, onClose }: Props) {
  const documents = useNoteStore((s) => s.documents);
  const selectDocument = useNoteStore((s) => s.selectDocument);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      // Pre-compute embeddings for all documents (cache-hit skips regeneration)
      Object.values(documents).forEach((doc) => {
        if (!doc.isFolder && !getCachedEmbedding(doc.id)) {
          storeDocumentEmbedding(doc.id, doc.title, doc.editorState || "");
        }
      });
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const queryVector = generateEmbedding(query);
    const qTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const docList = Object.values(documents).filter((d) => !d.isFolder);

    const scored: SearchResult[] = docList.map((doc) => {
      const docText = `${doc.title}\n${doc.editorState || ""}`;
      const docVector = generateEmbedding(docText);
      const vScore = cosineSimilarity(queryVector, docVector);

      let matches = 0;
      const lowerText = docText.toLowerCase();
      for (const t of qTokens) {
        if (lowerText.includes(t)) matches++;
      }
      const tScore = qTokens.length > 0 ? matches / qTokens.length : 0;
      const hScore = 0.65 * vScore + 0.35 * tScore;

      // Extract context snippet around query text
      let snippet = (doc.editorState || "").replace(/[{}]/g, " ").slice(0, 140);
      const idx = lowerText.indexOf(qTokens[0] || "");
      if (idx !== -1) {
        snippet = "..." + lowerText.slice(Math.max(0, idx - 30), Math.min(lowerText.length, idx + 110)) + "...";
      }

      return {
        docId: doc.id,
        title: doc.title || "Untitled",
        snippet,
        vectorScore: vScore,
        textScore: tScore,
        hybridScore: hScore,
      };
    });

    return scored
      .filter((r) => r.hybridScore > 0.3 || r.textScore > 0)
      .sort((a, b) => b.hybridScore - a.hybridScore);
  }, [query, documents]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (docId: string) => {
    selectDocument(docId);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex].docId);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="graphite-modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "100px",
      }}
    >
      <div
        className="graphite-semantic-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "640px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <Sparkles size={20} color="var(--accent-color)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="AI Semantic Search (e.g. 'project ideas', 'todo tasks')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "16px",
              fontFamily: "var(--font-sans)",
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: "380px", overflowY: "auto", padding: "8px" }}>
          {!query.trim() ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
              Type anything to search using 384D Vector Embeddings & Full-Text Hybrid Search
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
              No matching notes found for "{query}"
            </div>
          ) : (
            results.map((res, idx) => {
              const isSelected = idx === selectedIndex;
              const matchPct = Math.round(res.hybridScore * 100);
              return (
                <button
                  key={res.docId}
                  type="button"
                  onClick={() => handleSelect(res.docId)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    width: "100%",
                    padding: "12px 14px",
                    border: "none",
                    borderRadius: "10px",
                    background: isSelected ? "var(--bg-tertiary)" : "transparent",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s ease",
                    marginBottom: "4px",
                  }}
                >
                  <FileText size={18} color="var(--accent-color)" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 600, fontSize: "14px" }}>{res.title}</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: "rgba(99, 102, 241, 0.2)",
                          color: "var(--accent-color)",
                        }}
                      >
                        {matchPct}% Match
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {res.snippet}
                    </p>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" style={{ marginTop: "4px", flexShrink: 0 }} />
                </button>
              );
            })
          )}
        </div>

        <div
          style={{
            padding: "8px 16px",
            background: "rgba(0,0,0,0.2)",
            borderTop: "1px solid var(--border-color)",
            fontSize: "12px",
            color: "var(--text-muted)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>↑↓ Navigate · Enter Select · Esc Close</span>
          <span>pgvector Cosine Similarity</span>
        </div>
      </div>
    </div>
  );
}
