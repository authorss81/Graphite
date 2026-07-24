import { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, X, Send, Copy, PlusCircle, Settings, Wand2, RotateCcw } from "lucide-react";
import { useNoteStore } from "../store/useNoteStore";
import { streamLLM, autoSuggestTags, rewriteText } from "../utils/aiService";
import { toast } from "./Toast";
import { AISettingsModal } from "./AISettingsModal";

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
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentDoc) return null;

  const getNoteText = () => currentDoc.editorState || "";

  const handleSendPrompt = async () => {
    const text = inputPrompt.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsLoading(true);

    try {
      const noteText = getNoteText();
      let fullResponse = "";
      const aiId = `ai-${Date.now()}`;
      const aiMsg: Message = { id: aiId, sender: "ai", text: "" };
      setMessages((prev) => [...prev, aiMsg]);

      for await (const chunk of streamLLM(text, noteText)) {
        fullResponse += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === aiId ? { ...m, text: fullResponse } : m))
        );
      }
    } catch {
      const aiMsg: Message = { id: `ai-${Date.now()}`, sender: "ai", text: "Sorry, I encountered an error processing your request." };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoTag = async () => {
    const tags = await autoSuggestTags("", currentDoc.editorState || "");
    tags.forEach((t: string) => addTagToDocument(docId, t));
    toast(`AI added tags: #${tags.join(" #")}`, "success");

    const aiMsg: Message = { id: `ai-${Date.now()}`, sender: "ai", text: `Added tags: ${tags.map((t) => `#${t}`).join(", ")}` };
    setMessages((prev) => [...prev, aiMsg]);
  };

  const handleAppendToNote = (text: string) => {
    const currentText = currentDoc.editorState || "";
    updateCurrentContent(currentText + "\n\n" + text, currentDoc.canvasData);
    toast("Inserted AI output into note!", "success");
  };

  const handleRewrite = async (instruction: string) => {
    const noteText = getNoteText();
    if (!noteText || noteText.length < 10) {
      toast("Note is too short to rewrite", "error");
      return;
    }

    setIsLoading(true);
    try {
      const rewritten = await rewriteText(noteText, instruction);
      if (rewritten && rewritten !== noteText) {
        const aiMsg: Message = { id: `ai-${Date.now()}`, sender: "ai", text: `Rewrite complete. Select "Insert" to apply the changes.\n\n---\n\n${rewritten}` };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch {
      toast("Rewrite failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplaceContent = (text: string) => {
    const mark = "---\n\n";
    const idx = text.indexOf(mark);
    const content = idx !== -1 ? text.slice(idx + mark.length) : text;
    updateCurrentContent(content, currentDoc.canvasData);
    toast("Replaced note content with AI output!", "success");
  };

  return (
    <>
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
            <div style={{ display: "flex", gap: "4px" }}>
              <button type="button" aria-label="AI Settings" className="graphite-btn-icon" onClick={() => setShowSettings(true)} title="AI Settings">
                <Settings size={16} />
              </button>
              <button type="button" aria-label="Close modal" className="graphite-btn-icon" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>

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
              Summarize
            </button>
            <button
              type="button"
              className="graphite-btn"
              onClick={handleAutoTag}
              style={{ fontSize: "11px", padding: "4px 8px" }}
            >
              Auto-Tag
            </button>
            <button
              type="button"
              className="graphite-btn"
              onClick={() => handleRewrite("Fix spelling and grammar, improve clarity and tone")}
              style={{ fontSize: "11px", padding: "4px 8px" }}
            >
              Proofread
            </button>
            <button
              type="button"
              className="graphite-btn"
              onClick={() => handleRewrite("Make this more concise and professional")}
              style={{ fontSize: "11px", padding: "4px 8px" }}
            >
              <RotateCcw size={11} style={{ marginRight: "3px" }} />
              Polish
            </button>
            <button
              type="button"
              className="graphite-btn"
              onClick={() => setInputPrompt("Expand on this document, add more details and examples")}
              style={{ fontSize: "11px", padding: "4px 8px" }}
            >
              <Wand2 size={11} style={{ marginRight: "3px" }} />
              Expand
            </button>
          </div>

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
                  whiteSpace: "pre-wrap",
                }}
              >
                <div>{m.text}</div>
                {m.sender === "ai" && m.id !== "init" && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <button
                      type="button"
                      onClick={() => handleAppendToNote(m.text)}
                      style={{ background: "transparent", border: "none", color: "var(--accent-color)", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <PlusCircle size={12} /> Append
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReplaceContent(m.text)}
                      style={{ background: "transparent", border: "none", color: "var(--accent-color)", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <PlusCircle size={12} /> Replace
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
                <span className="thinking-dots">Graphite AI is thinking</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

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
              onClick={handleSendPrompt}
              disabled={isLoading}
              style={{ background: "var(--accent-color)", color: "#fff", border: "none", height: "38px" }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
      <AISettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
