import { BookOpen, Palette, Columns3, LayoutGrid, Network, Info } from "lucide-react";

interface AppBottomNavProps {
  activeTab: string;
  onSetActiveTab: (tab: any) => void;
}

export function AppBottomNav({ activeTab, onSetActiveTab }: AppBottomNavProps) {
  return (
    <nav className="graphite-bottom-nav">
      <button className={`graphite-bottom-nav-btn${activeTab === "editor" ? " active" : ""}`} onClick={() => onSetActiveTab("editor")}><BookOpen size={20} /><span>Editor</span></button>
      <button className={`graphite-bottom-nav-btn${activeTab === "split" ? " active" : ""}`} onClick={() => onSetActiveTab("split")}><Columns3 size={20} /><span>Split</span></button>
      <button className={`graphite-bottom-nav-btn${activeTab === "canvas" ? " active" : ""}`} onClick={() => onSetActiveTab("canvas")}><Palette size={20} /><span>Canvas</span></button>
      <button className={`graphite-bottom-nav-btn${activeTab === "spatial" ? " active" : ""}`} onClick={() => onSetActiveTab("spatial")}><LayoutGrid size={20} /><span>Spatial</span></button>
      <button className={`graphite-bottom-nav-btn${activeTab === "graph" ? " active" : ""}`} onClick={() => onSetActiveTab("graph")}><Network size={20} /><span>Graph</span></button>
      <button className={`graphite-bottom-nav-btn${activeTab === "kanban" ? " active" : ""}`} onClick={() => onSetActiveTab("kanban")}><LayoutGrid size={20} /><span>Kanban</span></button>
      <button className={`graphite-bottom-nav-btn${activeTab === "meta" ? " active" : ""}`} onClick={() => onSetActiveTab("meta")}><Info size={20} /><span>Info</span></button>
    </nav>
  );
}
