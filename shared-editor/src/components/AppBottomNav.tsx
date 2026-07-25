import { memo } from "react";
import { BookOpen, Palette, Columns3, LayoutGrid, Network, Kanban, Info } from "lucide-react";

type Tab = "editor" | "canvas" | "split" | "spatial" | "graph" | "kanban" | "meta";

interface AppBottomNavProps {
  activeTab: Tab;
  onSetActiveTab: (tab: Tab) => void;
}

const BOTTOM_TABS: { tab: Tab; Icon: any; label: string }[] = [
  { tab: "editor", Icon: BookOpen, label: "Editor" },
  { tab: "split", Icon: Columns3, label: "Split" },
  { tab: "canvas", Icon: Palette, label: "Canvas" },
  { tab: "spatial", Icon: LayoutGrid, label: "Spatial" },
  { tab: "graph", Icon: Network, label: "Graph" },
  { tab: "kanban", Icon: Kanban, label: "Kanban" },
  { tab: "meta", Icon: Info, label: "Info" },
];

export const AppBottomNav = memo(function AppBottomNav({ activeTab, onSetActiveTab }: AppBottomNavProps) {
  return (
    <nav aria-label="Bottom navigation" className="graphite-bottom-nav">
      {BOTTOM_TABS.map(({ tab, Icon, label }) => (
        <button key={tab} className={`graphite-bottom-nav-btn${activeTab === tab ? " active" : ""}`} aria-current={activeTab === tab ? "page" : undefined} onClick={() => onSetActiveTab(tab)}><Icon size={20} /><span>{label}</span></button>
      ))}
    </nav>
  );
});
