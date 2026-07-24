import { useEffect, useReducer, useState, lazy, Suspense } from "react";
import { Editor } from "./components/Editor";
import { Sidebar } from "./components/Sidebar";
import { AuthScreen } from "./components/AuthScreen";
import { ToastContainer, toast } from "./components/Toast";
import { logToNative, decodeBase64 } from "./utils/bridge";
import { saveDocs } from "./utils/docStorage";
import { useNoteStore } from "./store/useNoteStore";
import { useAuthStore } from "./store/useAuthStore";
import { BookOpen, Palette, Info, RotateCcw, Share2, Network, Sparkles, LayoutGrid, Puzzle, Users, ShieldCheck, Columns3, FileText, Download } from "lucide-react";
import { GraphView } from "./components/GraphView";
import { SpatialCanvas } from "./components/SpatialCanvas";
import { KanbanBoard } from "./components/KanbanBoard";
import { PluginMarketplaceModal } from "./components/PluginMarketplaceModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ModalManager } from "./components/ModalManager";
import { QuickOpenModal } from "./components/QuickOpenModal";
import { KeyboardCheatsheetModal } from "./components/KeyboardCheatsheetModal";
import { TableOfContents } from "./components/TableOfContents";
import { DailyJournal } from "./components/DailyJournal";
import { SearchDialog } from "./components/SearchDialog";
import { MetadataEditor } from "./components/MetadataEditor";
import { TemplatesGalleryModal } from "./components/TemplatesGalleryModal";
import { editorStateToMarkdown, editorStateToHtml, downloadAsFile, printDocument } from "./utils/exportDoc";
import { indexDocument } from "./utils/searchIndex";

import { applyPluginEffects } from "./utils/pluginSystem";

const Canvas = lazy(() =>
  import("./components/Canvas").then((m) => ({ default: m.Canvas })),
);

export function App() {
  const docId = useNoteStore((s) => s.docId);
  const editorState = useNoteStore((s) => s.editorState);
  const canvasData = useNoteStore((s) => s.canvasData);
  const activeTab = useNoteStore((s) => s.activeTab);
  const wordCount = useNoteStore((s) => s.wordCount);
  const charCount = useNoteStore((s) => s.charCount);
  const backlinks = useNoteStore((s) => s.backlinks);
  const gitStatus = useNoteStore((s) => s.gitStatus);
  const documents = useNoteStore((s) => s.documents);
  const setActiveTab = useNoteStore((s) => s.setActiveTab);
  const initDocs = useNoteStore((s) => s.initDocs);

  const isInitializing = useAuthStore((s) => s.isInitializing);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initializeAuth = useAuthStore((s) => s.initialize);

  type ModalAction = { modal: string; open: boolean };
  const [modals, dispatch] = useReducer(
    (state: Record<string, boolean>, action: ModalAction) => ({ ...state, [action.modal]: action.open }),
    { search: false, publish: false, history: false, aiPanel: false, plugins: false, team: false, security: false, quickOpen: false, cheatsheet: false, templates: false }
  );
  const isPluginModalOpen = modals.plugins;
  const openModal = (modal: string) => dispatch({ modal, open: true });
  const closeModal = (modal: string) => dispatch({ modal, open: false });
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    const handler = () => openModal("aiPanel");
    window.addEventListener("graphite:open-ai-panel", handler);
    return () => window.removeEventListener("graphite:open-ai-panel", handler);
  }, []);

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

  useEffect(() => {
    const handleClick = () => setShowExportMenu(false);
    if (showExportMenu) {
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }
  }, [showExportMenu]);

  useEffect(() => {
    // Track keyboard height for mobile via visualViewport API
    const handleViewportResize = () => {
      const vv = window.visualViewport;
      if (vv) {
        const offset = window.innerHeight - vv.height;
        document.documentElement.style.setProperty("--keyboard-height", `${Math.max(0, offset)}px`);
      }
    };
    window.visualViewport?.addEventListener("resize", handleViewportResize);
    handleViewportResize();

    applyPluginEffects();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        dispatch({ modal: "search", open: true });
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        dispatch({ modal: "quickOpen", open: true });
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const active = document.activeElement;
        if (!active || active === document.body) {
          e.preventDefault();
          dispatch({ modal: "cheatsheet", open: true });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
    };
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    initDocs();
  }, [initDocs]);

  useEffect(() => {
    const handleLoadDocument = (id: string, payloadBase64: string) => {
      try {
        const decoded = decodeBase64(payloadBase64);
        const st = useNoteStore.getState();
        if (!st.documents[id]) {
          const nextDocs = {
            ...st.documents,
            [id]: {
              id,
              title: "Imported",
              isFolder: false,
              parentId: null,
              updatedAt: Date.now(),
              editorState: decoded,
              canvasData: null,
            },
          };
          saveDocs(nextDocs);
          st.selectDocument(id);
        } else {
          st.selectDocument(id);
          st.updateCurrentContent(decoded);
        }
        logToNative("info", `Document loaded: ${id}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        logToNative("error", `Failed to load document: ${msg}`);
        toast(`Failed to load document: ${msg}`, "error");
      }
    };

    const handleReceiveUpdate = (id: string, payloadBase64: string) => {
      if (id !== useNoteStore.getState().docId) return;
      try {
        const decoded = decodeBase64(payloadBase64);
        useNoteStore.getState().updateCurrentContent(decoded);
        logToNative("info", `Document sync received: ${id}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        logToNative("error", `Failed to merge update: ${msg}`);
        toast(`Sync error: ${msg}`, "error");
      }
    };

    window.loadDocument = handleLoadDocument;
    window.receiveUpdateFromNative = handleReceiveUpdate;

    logToNative("info", "Graphite webview interface fully initialized.");

    return () => {
      delete (window as any).loadDocument;
      delete (window as any).receiveUpdateFromNative;
    };
  }, []);

  const handleCanvasChange = (data: any) => {
    useNoteStore.getState().updateCurrentContent(undefined, data);
  };

  // Auto-index documents for full-text search
  useEffect(() => {
    const docs = documents;
    for (const doc of Object.values(docs)) {
      if (doc.isFolder || doc.isArchived) continue;
      const plain = doc.editorState
        ? doc.editorState.replace(/<[^>]*>/g, "").replace(/\\n/g, " ")
        : "";
      indexDocument(doc.id, doc.title || "Untitled", plain, doc.tags || []);
    }
  }, [documents]);

  if (isInitializing) {
    return (
      <div className="auth-screen">
        <div className="auth-loading">
          <div className="auth-loading-spinner" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const currentTitle = documents[docId]?.title ?? "Untitled";

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
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
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="graphite-btn active"
              onClick={() => openModal("aiPanel")}
              title="Graphite AI Assistant Side Panel"
              style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "#fff", border: "none" }}
            >
              <Sparkles size={16} />
              AI Assistant
            </button>
            <button
              className="graphite-btn"
              onClick={() => openModal("search")}
              title="AI Semantic Search (Ctrl+K)"
            >
              <Sparkles size={16} />
              AI Search
            </button>
            <button
              className="graphite-btn"
              onClick={() => openModal("templates")}
              title="Templates Gallery"
            >
              <FileText size={16} />
              Templates
            </button>
            <button
              className="graphite-btn"
              onClick={() => openModal("history")}
              title="Version History & Git Commits"
            >
              <RotateCcw size={16} />
              History
            </button>
            <button
              className="graphite-btn"
              onClick={() => openModal("plugins")}
              title="Plugin Marketplace & Extensions"
            >
              <Puzzle size={16} />
              Plugins
            </button>
            <button
              className="graphite-btn"
              onClick={() => openModal("team")}
              title="Team Workspace, Members & Comments"
            >
              <Users size={16} />
              Team
            </button>
            <button
              className="graphite-btn"
              onClick={() => openModal("security")}
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
            <button className="graphite-btn" onClick={() => openModal("publish")} style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none" }}>
              <Share2 size={16} />
              Publish
            </button>
          </div>
        </header>

        <nav
          style={{
            display: "flex",
            gap: "12px",
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: "8px",
            marginTop: "16px",
          }}
        >
          <button
            className="graphite-btn"
            style={{
              background:
                activeTab === "editor"
                  ? "var(--accent-color)"
                  : "rgba(255,255,255,0.03)",
              color: activeTab === "editor" ? "#fff" : "var(--text-secondary)",
            }}
            onClick={() => setActiveTab("editor")}
          >
            <BookOpen size={18} />
            Editor
          </button>
          <button
            className="graphite-btn"
            style={{
              background:
                activeTab === "canvas"
                  ? "var(--accent-color)"
                  : "rgba(255,255,255,0.03)",
              color:
                activeTab === "canvas" ? "#fff" : "var(--text-secondary)",
            }}
            onClick={() => setActiveTab("canvas")}
          >
            <Palette size={18} />
            Canvas
          </button>
          <button
            className="graphite-btn"
            style={{
              background:
                activeTab === "split"
                  ? "var(--accent-color)"
                  : "rgba(255,255,255,0.03)",
              color:
                activeTab === "split" ? "#fff" : "var(--text-secondary)",
            }}
            onClick={() => setActiveTab("split")}
          >
            <Columns3 size={18} />
            Split
          </button>
          <button
            className="graphite-btn"
            style={{
              background:
                activeTab === "spatial"
                  ? "var(--accent-color)"
                  : "rgba(255,255,255,0.03)",
              color:
                activeTab === "spatial" ? "#fff" : "var(--text-secondary)",
            }}
            onClick={() => setActiveTab("spatial")}
          >
            <LayoutGrid size={18} />
            Spatial
          </button>
          <button
            className="graphite-btn"
            style={{
              background:
                activeTab === "graph"
                  ? "var(--accent-color)"
                  : "rgba(255,255,255,0.03)",
              color: activeTab === "graph" ? "#fff" : "var(--text-secondary)",
            }}
            onClick={() => setActiveTab("graph")}
          >
            <Network size={18} />
            Graph
          </button>
          <button
            className="graphite-btn"
            style={{
              background:
                activeTab === "meta"
                  ? "var(--accent-color)"
                  : "rgba(255,255,255,0.03)",
              color: activeTab === "meta" ? "#fff" : "var(--text-secondary)",
            }}
            onClick={() => setActiveTab("meta")}
          >
            <Info size={18} />
            Info
          </button>
        </nav>

        <main style={{ minHeight: "450px", marginTop: "16px" }}>
          {activeTab === "editor" && (
            <ErrorBoundary name="Editor">
              <Editor docId={docId} initialState={editorState} />
            </ErrorBoundary>
          )}

          {activeTab === "canvas" && (
            <Suspense
              fallback={
                <div className="graphite-canvas-block-loading">
                  Loading canvas…
                </div>
              }
            >
              <ErrorBoundary name="Canvas">
                <Canvas
                  initialData={canvasData}
                  onChange={handleCanvasChange}
                />
              </ErrorBoundary>
            </Suspense>
          )}

          {activeTab === "split" && (
            <div className="app-dual-pane">
              <ErrorBoundary name="Editor">
                <Editor docId={docId} initialState={editorState} />
              </ErrorBoundary>
              <Suspense
                fallback={
                  <div className="graphite-canvas-block-loading">
                    Loading canvas…
                  </div>
                }
              >
                <ErrorBoundary name="Canvas">
                  <Canvas
                    initialData={canvasData}
                    onChange={handleCanvasChange}
                  />
                </ErrorBoundary>
              </Suspense>
            </div>
          )}

          {activeTab === "graph" && (
            <ErrorBoundary name="GraphView">
              <GraphView />
            </ErrorBoundary>
          )}

          {activeTab === "spatial" && (
            <ErrorBoundary name="SpatialCanvas">
              <SpatialCanvas />
            </ErrorBoundary>
          )}

          {activeTab === "meta" && (
            <div
              className="graphite-editor-container"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <h2 style={{ margin: 0, fontFamily: "var(--font-heading)" }}>
                Analytics & Context
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    padding: "16px",
                    background: "var(--bg-tertiary)",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                    Words
                  </span>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      marginTop: "4px",
                    }}
                  >
                    {wordCount}
                  </div>
                </div>
                <div
                  style={{
                    padding: "16px",
                    background: "var(--bg-tertiary)",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                    Characters
                  </span>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      marginTop: "4px",
                    }}
                  >
                    {charCount}
                  </div>
                </div>
                <div
                  style={{
                    padding: "16px",
                    background: "var(--bg-tertiary)",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                    Git
                  </span>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      marginTop: "8px",
                      color: "var(--accent-success)",
                    }}
                  >
                    {gitStatus}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <h3
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "16px",
                    color: "var(--text-secondary)",
                  }}
                >
                  Detected Wiki Links
                </h3>
                {backlinks.length > 0 ? (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {backlinks.map((link, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: "4px 10px",
                          background: "rgba(129, 140, 248, 0.15)",
                          border: "1px solid rgba(129, 140, 248, 0.3)",
                          borderRadius: "6px",
                          fontSize: "13px",
                          color: "#a5b4fc",
                        }}
                      >
                        [[{link}]]
                      </span>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    No internal page links found. Try typing [[Page Title]] in
                    the editor.
                  </p>
                )}
              </div>
              <TableOfContents editorState={editorState} />
              <DailyJournal />
              <MetadataEditor docId={docId} />
            </div>
          )}
          {activeTab === "kanban" && <KanbanBoard />}
        </main>
      </div>
      <nav className="graphite-bottom-nav">
        <button className={`graphite-bottom-nav-btn${activeTab === "editor" ? " active" : ""}`} onClick={() => setActiveTab("editor")}><BookOpen size={20} /><span>Editor</span></button>
        <button className={`graphite-bottom-nav-btn${activeTab === "split" ? " active" : ""}`} onClick={() => setActiveTab("split")}><Columns3 size={20} /><span>Split</span></button>
        <button className={`graphite-bottom-nav-btn${activeTab === "canvas" ? " active" : ""}`} onClick={() => setActiveTab("canvas")}><Palette size={20} /><span>Canvas</span></button>
        <button className={`graphite-bottom-nav-btn${activeTab === "spatial" ? " active" : ""}`} onClick={() => setActiveTab("spatial")}><LayoutGrid size={20} /><span>Spatial</span></button>
        <button className={`graphite-bottom-nav-btn${activeTab === "graph" ? " active" : ""}`} onClick={() => setActiveTab("graph")}><Network size={20} /><span>Graph</span></button>
        <button className={`graphite-bottom-nav-btn${activeTab === "kanban" ? " active" : ""}`} onClick={() => setActiveTab("kanban")}><Columns3 size={20} /><span>Kanban</span></button>
        <button className={`graphite-bottom-nav-btn${activeTab === "meta" ? " active" : ""}`} onClick={() => setActiveTab("meta")}><Info size={20} /><span>Info</span></button>
      </nav>
      <ToastContainer />
      <ModalManager modals={modals} onCloseModal={closeModal} />
      <PluginMarketplaceModal isOpen={isPluginModalOpen} onClose={() => closeModal("plugins")} />
      <QuickOpenModal isOpen={modals.quickOpen} onClose={() => closeModal("quickOpen")} />
      <KeyboardCheatsheetModal isOpen={modals.cheatsheet} onClose={() => closeModal("cheatsheet")} />
      <SearchDialog open={modals.search} onClose={() => closeModal("search")} />
      <TemplatesGalleryModal isOpen={modals.templates} onClose={() => closeModal("templates")} />
    </div>
  );
}

export default App;
