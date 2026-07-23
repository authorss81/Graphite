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
  const excalidrawAPIRef = useRef<any>(null);

  // Stroke buffering state
  const stateRef = useRef<{
    elements: any[];
    files: any;
    appState: { viewBackgroundColor: string; currentItemStrokeColor?: string; currentItemBackgroundColor?: string };
    timestamp: number;
  } | null>(null);
  const isDrawingRef = useRef(false);
  const commitLaterRef = useRef(false);

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

  // Track drawing state via pointer events
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handlePointerDown = () => {
      isDrawingRef.current = true;
    };

    const handlePointerUp = () => {
      if (isDrawingRef.current && commitLaterRef.current) {
        if (stateRef.current) {
          onChangeRef.current?.(stateRef.current);
        }
        commitLaterRef.current = false;
      }
      isDrawingRef.current = false;
    };

    const handlePointerLeave = () => {
      if (isDrawingRef.current && commitLaterRef.current) {
        if (stateRef.current) {
          onChangeRef.current?.(stateRef.current);
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
  }, []);

  // Buffer strokes on change, commit on pointer up instead of during drag
  const handleCanvasChange = useCallback((elements: readonly any[], appState: any, files: any) => {
    stateRef.current = {
      elements: [...elements],
      files,
      appState: {
        viewBackgroundColor: appState?.viewBackgroundColor || "#1e1e24",
        currentItemStrokeColor: appState?.currentItemStrokeColor,
        currentItemBackgroundColor: appState?.currentItemBackgroundColor,
      },
      timestamp: Date.now(),
    };

    if (isDrawingRef.current) {
      commitLaterRef.current = true;
    } else {
      onChangeRef.current?.(stateRef.current);
      logToNative("info", `Canvas saved: ${elements.length} elements`);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (stateRef.current && commitLaterRef.current) {
        onChangeRef.current?.(stateRef.current);
      }
    };
  }, []);

  // Update Excalidraw when initialData changes (document switch)
  useEffect(() => {
    if (excalidrawAPIRef.current && initialData?.elements?.length) {
      excalidrawAPIRef.current.updateScene({
        elements: initialData.elements,
        files: initialData.files,
        appState: initialData.appState,
      });
    }
  }, [initialData]);

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
