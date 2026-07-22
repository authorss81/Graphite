import { useMemo, useRef, useCallback, useEffect } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import { logToNative } from "../utils/bridge";

interface CanvasProps {
  initialData?: any;
  onChange?: (data: any) => void;
}

export function Canvas({ initialData, onChange }: CanvasProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const initialCanvasData = useMemo(() => ({
    elements: initialData?.elements || [],
    files: initialData?.files || undefined,
    appState: {
      viewBackgroundColor: initialData?.appState?.viewBackgroundColor || "#1e1e24",
    },
    scrollToContent: true,
  }), [initialData]);

  const lastLogTime = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<any>(null);
  const isDrawingRef = useRef(false);
  const commitLaterRef = useRef(false);

  // Track drawing stroke states via container pointer listeners
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handlePointerDown = () => {
      isDrawingRef.current = true;
    };

    const flushCommit = () => {
      if (isDrawingRef.current && commitLaterRef.current && stateRef.current) {
        onChangeRef.current?.(stateRef.current);
        commitLaterRef.current = false;
      }
      isDrawingRef.current = false;
    };

    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("pointerup", flushCommit);
    el.addEventListener("pointerleave", flushCommit);
    window.addEventListener("blur", flushCommit);

    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointerup", flushCommit);
      el.removeEventListener("pointerleave", flushCommit);
      window.removeEventListener("blur", flushCommit);
    };
  }, []);

  // Stable callback reference — receives elements, appState, and files (3rd arg)
  const handleCanvasChange = useCallback((newElements: readonly any[], appState: any, files: any) => {
    const stateUpdate = {
      elements: [...newElements],
      files,
      appState: {
        viewBackgroundColor: appState?.viewBackgroundColor || "#1e1e24",
      },
    };

    // Buffer updates for the current stroke - defer commit to pointerUp/blur
    if (timerRef.current) clearTimeout(timerRef.current);
    // Store latest elements in ref to avoid stale closure issues during rapid updates
    stateRef.current = { ...stateUpdate, timestamp: Date.now() };
    
    // Commit only on pointerUp/blur, not during every drag event
    if (isDrawingRef.current) {
      commitLaterRef.current = true;
    } else {
      // Final commit for non-drawing updates (immediate or debounced)
      timerRef.current = setTimeout(() => {
        onChangeRef.current?.(stateRef.current);
      }, 100);
    }

    const now = Date.now();
    if (now - lastLogTime.current > 2000) {
      logToNative("info", `Canvas updated: ${newElements.length} elements`);
      lastLogTime.current = now;
    }
  }, []);

  const uiOptions = useMemo(() => ({
    canvasActions: {
      loadScene: false,
      saveToActiveFile: false,
      export: false as const,
    },
  }), []);

  const excalidrawAPIRef = useRef<any>(null);

  useEffect(() => {
    if (excalidrawAPIRef.current) {
      excalidrawAPIRef.current.updateScene({
        elements: initialData?.elements || [],
        appState: {
          viewBackgroundColor: initialData?.appState?.viewBackgroundColor || "#1e1e24",
          ...initialData?.appState,
        },
      });
    }
  }, [initialData]);

  return (
    <div
      ref={containerRef}
      className="graphite-canvas-container"
      style={{
        height: "calc(100dvh - 140px)",
        minHeight: "500px",
        width: "100%",
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        overflow: "hidden",
        position: "relative",
        background: "#1e1e24",
      }}
    >
      <Excalidraw
        theme="dark"
        excalidrawAPI={(api) => { excalidrawAPIRef.current = api; }}
        initialData={initialCanvasData}
        onChange={handleCanvasChange}
        UIOptions={uiOptions}
        detectScroll={true}
      />
    </div>
  );
}
