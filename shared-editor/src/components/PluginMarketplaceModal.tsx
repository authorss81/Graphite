import { useState } from "react";
import { getPlugins, savePlugins, type PluginManifest } from "../utils/pluginSystem";
import { toast } from "./Toast";
import { Puzzle, X, Download, Trash2, CheckCircle2, Search } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PluginMarketplaceModal({ isOpen, onClose }: Props) {
  const [plugins, setPlugins] = useState<PluginManifest[]>(() => getPlugins());
  const [activeTab, setActiveTab] = useState<"marketplace" | "installed">("marketplace");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const persist = (next: PluginManifest[]) => {
    setPlugins(next);
    savePlugins(next);
  };

  const toggleInstall = (pluginId: string) => {
    const next = plugins.map((p) => {
      if (p.id === pluginId) {
        const nextInstalled = !p.isInstalled;
        const nextEnabled = nextInstalled;
        toast(nextInstalled ? `Installed plugin "${p.name}"` : `Uninstalled "${p.name}"`, nextInstalled ? "success" : "info");
        return { ...p, isInstalled: nextInstalled, isEnabled: nextEnabled };
      }
      return p;
    });
    persist(next);
  };

  const toggleEnabled = (pluginId: string) => {
    const next = plugins.map((p) => {
      if (p.id === pluginId) {
        const nextEnabled = !p.isEnabled;
        toast(nextEnabled ? `Enabled "${p.name}"` : `Disabled "${p.name}"`, "info");
        return { ...p, isEnabled: nextEnabled };
      }
      return p;
    });
    persist(next);
  };

  const filteredPlugins = plugins.filter((p) => {
    if (activeTab === "installed" && !p.isInstalled) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plugin Marketplace"
      className="graphite-modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="graphite-plugin-modal graphite-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "760px",
          height: "560px",
          background: "var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Puzzle size={20} color="var(--accent-color)" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
              Plugin Marketplace & Extensions
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal" style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation & Search Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className={`graphite-btn${activeTab === "marketplace" ? " active" : ""}`}
              onClick={() => setActiveTab("marketplace")}
              style={{ padding: "4px 12px", fontSize: "12px" }}
            >
              All Marketplace ({plugins.length})
            </button>
            <button
              className={`graphite-btn${activeTab === "installed" ? " active" : ""}`}
              onClick={() => setActiveTab("installed")}
              style={{ padding: "4px 12px", fontSize: "12px" }}
            >
              Installed ({plugins.filter((p) => p.isInstalled).length})
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-tertiary)", padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "160px" }}
            />
          </div>
        </div>

        {/* Plugin Grid */}
        <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignContent: "start" }}>
          {filteredPlugins.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "13px" }}>
              No plugins match your filter.
            </div>
          ) : (
            filteredPlugins.map((plugin) => (
              <div
                key={plugin.id}
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{plugin.name}</span>
                    <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(99, 102, 241, 0.15)", color: "var(--accent-color)", borderRadius: "10px", textTransform: "uppercase" }}>
                      v{plugin.version}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                    {plugin.description}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>By {plugin.author}</span>

                  <div style={{ display: "flex", gap: "6px" }}>
                    {plugin.isInstalled ? (
                      <>
                        <button
                          type="button"
                          className={`graphite-btn${plugin.isEnabled ? " active" : ""}`}
                          onClick={() => toggleEnabled(plugin.id)}
                          style={{ fontSize: "11px", padding: "4px 8px" }}
                        >
                          <CheckCircle2 size={13} /> {plugin.isEnabled ? "Enabled" : "Disabled"}
                        </button>
                        <button
                          type="button"
                          className="graphite-btn danger"
                          onClick={() => toggleInstall(plugin.id)}
                          title="Uninstall plugin"
                          style={{ fontSize: "11px", padding: "4px 6px" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="graphite-btn active"
                        onClick={() => toggleInstall(plugin.id)}
                        style={{ background: "var(--accent-color)", color: "#fff", border: "none", fontSize: "11px", padding: "4px 10px" }}
                      >
                        <Download size={13} /> Install
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
