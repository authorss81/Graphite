import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface ZoomControlsProps {
  zoomLevel: number;
  minZoom?: number;
  maxZoom?: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function ZoomControls({
  zoomLevel,
  minZoom = 0.2,
  maxZoom = 3.0,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: ZoomControlsProps) {
  const isMin = zoomLevel <= minZoom + 0.01;
  const isMax = zoomLevel >= maxZoom - 0.01;

  return (
    <div
      className="graphite-zoom-controls"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "4px 8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
      }}
    >
      <button
        type="button"
        className="graphite-btn-icon"
        onClick={onZoomOut}
        disabled={isMin}
        style={{ opacity: isMin ? 0.4 : 1, cursor: isMin ? "not-allowed" : "pointer" }}
        title="Zoom Out"
      >
        <ZoomOut size={16} />
      </button>
      <span
        style={{
          fontSize: "12px",
          fontWeight: 500,
          fontFamily: "var(--font-mono)",
          minWidth: "42px",
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        {Math.round(zoomLevel * 100)}%
      </span>
      <button
        type="button"
        className="graphite-btn-icon"
        onClick={onZoomIn}
        disabled={isMax}
        style={{ opacity: isMax ? 0.4 : 1, cursor: isMax ? "not-allowed" : "pointer" }}
        title="Zoom In"
      >
        <ZoomIn size={16} />
      </button>
      <div style={{ width: "1px", height: "16px", background: "var(--border-color)", margin: "0 4px" }} />
      <button
        type="button"
        className="graphite-btn-icon"
        onClick={onResetZoom}
        title="Reset Zoom & Pan"
      >
        <Maximize2 size={15} />
      </button>
    </div>
  );
}
