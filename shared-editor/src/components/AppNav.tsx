import { BookOpen, Palette, Columns3, LayoutGrid, Network, Info } from "lucide-react";

interface AppNavProps {
  activeTab: "editor" | "canvas" | "split" | "spatial" | "graph" | "kanban" | "meta";
  onSetActiveTab: (tab: "editor" | "canvas" | "split" | "spatial" | "graph" | "kanban" | "meta") => void;
}

export function AppNav({ activeTab, onSetActiveTab }: AppNavProps) {
  return (
    <nav
      style={{
        display: "flex",
        gap: "12px",
        borderBottom: "1px solid var(--border-color)",
        paddingBottom: "8px",
        marginTop: "16px",
      }}
    >
      <button
        className="graphite-btn"
        style={{
          background:
            activeTab === "editor"
              ? "var(--accent-color)"
              : "rgba(255,255,255,0.03)",
          color: activeTab === "editor" ? "#fff" : "var(--text-secondary)",
        }}
        onClick={() => onSetActiveTab("editor")}
      >
        <BookOpen size={18} />
        Editor
      </button>
      <button
        className="graphite-btn"
        style={{
          background:
            activeTab === "canvas"
              ? "var(--accent-color)"
              : "rgba(255,255,255,0.03)",
          color:
            activeTab === "canvas" ? "#fff" : "var(--text-secondary)",
        }}
        onClick={() => onSetActiveTab("canvas")}
      >
        <Palette size={18} />
        Canvas
      </button>
      <button
        className="graphite-btn"
        style={{
          background:
            activeTab === "split"
              ? "var(--accent-color)"
              : "rgba(255,255,255,0.03)",
          color:
            activeTab === "split" ? "#fff" : "var(--text-secondary)",
        }}
        onClick={() => onSetActiveTab("split")}
      >
        <Columns3 size={18} />
        Split
      </button>
      <button
        className="graphite-btn"
        style={{
          background:
            activeTab === "spatial"
              ? "var(--accent-color)"
              : "rgba(255,255,255,0.03)",
          color:
            activeTab === "spatial" ? "#fff" : "var(--text-secondary)",
        }}
        onClick={() => onSetActiveTab("spatial")}
      >
        <LayoutGrid size={18} />
        Spatial
      </button>
      <button
        className="graphite-btn"
        style={{
          background:
            activeTab === "graph"
              ? "var(--accent-color)"
              : "rgba(255,255,255,0.03)",
          color: activeTab === "graph" ? "#fff" : "var(--text-secondary)",
        }}
        onClick={() => onSetActiveTab("graph")}
      >
        <Network size={18} />
        Graph
      </button>
      <button
        className="graphite-btn"
        style={{
          background:
            activeTab === "meta"
              ? "var(--accent-color)"
              : "rgba(255,255,255,0.03)",
          color: activeTab === "meta" ? "#fff" : "var(--text-secondary)",
        }}
        onClick={() => onSetActiveTab("meta")}
      >
        <Info size={18} />
        Info
      </button>
    </nav>
  );
}
