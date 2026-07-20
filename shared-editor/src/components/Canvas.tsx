import { useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import { logToNative } from "../utils/bridge";

interface CanvasProps {
  initialData?: any;
  onChange?: (data: any) => void;
}

export function Canvas({ initialData, onChange }: CanvasProps) {
  const [elements, setElements] = useState<any[]>(initialData?.elements || []);
  const [appState, setAppState] = useState<any>(initialData?.appState || {});

  const handleCanvasChange = (newElements: readonly any[], newAppState: any) => {
    setElements([...newElements]);
    setAppState(newAppState);
    
    if (onChange) {
      onChange({
        elements: newElements,
        appState: {
          theme: newAppState.theme,
          viewBackgroundColor: newAppState.viewBackgroundColor,
        }
      });
    }
    
    logToNative("info", `Canvas updated: ${newElements.length} elements`);
  };

  return (
    <div className="graphite-canvas-container" style={{ height: "500px", width: "100%", border: "1px solid var(--border-color)", borderRadius: "12px", overflow: "hidden" }}>
      <Excalidraw
        initialData={{
          elements: elements,
          appState: { ...appState, theme: "dark" },
          scrollToContent: true,
        }}
        onChange={handleCanvasChange}
      />
    </div>
  );
}
