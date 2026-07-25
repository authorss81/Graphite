import { useState, useEffect } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { editorStateToMarkdown, editorStateToHtml, downloadAsFile, printDocument } from "../utils/exportDoc";
import { RotateCcw, Share2, Sparkles, Puzzle, Users, ShieldCheck, FileText, Download } from "lucide-react";
import { PresenceIndicator } from "./PresenceIndicator";

interface AppHeaderProps {
  currentTitle: string;
  onOpenModal: (modal: string) => void;
}

export function AppHeader({ currentTitle, onOpenModal }: AppHeaderProps) {
  const docId = useNoteStore((s) => s.docId);
  const editorState = useNoteStore((s) => s.editorState);
  const documents = useNoteStore((s) => s.documents);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    const handleClick = () => setShowExportMenu(false);
    if (showExportMenu) {
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }
  }, [showExportMenu]);

  const handleExport = (format: "markdown" | "html" | "html-print") => {
    setShowExportMenu(false);
    if (!editorState) return;
    const title = documents[docId]?.title || "Untitled";
    if (format === "markdown") {
      const md = editorStateToMarkdown(editorState);
      downloadAsFile(md, `${title}.md`, "text/markdown");
    } else if (format === "html") {
      const html = editorStateToHtml(editorState, title);
      downloadAsFile(html, `${title}.html`, "text/html");
    } else if (format === "html-print") {
      const html = editorStateToHtml(editorState, title);
      printDocument(html);
    }
  };

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--border-color)",
        paddingBottom: "16px",
        overflowX: "auto",
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-heading)",
            fontSize: "28px",
            background: "linear-gradient(to right, #c084fc, #818cf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Graphite Studio
        </h1>
        <p
          style={{
            margin: "4px 0 0 0",
            color: "var(--text-secondary)",
            fontSize: "14px",
          }}
        >
          {currentTitle}
        </p>
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <PresenceIndicator />
        <button
          className="graphite-btn active"
          onClick={() => onOpenModal("aiPanel")}
          title="Graphite AI Assistant Side Panel"
          style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "#fff", border: "none" }}
        >
          <Sparkles size={16} />
          AI Assistant
        </button>
        <button
          className="graphite-btn"
          onClick={() => onOpenModal("search")}
          title="AI Semantic Search (Ctrl+K)"
        >
          <Sparkles size={16} />
          AI Search
        </button>
        <button
          className="graphite-btn"
          onClick={() => onOpenModal("templates")}
          title="Templates Gallery"
        >
          <FileText size={16} />
          Templates
        </button>
        <button
          className="graphite-btn"
          onClick={() => onOpenModal("history")}
          title="Version History & Git Commits"
        >
          <RotateCcw size={16} />
          History
        </button>
        <button
          className="graphite-btn"
          onClick={() => onOpenModal("plugins")}
          title="Plugin Marketplace & Extensions"
        >
          <Puzzle size={16} />
          Plugins
        </button>
        <button
          className="graphite-btn"
          onClick={() => onOpenModal("team")}
          title="Team Workspace, Members & Comments"
        >
          <Users size={16} />
          Team
        </button>
        <button
          className="graphite-btn"
          onClick={() => onOpenModal("security")}
          title="Security, Encryption & Audit Log"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none" }}
        >
          <ShieldCheck size={16} />
          Security
        </button>
        <div style={{ position: "relative" }}>
          <button className="graphite-btn" onClick={() => setShowExportMenu((p) => !p)} title="Export document" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", border: "none" }}>
            <Download size={16} />
            Export
          </button>
          {showExportMenu && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 999, minWidth: "160px", overflow: "hidden" }}>
              <button onClick={() => handleExport("markdown")} style={{ width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}><FileText size={14} /> Markdown (.md)</button>
              <button onClick={() => handleExport("html")} style={{ width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}><FileText size={14} /> HTML (.html)</button>
              <button onClick={() => handleExport("html-print")} style={{ width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}><FileText size={14} /> Print / PDF</button>
            </div>
          )}
        </div>
        <button className="graphite-btn" onClick={() => onOpenModal("publish")} style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none" }}>
          <Share2 size={16} />
          Publish
        </button>
      </div>
    </header>
  );
}
