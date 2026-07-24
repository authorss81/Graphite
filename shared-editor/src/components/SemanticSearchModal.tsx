import { useState, useEffect, useRef } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { generateEmbedding, cosineSimilarity, storeDocumentEmbedding, getCachedEmbedding } from "../utils/embedding";
import { loadAIConfig } from "../utils/aiConfig";
import { Sparkles, FileText, X, ArrowRight, Brain } from "lucide-react";
import { toast } from "./Toast";

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
  const [results, setResults] = useState<SearchResult[]>([]);
  const [reranking, setReranking] = useState(false);
  const [rerankedIds, setRerankedIds] = useState<string[] | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const computeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<SearchResult[]>([]);

  useEffect(() => { resultsRef.current = results; }, [results]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      Object.values(documents).forEach((doc) => {
        if (!doc.isFolder && !getCachedEmbedding(doc.id)) {
          storeDocumentEmbedding(doc.id, doc.title, doc.editorState || "");
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (computeTimeoutRef.current) clearTimeout(computeTimeoutRef.current);
    if (!query.trim()) { setResults([]); return; }
    computeTimeoutRef.current = setTimeout(async () => {
      const queryVector = await generateEmbedding(query);
      const qTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
      const docList = Object.values(documents).filter((d) => !d.isFolder);
      const scored: SearchResult[] = await Promise.all(docList.map(async (doc) => {
        const docText = `${doc.title}\n${doc.editorState || ""}`;
        const docVector = await generateEmbedding(docText);
        const vScore = cosineSimilarity(queryVector, docVector);
        let matches = 0;
        const lowerText = docText.toLowerCase();
        for (const t of qTokens) { if (lowerText.includes(t)) matches++; }
        const tScore = qTokens.length > 0 ? matches / qTokens.length : 0;
        const hScore = 0.65 * vScore + 0.35 * tScore;
        let snippet = (doc.editorState || "").replace(/[{}]/g, " ").slice(0, 140);
        const idx = lowerText.indexOf(qTokens[0] || "");
        if (idx !== -1) {
          snippet = "..." + lowerText.slice(Math.max(0, idx - 30), Math.min(lowerText.length, idx + 110)) + "...";
        }
        return { docId: doc.id, title: doc.title || "Untitled", snippet, vectorScore: vScore, textScore: tScore, hybridScore: hScore };
      }));
      setResults(scored.filter((r) => r.hybridScore > 0.3 || r.textScore > 0).sort((a, b) => b.hybridScore - a.hybridScore));
    }, 200);
    return () => { if (computeTimeoutRef.current) clearTimeout(computeTimeoutRef.current); };
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

  const handleRerank = async () => {
    const current = resultsRef.current;
    if (current.length === 0) return;
    const config = loadAIConfig();
    if (config.provider === "openai" && !config.openaiKey) { toast("Configure OpenAI API key in AI Settings for LLM reranking", "error"); return; }
    if (config.provider === "anthropic" && !config.anthropicKey) { toast("Configure Anthropic API key in AI Settings for LLM reranking", "error"); return; }

    setReranking(true);
    try {
      const topDocs = current.slice(0, 10);
      const docsText = topDocs.map((d, i) => `${i + 1}. "${d.title}": ${d.snippet.slice(0, 200)}`).join("\n\n");
      const systemMsg = "You are a search relevance reranker. Given a query and a list of documents, re-rank the documents by relevance. Return ONLY the ranked list of document indices as comma-separated numbers (e.g., '3,1,4,2'). Most relevant first.";
      const prompt = `Query: "${query}"\n\nDocuments:\n${docsText}`;

      let rankedText = "";
      if (config.provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.openaiKey}` },
          body: JSON.stringify({ model: config.openaiModel, messages: [{ role: "system", content: systemMsg }, { role: "user", content: prompt }], max_tokens: 50, temperature: 0.1 }),
        });
        if (res.ok) { const data = await res.json(); rankedText = data.choices?.[0]?.message?.content || ""; }
      } else if (config.provider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": config.anthropicKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: config.anthropicModel, system: systemMsg, messages: [{ role: "user", content: prompt }], max_tokens: 50 }),
        });
        if (res.ok) { const data = await res.json(); rankedText = data.content?.[0]?.text || ""; }
      } else {
        toast("LLM reranking requires OpenAI or Anthropic provider", "error");
        setReranking(false);
        return;
      }

      const indices = rankedText.split(",").map((s) => parseInt(s.trim()) - 1).filter((n) => !isNaN(n) && n >= 0 && n < topDocs.length);
      if (indices.length > 0) {
        const newOrder = [...indices.map((i) => topDocs[i]), ...current.slice(10)];
        setResults(newOrder);
        setRerankedIds(newOrder.map((r) => r.docId));
        toast("Results reranked by AI!", "success");
      }
    } catch {
      toast("LLM reranking failed", "error");
    } finally {
      setReranking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
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
        className="graphite-semantic-modal graphite-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "640px",
          background: "var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "1px solid var(--glass-border)",
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
            aria-label="Close modal"
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
            alignItems: "center",
          }}
        >
          <span>↑↓ Navigate · Enter Select · Esc Close</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {results.length > 0 && (
              <button
                type="button"
                onClick={handleRerank}
                disabled={reranking}
                style={{ background: "transparent", border: "none", color: "var(--accent-color)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Brain size={12} />
                {reranking ? "Reranking..." : "Rerank with AI"}
              </button>
            )}
            {rerankedIds ? <span style={{ color: "var(--accent-color)" }}>AI Reranked</span> : <span>384D Vector + Full-Text</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
