import { useState } from "react";
import { Network, Sigma } from "lucide-react";

export function MermaidBlock() {
  const [code, setCode] = useState(`graph TD
    A[Start Note] --> B{Choose Workspace}
    B -->|Editor| C[Rich Text Blocks]
    B -->|Canvas| D[Spatial Canvas]
    B -->|Graph| E[Backlink Graph]`);

  return (
    <div
      style={{
        background: "#12131a",
        border: "1px solid var(--border-color)",
        borderRadius: "10px",
        padding: "14px",
        margin: "16px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--accent-color)", marginBottom: "8px" }}>
        <Network size={16} /> Mermaid Diagram Block
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={4}
        style={{
          width: "100%",
          background: "var(--bg-tertiary)",
          color: "#e2e8f0",
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          padding: "8px",
          fontFamily: "monospace",
          fontSize: "12px",
          boxSizing: "border-box",
          marginBottom: "10px",
        }}
      />
      <div style={{ background: "#1a1b26", padding: "12px", borderRadius: "8px", color: "#a9b1d6", fontSize: "12px", fontFamily: "monospace" }}>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Diagram Structural Preview:</div>
        {code.split("\n").map((line, i) => (
          <div key={i} style={{ paddingLeft: line.includes("-->") ? "16px" : 0 }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MathBlock() {
  const [latex, setLatex] = useState(`E = mc^2 \\quad \\text{and} \\quad \\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}`);

  return (
    <div
      style={{
        background: "#12131a",
        border: "1px solid var(--border-color)",
        borderRadius: "10px",
        padding: "14px",
        margin: "16px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--accent-color)", marginBottom: "8px" }}>
        <Sigma size={16} /> LaTeX Math Block
      </div>
      <input
        type="text"
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        style={{
          width: "100%",
          background: "var(--bg-tertiary)",
          color: "#e2e8f0",
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          padding: "6px 10px",
          fontFamily: "monospace",
          fontSize: "12px",
          boxSizing: "border-box",
          marginBottom: "10px",
        }}
      />
      <div style={{ background: "rgba(99, 102, 241, 0.1)", padding: "12px", borderRadius: "8px", color: "#a5b4fc", fontSize: "14px", fontFamily: "serif", textAlign: "center" }}>
        $$\quad {latex} \quad$$
      </div>
    </div>
  );
}
