import { Suspense, lazy, useCallback, useMemo, useRef, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, $createParagraphNode } from "lexical";
import { $isCanvasNode, type CanvasData } from "./CanvasNode";

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
);

interface Props {
  nodeKey: string;
  data: CanvasData;
}

export function ExcalidrawCanvasComponent({ nodeKey, data }: Props) {
  const [editor] = useLexicalComposerContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeKeyRef = useRef(nodeKey);
  nodeKeyRef.current = nodeKey;

  // Stroke buffering state
  const stateRef = useRef<{
    elements: any[];
    files: any;
    appState: { viewBackgroundColor: string };
    timestamp: number;
  } | null>(null);
  const isDrawingRef = useRef(false);
  const commitLaterRef = useRef(false);



  // Track drawing state via pointer events on container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handlePointerDown = () => {
      isDrawingRef.current = true;
    };

    const handlePointerUp = () => {
      if (isDrawingRef.current && commitLaterRef.current) {
        // Commit the buffered state
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
        // Commit on leave as well
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

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const initialCanvasData = useMemo(() => ({
    elements: data?.elements || [],
    files: data?.files || undefined,
    appState: {
      viewBackgroundColor: data?.appState?.viewBackgroundColor || "#1e1e24",
    },
    scrollToContent: true,
  }), [data]);

  const onChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      // Buffer the latest update instead of debouncing for every mouse move
      // This prevents frame drops during drawing and defers actual commit
      stateRef.current = {
        elements: [...elements],
        files,
        appState: {
          viewBackgroundColor: appState?.viewBackgroundColor || "#1e1e24",
        },
        timestamp: Date.now()
      };
      
      // For drawing strokes, commit on pointerUp instead of during drag
      if (isDrawingRef.current) {
        commitLaterRef.current = true;
      } else {
        // For immediate updates (not drawing), commit with minimal debounce
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

  const uiOptions = useMemo(() => ({
    canvasActions: {
      loadScene: false,
      saveToActiveFile: false,
      export: false as const,
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
          initialData={initialCanvasData}
          onChange={onChange}
          UIOptions={uiOptions}
          detectScroll={true}
        />
      </Suspense>
      <button
        type="button"
        className="graphite-canvas-exit-btn"
        title="Continue writing text below canvas"
        onClick={insertParagraphBelow}
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          zIndex: 100,
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
  );
}
