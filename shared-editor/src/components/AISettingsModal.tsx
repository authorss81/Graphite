import { useState } from "react";
import { X, Bot, Key, Server, Save } from "lucide-react";
import { loadAIConfig, saveAIConfig, type AIConfig, type AIProvider } from "../utils/aiConfig";
import { toast } from "./Toast";

const PROVIDERS: { value: AIProvider; label: string; desc: string }[] = [
  { value: "ollama", label: "Ollama (Local)", desc: "Run models locally via Ollama" },
  { value: "openai", label: "OpenAI", desc: "GPT-4o, GPT-4o-mini, etc." },
  { value: "anthropic", label: "Anthropic", desc: "Claude 3 Haiku, Sonnet, Opus" },
];

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AISettingsModal({ isOpen, onClose }: AISettingsModalProps) {
  const [config, setConfig] = useState<AIConfig>(loadAIConfig());
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSaving(true);
    saveAIConfig(config);
    toast("AI settings saved", "success");
    setSaving(false);
    onClose();
  };

  const provider = PROVIDERS.find((p) => p.value === config.provider)!;

  return (
    <div
      className="graphite-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        className="graphite-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "480px", maxHeight: "80vh", overflowY: "auto", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-color)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bot size={18} style={{ color: "var(--accent-color)" }} />
            <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)" }}>AI Settings</h3>
          </div>
          <button type="button" aria-label="Close modal" className="graphite-btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: 600 }}>AI Provider</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setConfig((c) => ({ ...c, provider: p.value }))}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: config.provider === p.value ? "2px solid var(--accent-color)" : "1px solid var(--border-color)",
                  background: config.provider === p.value ? "var(--bg-tertiary)" : "transparent",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 600 }}>{p.label}</div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{p.desc}</div>
              </button>
            ))}
          </div>

          {config.provider === "openai" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>
                <Key size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                OpenAI API Key
              </label>
              <input
                type="password"
                value={config.openaiKey}
                onChange={(e) => setConfig((c) => ({ ...c, openaiKey: e.target.value }))}
                placeholder="sk-..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: "13px" }}
              />
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px", marginBottom: "4px", fontWeight: 600 }}>Model</label>
              <select
                value={config.openaiModel}
                onChange={(e) => setConfig((c) => ({ ...c, openaiModel: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: "13px" }}
              >
                <option value="gpt-4o-mini">GPT-4o Mini (fast, cheap)</option>
                <option value="gpt-4o">GPT-4o (powerful)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
          )}

          {config.provider === "anthropic" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>
                <Key size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                Anthropic API Key
              </label>
              <input
                type="password"
                value={config.anthropicKey}
                onChange={(e) => setConfig((c) => ({ ...c, anthropicKey: e.target.value }))}
                placeholder="sk-ant-..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: "13px" }}
              />
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px", marginBottom: "4px", fontWeight: 600 }}>Model</label>
              <select
                value={config.anthropicModel}
                onChange={(e) => setConfig((c) => ({ ...c, anthropicModel: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: "13px" }}
              >
                <option value="claude-3-haiku-20240307">Claude 3 Haiku (fast)</option>
                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus (powerful)</option>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              </select>
            </div>
          )}

          {config.provider === "ollama" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>
                <Server size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                Ollama Endpoint
              </label>
              <input
                type="text"
                value={config.ollamaEndpoint}
                onChange={(e) => setConfig((c) => ({ ...c, ollamaEndpoint: e.target.value }))}
                placeholder="http://localhost:11434"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: "13px" }}
              />
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px", marginBottom: "4px", fontWeight: 600 }}>Model</label>
              <input
                type="text"
                value={config.ollamaModel}
                onChange={(e) => setConfig((c) => ({ ...c, ollamaModel: e.target.value }))}
                placeholder="llama3"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: "13px" }}
              />
            </div>
          )}
        </div>

        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button type="button" className="graphite-btn" onClick={onClose} style={{ padding: "8px 16px" }}>
            Cancel
          </button>
          <button
            type="button"
            className="graphite-btn active"
            onClick={handleSave}
            disabled={saving}
            style={{ background: "var(--accent-color)", color: "#fff", border: "none", padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
