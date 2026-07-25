import { useEffect, useReducer, lazy, Suspense } from "react";
import { Editor } from "./components/Editor";
import { Sidebar } from "./components/Sidebar";
import { AuthScreen } from "./components/AuthScreen";
import { ToastContainer, toast } from "./components/Toast";
import { logToNative, decodeBase64 } from "./utils/bridge";
import { saveDocs } from "./utils/docStorage";
import { useNoteStore } from "./store/useNoteStore";
import { useAuthStore } from "./store/useAuthStore";
import { GraphView } from "./components/GraphView";
import { SpatialCanvas } from "./components/SpatialCanvas";
import { KanbanBoard } from "./components/KanbanBoard";
import { PluginMarketplaceModal } from "./components/PluginMarketplaceModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ModalManager } from "./components/ModalManager";
import { QuickOpenModal } from "./components/QuickOpenModal";
import { KeyboardCheatsheetModal } from "./components/KeyboardCheatsheetModal";
import { SearchDialog } from "./components/SearchDialog";
import { TemplatesGalleryModal } from "./components/TemplatesGalleryModal";
import { AppHeader } from "./components/AppHeader";
import { AppNav } from "./components/AppNav";
import { AppBottomNav } from "./components/AppBottomNav";
import { InfoTab } from "./components/InfoTab";
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

  useEffect(() => {
    const handler = () => openModal("aiPanel");
    window.addEventListener("graphite:open-ai-panel", handler);
    return () => window.removeEventListener("graphite:open-ai-panel", handler);
  }, []);

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
        <AppHeader currentTitle={currentTitle} onOpenModal={openModal} />
        <AppNav activeTab={activeTab} onSetActiveTab={setActiveTab} />
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

          {activeTab === "meta" && <InfoTab />}
          {activeTab === "kanban" && <KanbanBoard />}
        </main>
      </div>
      <AppBottomNav activeTab={activeTab} onSetActiveTab={setActiveTab} />
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
