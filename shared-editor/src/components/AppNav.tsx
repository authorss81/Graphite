import { memo } from "react";
import { BookOpen, Palette, Columns3, LayoutGrid, Network, Kanban, Info } from "lucide-react";

interface AppNavProps {
  activeTab: "editor" | "canvas" | "split" | "spatial" | "graph" | "kanban" | "meta";
  onSetActiveTab: (tab: "editor" | "canvas" | "split" | "spatial" | "graph" | "kanban" | "meta") => void;
}

export const AppNav = memo(function AppNav({ activeTab, onSetActiveTab }: AppNavProps) {
  return (
    <div className="graphite-top-nav">
      <nav aria-label="Document views"
        style={{
          display: "flex",
          gap: "12px",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "8px",
          marginTop: "16px",
        }}
      >
        {([["editor", BookOpen, "Editor"], ["canvas", Palette, "Canvas"], ["split", Columns3, "Split"], ["spatial", LayoutGrid, "Spatial"], ["graph", Network, "Graph"], ["kanban", Kanban, "Kanban"], ["meta", Info, "Info"]] as const).map(([tab, Icon, label]) => (
          <button
            key={tab}
            className="graphite-btn"
            aria-current={activeTab === tab ? "page" : undefined}
            style={{
              background: activeTab === tab ? "var(--accent-color)" : "rgba(255,255,255,0.03)",
              color: activeTab === tab ? "#fff" : "var(--text-secondary)",
            }}
            onClick={() => onSetActiveTab(tab)}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
});
