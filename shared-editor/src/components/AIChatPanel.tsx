import { useState, useMemo } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { queryLocalLLM, autoSuggestTags, suggestSmartBacklinks } from "../utils/aiService";
import { toast } from "./Toast";
import { Sparkles, Bot, Send, X, Copy, PlusCircle, Link2, Tag, CheckSquare, FileText } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AIChatPanel({ isOpen, onClose }: Props) {
  const docId = useNoteStore((s) => s.docId);
  const documents = useNoteStore((s) => s.documents);
  const addTagToDocument = useNoteStore((s) => s.addTagToDocument);
  const updateCurrentContent = useNoteStore((s) => s.updateCurrentContent);

  const currentDoc = documents[docId];
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([
    { sender: "ai", text: "Hello! I am your local Graphite AI Assistant. How can I help with your notes today?" },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const suggestedBacklinks = useMemo(() => {
    if (!currentDoc) return [];
    return suggestSmartBacklinks(currentDoc.editorState, documents);
  }, [currentDoc, documents]);

  if (!isOpen || !currentDoc) return null;

  const handleSendPrompt = async (promptText?: string) => {
    const text = (promptText || inputPrompt).trim();
    if (!text || isLoading) return;

    setInputPrompt("");
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setIsLoading(true);

    try {
      const response = await queryLocalLLM(text, currentDoc.editorState);
      setMessages((prev) => [...prev, { sender: "ai", text: response }]);
    } catch {
      toast("Failed to query AI engine", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoTag = () => {
    const tags = autoSuggestTags(currentDoc.editorState);
    tags.forEach((t) => addTagToDocument(docId, t));
    toast(`AI added tags: #${tags.join(" #")}`, "success");
  };

  const handleAppendToNote = (text: string) => {
    const currentText = currentDoc.editorState || "";
    updateCurrentContent(currentText + "\n\n" + text, currentDoc.canvasData);
    toast("Inserted AI output into note!", "success");
  };

  return (
    <div
      className="graphite-modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        className="graphite-ai-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "420px",
          height: "100%",
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border-color)",
          boxShadow: "-12px 0 36px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} color="var(--accent-color)" />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
              Graphite AI Assistant
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* Quick Action Chips */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-color)", display: "flex", flexWrap: "wrap", gap: "6px", background: "rgba(0,0,0,0.1)" }}>
          <button
            type="button"
            onClick={() => handleSendPrompt("Summarize this note in 3 key bullet points")}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "12px", fontSize: "11px", color: "var(--text-secondary)", cursor: "pointer" }}
          >
            <FileText size={12} /> Summarize
          </button>
          <button
            type="button"
            onClick={() => handleSendPrompt("Generate action items checklist from this note")}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "12px", fontSize: "11px", color: "var(--text-secondary)", cursor: "pointer" }}
          >
            <CheckSquare size={12} /> Action Items
          </button>
          <button
            type="button"
            onClick={handleAutoTag}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "12px", fontSize: "11px", color: "var(--text-secondary)", cursor: "pointer" }}
          >
            <Tag size={12} /> Auto-Tag
          </button>
        </div>

        {/* Smart Backlinks Box */}
        {suggestedBacklinks.length > 0 && (
          <div style={{ padding: "10px 16px", background: "rgba(99, 102, 241, 0.08)", borderBottom: "1px solid var(--border-color)", fontSize: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "var(--accent-color)", marginBottom: "4px" }}>
              <Link2 size={13} /> AI Smart Link Suggestions:
            </div>
            {suggestedBacklinks.map((link) => (
              <button
                key={link.docId}
                type="button"
                onClick={() => handleAppendToNote(`[[${link.title}]]`)}
                style={{ display: "block", textAlign: "left", background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: "11px", marginBottom: "2px" }}
              >
                + Link to <strong>[[{link.title}]]</strong>
              </button>
            ))}
          </div>
        )}

        {/* Message Stream */}
        <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: m.sender === "user" ? "var(--accent-color)" : "var(--bg-tertiary)",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: "12px",
                fontSize: "13px",
                lineHeight: "1.4",
                whiteSpace: "pre-wrap",
              }}
            >
              <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                {m.sender === "ai" && <Bot size={12} />} {m.sender === "user" ? "You" : "Graphite AI"}
              </div>
              {m.text}
              {m.sender === "ai" && i > 0 && (
                <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleAppendToNote(m.text)}
                    style={{ background: "transparent", border: "none", color: "var(--accent-color)", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <PlusCircle size={12} /> Insert to Note
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(m.text); toast("Copied!", "info"); }}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div style={{ alignSelf: "flex-start", fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
              Graphite AI is thinking...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="Ask AI about this note..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendPrompt()}
            style={{
              flex: 1,
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "13px",
            }}
          />
          <button
            type="button"
            className="graphite-btn active"
            onClick={() => handleSendPrompt()}
            style={{ background: "var(--accent-color)", color: "#fff", border: "none" }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
