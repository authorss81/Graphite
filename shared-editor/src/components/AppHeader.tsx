import { memo, useState, useEffect } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { editorStateToMarkdown, editorStateToHtml, downloadAsFile, printDocument } from "../utils/exportDoc";
import { RotateCcw, Share2, Sparkles, Puzzle, Users, ShieldCheck, FileText, Download, Menu, MoreVertical, Search, ChevronDown, ChevronUp } from "lucide-react";
import { PresenceIndicator } from "./PresenceIndicator";

interface AppHeaderProps {
  currentTitle: string;
  onOpenModal: (modal: string) => void;
  onToggleSidebar?: () => void;
}

export const AppHeader = memo(function AppHeader({ currentTitle, onOpenModal, onToggleSidebar }: AppHeaderProps) {
  const docId = useNoteStore((s) => s.docId);
  const editorState = useNoteStore((s) => s.editorState);
  const documents = useNoteStore((s) => s.documents);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(
    () => localStorage.getItem("graphite_header_collapsed") === "true"
  );

  const toggleHeaderCollapse = () => {
    const next = !isHeaderCollapsed;
    setIsHeaderCollapsed(next);
    localStorage.setItem("graphite_header_collapsed", String(next));
  };

  useEffect(() => {
    if (!showExportMenu && !showMobileDropdown) return;
    const handleClick = () => {
      setShowExportMenu(false);
      setShowMobileDropdown(false);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [showExportMenu, showMobileDropdown]);

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
    <header className={`graphite-header${isHeaderCollapsed ? " graphite-header-collapsed" : ""}`}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          className="sidebar-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleSidebar) onToggleSidebar();
          }}
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="header-title">Graphite Studio</h1>
          <p className="header-subtitle">{currentTitle}</p>
        </div>
      </div>

      {/* Header collapse toggle — visible on desktop only */}
      <button
        className="header-collapse-btn desktop-only"
        onClick={toggleHeaderCollapse}
        title={isHeaderCollapsed ? "Expand header buttons" : "Collapse header buttons"}
        style={{ marginLeft: "auto", marginRight: "8px" }}
      >
        {isHeaderCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {/* Desktop Buttons Container */}
      <div className="desktop-header-buttons">
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
          onClick={() => onOpenModal("quickSearch")}
          title="Quick Search (Ctrl+K)"
        >
          <Search size={16} />
          Search
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
          <button type="button" className="graphite-btn" onClick={(e) => { e.stopPropagation(); setShowExportMenu((p) => !p); }} title="Export document" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", border: "none" }}>
            <Download size={16} />
            Export
          </button>
          {showExportMenu && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 999, minWidth: "160px", overflow: "hidden" }}>
              <button onClick={() => handleExport("markdown")} style={{ width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}><FileText size={14} /> Markdown (.md)</button>
              <button onClick={() => handleExport("html")} style={{ width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}><FileText size={14} /> HTML (.html)</button>
              <button onClick={() => handleExport("html-print")} style={{ width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}><FileText size={14} /> Print / PDF</button>
            </div>
          )}
        </div>
        <button className="graphite-btn" onClick={() => onOpenModal("publish")} style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none" }}>
          <Share2 size={16} />
          Publish
        </button>
      </div>

      {/* Mobile Buttons Container */}
      <div className="mobile-header-buttons">
        <PresenceIndicator />
        <button
          className="graphite-btn icon-only"
          onClick={() => onOpenModal("quickSearch")}
          title="Quick Search"
        >
          <Search size={18} />
        </button>
        <button
          className="graphite-btn icon-only active"
          onClick={() => onOpenModal("aiPanel")}
          title="AI Assistant"
          style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "#fff", border: "none" }}
        >
          <Sparkles size={18} />
        </button>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="graphite-btn icon-only"
            onClick={(e) => { e.stopPropagation(); setShowMobileDropdown((p) => !p); }}
            title="More Actions"
          >
            <MoreVertical size={18} />
          </button>
          {showMobileDropdown && (
            <div className="mobile-action-dropdown">
              <button onClick={() => onOpenModal("templates")}><FileText size={14} /> Templates</button>
              <button onClick={() => onOpenModal("history")}><RotateCcw size={14} /> History</button>
              <button onClick={() => onOpenModal("plugins")}><Puzzle size={14} /> Plugins</button>
              <button onClick={() => onOpenModal("team")}><Users size={14} /> Team</button>
              <button onClick={() => onOpenModal("security")}><ShieldCheck size={14} /> Security</button>
              <button onClick={() => onOpenModal("publish")}><Share2 size={14} /> Publish</button>
              <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "4px 0" }} />
              <button onClick={() => handleExport("markdown")}><Download size={14} /> Export Markdown</button>
              <button onClick={() => handleExport("html")}><Download size={14} /> Export HTML</button>
              <button onClick={() => handleExport("html-print")}><Download size={14} /> Print / PDF</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});
