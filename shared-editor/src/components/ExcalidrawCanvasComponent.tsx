import { Suspense, lazy, useCallback, useMemo, useRef, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, $createParagraphNode } from "lexical";
import { $isCanvasNode, type CanvasData } from "./CanvasNode";
import { CanvasBrushPresets } from "./CanvasBrushPresets";
import { CanvasLibraryImport } from "./CanvasLibraryImport";

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
);

const LIBRARY_KEY = "graphite_excalidraw_library";

function loadLibrary(): any[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLibrary(items: any[]) {
  try {
    if (!Array.isArray(items)) return;
    const valid = items.slice(0, 500).filter(item => item && typeof item === "object");
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(valid));
  } catch {}
}

interface Props {
  nodeKey: string;
  data: CanvasData;
}

const SHAPE_TOOLS = new Set(["rectangle", "diamond", "ellipse", "arrow", "line", "freedraw"]);

const BRUSH_PROPS = [
  "viewBackgroundColor",
  "currentItemStrokeColor",
  "currentItemBackgroundColor",
  "currentItemFillStyle",
  "currentItemStrokeWidth",
  "currentItemStrokeStyle",
  "currentItemRoughness",
  "currentItemOpacity",
  "currentItemFontFamily",
  "currentItemFontSize",
  "currentItemTextAlign",
  "currentItemRoundness",
  "currentItemArrowType",
] as const;

function pickBrushState(appState: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of BRUSH_PROPS) {
    if (appState?.[k] !== undefined) out[k] = appState[k];
  }
  return out;
}

export function ExcalidrawCanvasComponent({ nodeKey, data }: Props) {
  const [editor] = useLexicalComposerContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeKeyRef = useRef(nodeKey);
  nodeKeyRef.current = nodeKey;
  const excalidrawAPIRef = useRef<any>(null);
  const [apiReady, setApiReady] = useState(false);
  const libraryLoadedRef = useRef(false);
  const lastShapeToolRef = useRef<string | null>(null);
  const prevElementCountRef = useRef<number>(data?.elements?.length || 0);

  const stateRef = useRef<{
    elements: any[];
    files: any;
    appState: Record<string, any>;
    timestamp: number;
  } | null>(null);
  const isDrawingRef = useRef(false);
  const commitLaterRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handlePointerDown = () => {
      isDrawingRef.current = true;
      if (excalidrawAPIRef.current?.getAppState) {
        const tool = excalidrawAPIRef.current.getAppState().activeTool;
        if (tool?.type && tool.type !== "selection") {
          lastShapeToolRef.current = tool.type;
        }
      }
    };

    const handlePointerUp = () => {
      if (isDrawingRef.current && commitLaterRef.current) {
        if (stateRef.current) {
          const currentData = stateRef.current;
          editor.update(() => {
            const node = $getNodeByKey(nodeKeyRef.current);
            if ($isCanvasNode(node)) {
              node.setData(currentData);
            }
          });
        }
        commitLaterRef.current = false;
      }
      isDrawingRef.current = false;
    };

    const handlePointerLeave = () => {
      if (isDrawingRef.current && commitLaterRef.current) {
        if (stateRef.current) {
          const currentData = stateRef.current;
          editor.update(() => {
            const node = $getNodeByKey(nodeKeyRef.current);
            if ($isCanvasNode(node)) {
              node.setData(currentData);
            }
          });
        }
        commitLaterRef.current = false;
      }
      isDrawingRef.current = false;
    };

    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("pointerup", handlePointerUp);
    el.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointerup", handlePointerUp);
      el.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [editor]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const savedLibrary = useMemo(() => loadLibrary(), []);

  useEffect(() => {
    if (excalidrawAPIRef.current && !libraryLoadedRef.current && savedLibrary.length > 0) {
      libraryLoadedRef.current = true;
      excalidrawAPIRef.current.updateLibrary({
        libraryItems: savedLibrary,
      });
    }
  }, [savedLibrary]);

  const initialCanvasData = useMemo(() => {
    const brush = pickBrushState(data?.appState);
    return {
      elements: data?.elements || [],
      files: data?.files || undefined,
      libraryItems: savedLibrary,
      appState: {
        viewBackgroundColor: data?.appState?.viewBackgroundColor || "#1e1e24",
        ...brush,
      },
      scrollToContent: true,
    };
  }, [data, savedLibrary]);

  const onChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      const prevCount = prevElementCountRef.current;
      const newCount = elements.length;
      prevElementCountRef.current = newCount;

      if (newCount > prevCount) {
        const tool = lastShapeToolRef.current;
        if (tool && SHAPE_TOOLS.has(tool)) {
          requestAnimationFrame(() => {
            excalidrawAPIRef.current?.setActiveTool({ type: tool });
          });
        }
      }

      const brush = pickBrushState(appState);
      stateRef.current = {
        elements: [...elements],
        files,
        appState: {
          ...brush,
          viewBackgroundColor: appState?.viewBackgroundColor || "#1e1e24",
        },
        timestamp: Date.now()
      };

      if (isDrawingRef.current) {
        commitLaterRef.current = true;
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (stateRef.current) {
            const currentData = stateRef.current;
            editor.update(() => {
              const node = $getNodeByKey(nodeKeyRef.current);
              if ($isCanvasNode(node)) {
                node.setData(currentData);
              }
            });
          }
        }, 200);
      }
    },
    [editor],
  );

  const handleLibraryChange = useCallback((libraryItems: any[]) => {
    saveLibrary(libraryItems);
  }, []);

  const generateIdForFile = useCallback((file: File) => {
    return `file_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const uiOptions = useMemo(() => ({
    canvasActions: {
      loadScene: false,
      saveToActiveFile: false,
      export: false as const,
      saveAsImage: true,
    },
    tools: {
      image: true,
    },
  }), []);

  const insertParagraphBelow = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKeyRef.current);
      if (node) {
        const p = $createParagraphNode();
        node.insertAfter(p);
        p.select();
      }
    });
  }, [editor]);

  return (
    <div
      ref={containerRef}
      className="graphite-canvas-block"
      contentEditable={false}
      style={{
        height: 400,
        margin: "12px 0",
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        background: "#1e1e24",
      }}
    >
      <Suspense
        fallback={
          <div className="graphite-canvas-block-loading">Loading canvas…</div>
        }
      >
        <Excalidraw
          theme="dark"
          excalidrawAPI={(api) => { excalidrawAPIRef.current = api; setApiReady(true); }}
          initialData={initialCanvasData}
          onChange={onChange}
          onLibraryChange={handleLibraryChange}
          generateIdForFile={generateIdForFile}
          UIOptions={uiOptions}
          detectScroll={true}
        />
      </Suspense>
      <div
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          zIndex: 100,
          display: "flex",
          gap: 6,
          alignItems: "center",
        }}
      >
        {apiReady && (
          <>
            <CanvasLibraryImport excalidrawAPI={excalidrawAPIRef.current} />
            <CanvasBrushPresets excalidrawAPI={excalidrawAPIRef.current} />
          </>
        )}
        <button
          type="button"
          className="graphite-canvas-exit-btn"
          title="Continue writing text below canvas"
          onClick={insertParagraphBelow}
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          ↓ Write Below
        </button>
      </div>
    </div>
  );
}
