import { useEffect } from "react";
import { Editor } from "./components/Editor";
import { Canvas } from "./components/Canvas";
import { logToNative, decodeBase64 } from "./utils/bridge";
import { useNoteStore } from "./store/useNoteStore";
import { BookOpen, Palette, Info, RotateCcw, Share2 } from "lucide-react";

export function App() {
  const docId = useNoteStore((s) => s.docId);
  const editorState = useNoteStore((s) => s.editorState);
  const canvasData = useNoteStore((s) => s.canvasData);
  const activeTab = useNoteStore((s) => s.activeTab);
  const wordCount = useNoteStore((s) => s.wordCount);
  const charCount = useNoteStore((s) => s.charCount);
  const backlinks = useNoteStore((s) => s.backlinks);
  const gitStatus = useNoteStore((s) => s.gitStatus);
  const setDocId = useNoteStore((s) => s.setDocId);
  const setEditorState = useNoteStore((s) => s.setEditorState);
  const setCanvasData = useNoteStore((s) => s.setCanvasData);
  const setActiveTab = useNoteStore((s) => s.setActiveTab);
  const setGitStatus = useNoteStore((s) => s.setGitStatus);

  useEffect(() => {
    const handleLoadDocument = (id: string, payloadBase64: string) => {
      try {
        const decoded = decodeBase64(payloadBase64);
        setDocId(id);
        setEditorState(decoded);
        logToNative("info", `Document loaded: ${id}`);
      } catch (err: any) {
        logToNative("error", `Failed to load document: ${err.message}`);
      }
    };

    const handleReceiveUpdate = (id: string, payloadBase64: string) => {
      if (id !== useNoteStore.getState().docId) return;
      try {
        const decoded = decodeBase64(payloadBase64);
        setEditorState(decoded);
        logToNative("info", `Document sync received: ${id}`);
      } catch (err: any) {
        logToNative("error", `Failed to merge update: ${err.message}`);
      }
    };

    window.loadDocument = handleLoadDocument;
    window.receiveUpdateFromNative = handleReceiveUpdate;

    logToNative("info", "Graphite webview interface fully initialized.");

    return () => {
      delete (window as any).loadDocument;
      delete (window as any).receiveUpdateFromNative;
    };
  }, [setDocId, setEditorState]);

  const handleCanvasChange = (data: any) => {
    setCanvasData(data);
  };

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "16px",
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
            Document:{" "}
            <code
              style={{
                fontSize: "12px",
                color: "var(--accent-color)",
              }}
            >
              {docId}
            </code>
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="graphite-btn"
            onClick={() => setGitStatus("Backup requested")}
          >
            <RotateCcw size={16} />
            Backup
          </button>
          <button className="graphite-btn">
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
        }}
      >
        <button
          className="graphite-btn"
          style={{
            background:
              activeTab === "editor"
                ? "var(--accent-color)"
                : "rgba(255,255,255,0.03)",
            color:
              activeTab === "editor"
                ? "#fff"
                : "var(--text-secondary)",
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
              activeTab === "meta"
                ? "var(--accent-color)"
                : "rgba(255,255,255,0.03)",
            color:
              activeTab === "meta" ? "#fff" : "var(--text-secondary)",
          }}
          onClick={() => setActiveTab("meta")}
        >
          <Info size={18} />
          Info
        </button>
      </nav>

      <main style={{ minHeight: "450px" }}>
        {activeTab === "editor" && (
          <Editor docId={docId} initialState={editorState} />
        )}

        {activeTab === "canvas" && (
          <Canvas initialData={canvasData} onChange={handleCanvasChange} />
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
                  No internal page links found. Try typing [[Page Title]] in the
                  editor.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
