import { useMemo, useRef, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import { logToNative } from "../utils/bridge";

interface CanvasProps {
  initialData?: any;
  onChange?: (data: any) => void;
}

export function Canvas({ initialData, onChange }: CanvasProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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

  // Stable callback reference — receives elements, appState, and files (3rd arg)
  const handleCanvasChange = useCallback((newElements: readonly any[], appState: any, files: any) => {
    const stateUpdate = {
      elements: [...newElements],
      files,
      appState: {
        viewBackgroundColor: appState?.viewBackgroundColor || "#1e1e24",
      },
    };

    // Debounce state updates to prevent frame drops during drawing
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChangeRef.current?.(stateUpdate);
    }, 300);
    
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

  return (
    <div
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
        initialData={initialCanvasData}
        onChange={handleCanvasChange}
        UIOptions={uiOptions}
        detectScroll={true}
      />
    </div>
  );
}
