import { X, Keyboard } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: "Ctrl+B", label: "Bold" },
  { keys: "Ctrl+I", label: "Italic" },
  { keys: "Ctrl+U", label: "Underline" },
  { keys: "Ctrl+K", label: "Insert Link" },
  { keys: "Ctrl+P", label: "Quick Open" },
  { keys: "Ctrl+F", label: "Search" },
  { keys: "Ctrl+Z", label: "Undo" },
  { keys: "Ctrl+Shift+Z", label: "Redo" },
  { keys: "/", label: "Slash Menu" },
  { keys: "[[", label: "Wiki Link" },
  { keys: "Escape", label: "Close Modal" },
  { keys: "Tab", label: "Indent List" },
  { keys: "Shift+Tab", label: "Outdent List" },
  { keys: "Ctrl+Enter", label: "Create Snapshot" },
];

export function KeyboardCheatsheetModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="graphite-modal-card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)", borderRadius: "16px", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
            <Keyboard size={20} /> Keyboard Shortcuts
          </div>
          <button onClick={onClose} aria-label="Close modal" style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div className="graphite-cheatsheet-grid">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="graphite-cheatsheet-key">
              <span style={{ color: "var(--text-secondary)" }}>{s.label}</span>
              <span className="graphite-cheatsheet-kbd">{s.keys}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
