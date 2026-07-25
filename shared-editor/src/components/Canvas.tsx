import { useMemo, useRef, useCallback, useEffect } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import { logToNative } from "../utils/bridge";

interface CanvasProps {
  initialData?: any;
  onChange?: (data: any) => void;
}

// Compute a fast fingerprint of the canvas elements and styles to detect actual changes
function getCanvasFingerprint(elements: readonly any[], appState: any): string {
  let versionSum = 0;
  for (let i = 0; i < elements.length; i++) {
    versionSum += elements[i].version || 0;
  }
  return `${elements.length}_${versionSum}_${appState?.viewBackgroundColor || ""}_${appState?.currentItemStrokeColor || ""}_${appState?.currentItemBackgroundColor || ""}`;
}

export function Canvas({ initialData, onChange }: CanvasProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const excalidrawAPIRef = useRef<any>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track the last saved state to prevent infinite update loops
  const lastFingerprintRef = useRef<string>("");

  // Initialize fingerprint from incoming data
  useEffect(() => {
    if (initialData) {
      lastFingerprintRef.current = getCanvasFingerprint(
        initialData.elements || [],
        initialData.appState
      );
    }
  }, [initialData]);

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

  // Handle updates from user interaction
  const handleCanvasChange = useCallback((elements: readonly any[], appState: any, files: any) => {
    const fingerprint = getCanvasFingerprint(elements, appState);
    
    // Skip if nothing changed (prevents loop from updateScene triggers)
    if (fingerprint === lastFingerprintRef.current) {
      return;
    }

    lastFingerprintRef.current = fingerprint;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

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
      logToNative("info", `Canvas auto-saved: ${elements.length} elements`);
    }, 200);
  }, []);

  // Update Excalidraw scene when document changes externally
  useEffect(() => {
    if (excalidrawAPIRef.current && initialData) {
      const newFingerprint = getCanvasFingerprint(
        initialData.elements || [],
        initialData.appState
      );
      // Only call updateScene if it actually differs from what is currently loaded
      if (newFingerprint !== lastFingerprintRef.current) {
        lastFingerprintRef.current = newFingerprint;
        excalidrawAPIRef.current.updateScene({
          elements: initialData.elements || [],
          files: initialData.files,
          appState: {
            viewBackgroundColor: initialData.appState?.viewBackgroundColor || "#1e1e24",
            currentItemStrokeColor: initialData.appState?.currentItemStrokeColor,
            currentItemBackgroundColor: initialData.appState?.currentItemBackgroundColor,
            ...initialData.appState,
          },
        });
      }
    }
  }, [initialData]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
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
