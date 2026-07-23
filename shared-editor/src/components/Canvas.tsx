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
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const excalidrawAPIRef = useRef<any>(null);

  const initialCanvasData = useMemo(() => ({
    elements: initialData?.elements || [],
    files: initialData?.files || undefined,
    appState: {
      viewBackgroundColor: initialData?.appState?.viewBackgroundColor || "#1e1e24",
      currentItemStrokeColor: initialData?.appState?.currentItemStrokeColor,
      currentItemBackgroundColor: initialData?.appState?.currentItemBackgroundColor,
    },
    scrollToContent: true,
  }), [initialData]);

  // Direct, reliable change handler for strokes, elements & color changes
  const handleCanvasChange = useCallback((elements: readonly any[], appState: any, files: any) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      const dataToSave = {
        elements: [...elements],
        files,
        appState: {
          viewBackgroundColor: appState?.viewBackgroundColor || "#1e1e24",
          currentItemStrokeColor: appState?.currentItemStrokeColor,
          currentItemBackgroundColor: appState?.currentItemBackgroundColor,
        },
        timestamp: Date.now(),
      };
      onChangeRef.current?.(dataToSave);
      logToNative("info", `Canvas saved: ${elements.length} elements`);
    }, 150);
  }, []);

  // Flush pending changes on unmount (e.g. document switch)
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const uiOptions = useMemo(() => ({
    canvasActions: {
      loadScene: false,
      saveToActiveFile: false,
      export: false as const,
    },
  }), []);

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
