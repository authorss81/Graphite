import { useCallback, useState } from "react";
import { BRUSH_PRESETS, type BrushPreset, applyBrushPreset } from "../utils/canvasBrushPresets";

interface Props {
  excalidrawAPI: any;
}

const activeToolStyle: Record<string, string> = {
  background: "var(--accent)",
  color: "#fff",
  borderColor: "var(--accent)",
  boxShadow: "0 0 0 1px var(--accent), 0 2px 8px rgba(0,0,0,0.4)",
};

const idleToolStyle: Record<string, string> = {
  background: "var(--bg-tertiary)",
  color: "var(--text-secondary)",
  borderColor: "var(--border-color)",
};

const containerStyle: Record<string, string> = {
  display: "flex",
  gap: "3px",
  padding: "4px 6px",
  alignItems: "center",
  background: "rgba(30, 30, 36, 0.92)",
  borderRadius: "8px",
  border: "1px solid var(--border-color)",
  backdropFilter: "blur(6px)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
};

const btnBase: Record<string, string> = {
  width: "30px",
  height: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "6px",
  border: "1px solid",
  cursor: "pointer",
  fontSize: "15px",
  transition: "all 0.15s ease",
  lineHeight: "1",
};

export function CanvasBrushPresets({ excalidrawAPI }: Props) {
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handlePreset = useCallback((preset: BrushPreset) => {
    applyBrushPreset(excalidrawAPI, preset);
    excalidrawAPI.setActiveTool({ type: "freedraw" });
    setActivePreset(preset.name);
  }, [excalidrawAPI]);

  return (
    <div style={containerStyle}>
      {BRUSH_PRESETS.map((preset) => {
        const isActive = activePreset === preset.name;
        return (
          <button
            key={preset.name}
            type="button"
            title={preset.label}
            onClick={() => handlePreset(preset)}
            style={{
              ...btnBase,
              ...(isActive ? activeToolStyle : idleToolStyle),
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "var(--bg-secondary)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = idleToolStyle.background;
                e.currentTarget.style.color = idleToolStyle.color;
              }
            }}
          >
            {preset.icon}
          </button>
        );
      })}
    </div>
  );
}
