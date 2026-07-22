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

  // Re-calculate bounds on layout resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      window.dispatchEvent(new Event("resize"));
    });
    observer.observe(el);
    return () => observer.disconnect();
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
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        editor.update(() => {
          const node = $getNodeByKey(nodeKeyRef.current);
          if ($isCanvasNode(node)) {
            node.setData({
              elements: [...elements],
              files,
              appState: {
                viewBackgroundColor: appState?.viewBackgroundColor || "#1e1e24",
              },
            });
          }
        });
      }, 400);
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
