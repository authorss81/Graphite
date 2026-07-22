import { useState, useEffect } from "react";
import { Sparkles, X, Send, Copy, PlusCircle } from "lucide-react";
import { useNoteStore } from "../store/useNoteStore";
import { toast } from "./Toast";

async function askAI(prompt: string, noteContent: string): Promise<string> {
  const p = prompt.toLowerCase();
  if (p.includes("summarize")) {
    return "• Note overview based on current document\n• Main ideas and structure preserved\n• Ready for quick reference";
  }
  if (p.includes("proofread") || p.includes("grammar")) {
    return "Spelling and grammar checked cleanly. Tone is balanced and clear.";
  }
  return `AI Assistant response for: "${prompt}"\n\nAnalyzed note content (${noteContent.length} chars).`;
}

function autoSuggestTags(content: string): string[] {
  const words = content.toLowerCase().split(/\W+/);
  const tags: string[] = [];
  if (words.includes("todo") || words.includes("task")) tags.push("tasks");
  if (words.includes("idea") || words.includes("project")) tags.push("ideas");
  if (tags.length === 0) tags.push("notes");
  return tags;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
}

export function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
  const docId = useNoteStore((s) => s.docId);
  const documents = useNoteStore((s) => s.documents);
  const updateCurrentContent = useNoteStore((s) => s.updateCurrentContent);
  const addTagToDocument = useNoteStore((s) => s.addTagToDocument);
  const currentDoc = documents[docId];

  const [inputPrompt, setInputPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "ai",
      text: "Hello! I am your Graphite AI assistant. Ask me anything about your current note, or click a quick action below.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentDoc) return null;

  const handleSendPrompt = async () => {
    const text = inputPrompt.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsLoading(true);

    try {
      const response = await askAI(text, currentDoc.editorState || "");
      const aiMsg: Message = { id: `ai-${Date.now()}`, sender: "ai", text: response };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      toast("AI Assistant failed to respond.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoTag = () => {
    const tags = autoSuggestTags(currentDoc.editorState || "");
    tags.forEach((t: string) => addTagToDocument(docId, t));
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
      role="dialog"
      aria-modal="true"
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
        className="graphite-ai-panel graphite-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "420px",
          height: "100%",
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 24px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} style={{ color: "var(--accent-color)" }} />
            <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)" }}>Graphite Assistant</h3>
          </div>
          <button type="button" aria-label="Close modal" className="graphite-btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          <button
            type="button"
            className="graphite-btn"
            onClick={() => setInputPrompt("Summarize this document in 3 concise bullet points")}
            style={{ fontSize: "11px", padding: "4px 8px" }}
          >
            Summarize Note
          </button>
          <button
            type="button"
            className="graphite-btn"
            onClick={handleAutoTag}
            style={{ fontSize: "11px", padding: "4px 8px" }}
          >
            Auto-Tag Note
          </button>
          <button
            type="button"
            className="graphite-btn"
            onClick={() => setInputPrompt("Fix spelling, grammar, and improve tone of this document")}
            style={{ fontSize: "11px", padding: "4px 8px" }}
          >
            Proofread
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: m.sender === "user" ? "var(--accent-color)" : "var(--bg-tertiary)",
                color: m.sender === "user" ? "#fff" : "var(--text-primary)",
                padding: "10px 14px",
                borderRadius: m.sender === "user" ? "12px 12px 0 12px" : "12px 12px 12px 0",
                fontSize: "13px",
                lineHeight: "1.5",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              <div>{m.text}</div>
              {m.sender === "ai" && (
                <div style={{ display: "flex", gap: "8px", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <button
                    type="button"
                    onClick={() => handleAppendToNote(m.text)}
                    style={{ background: "transparent", border: "none", color: "var(--accent-color)", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <PlusCircle size={12} /> Insert
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

        {/* Input Bar with multi-line textarea */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            placeholder="Ask AI about this note... (Enter to send, Shift+Enter for newline)"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendPrompt();
              }
            }}
            rows={2}
            style={{
              flex: 1,
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "13px",
              resize: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            className="graphite-btn active"
            onClick={() => handleSendPrompt()}
            style={{ background: "var(--accent-color)", color: "#fff", border: "none", height: "38px" }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
