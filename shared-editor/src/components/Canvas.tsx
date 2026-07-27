import { useMemo, useRef, useCallback, useEffect } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import { logToNative } from "../utils/bridge";

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
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
  } catch {}
}

interface CanvasProps {
  initialData?: any;
  onChange?: (data: any) => void;
}

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

function getCanvasFingerprint(elements: readonly any[], appState: any): string {
  let versionSum = 0;
  for (let i = 0; i < elements.length; i++) {
    versionSum += elements[i].version || 0;
  }
  const brush = pickBrushState(appState);
  return `${elements.length}_${versionSum}_${JSON.stringify(brush)}`;
}

export function Canvas({ initialData, onChange }: CanvasProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const excalidrawAPIRef = useRef<any>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFingerprintRef = useRef<string>("");
  const libraryLoadedRef = useRef(false);

  useEffect(() => {
    if (initialData) {
      lastFingerprintRef.current = getCanvasFingerprint(
        initialData.elements || [],
        initialData.appState
      );
    }
  }, [initialData]);

  const savedLibrary = useMemo(() => loadLibrary(), []);

  const initialCanvasData = useMemo(() => {
    const brush = pickBrushState(initialData?.appState);
    return {
      elements: initialData?.elements || [],
      files: initialData?.files || undefined,
      libraryItems: savedLibrary,
      appState: {
        viewBackgroundColor: initialData?.appState?.viewBackgroundColor || "#1e1e24",
        ...brush,
      },
      scrollToContent: true,
    };
  }, [initialData, savedLibrary]);

  const handleCanvasChange = useCallback((elements: readonly any[], appState: any, files: any) => {
    const fingerprint = getCanvasFingerprint(elements, appState);

    if (fingerprint === lastFingerprintRef.current) {
      return;
    }

    lastFingerprintRef.current = fingerprint;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const brush = pickBrushState(appState);
      const dataToSave = {
        elements: [...elements],
        files,
        appState: {
          ...brush,
          viewBackgroundColor: appState?.viewBackgroundColor || "#1e1e24",
        },
        timestamp: Date.now(),
      };
      onChangeRef.current?.(dataToSave);
      logToNative("info", `Canvas auto-saved: ${elements.length} elements`);
    }, 200);
  }, []);

  const handleLibraryChange = useCallback((libraryItems: any[]) => {
    saveLibrary(libraryItems);
  }, []);

  const generateIdForFile = useCallback((file: File) => {
    return `file_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  useEffect(() => {
    if (excalidrawAPIRef.current && initialData) {
      const newFingerprint = getCanvasFingerprint(
        initialData.elements || [],
        initialData.appState
      );
      if (newFingerprint !== lastFingerprintRef.current) {
        lastFingerprintRef.current = newFingerprint;
        const currentAppState = excalidrawAPIRef.current.getAppState ? excalidrawAPIRef.current.getAppState() : {};
        const brush = pickBrushState(initialData.appState);
        excalidrawAPIRef.current.updateScene({
          elements: initialData.elements || [],
          files: initialData.files,
          appState: {
            ...currentAppState,
            ...brush,
            viewBackgroundColor: initialData.appState?.viewBackgroundColor || currentAppState.viewBackgroundColor || "#1e1e24",
          },
        });
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (excalidrawAPIRef.current && !libraryLoadedRef.current && savedLibrary.length > 0) {
      libraryLoadedRef.current = true;
      excalidrawAPIRef.current.updateLibrary({
        libraryItems: savedLibrary,
      });
    }
  }, [savedLibrary]);

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
      saveAsImage: true,
    },
    tools: {
      image: true,
    },
  }), []);

  return (
    <div
      className="graphite-canvas-container"
      style={{
        height: "100%",
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
        onLibraryChange={handleLibraryChange}
        generateIdForFile={generateIdForFile}
        UIOptions={uiOptions}
        detectScroll={true}
      />
    </div>
  );
}
