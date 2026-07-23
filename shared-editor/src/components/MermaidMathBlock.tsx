import { useState, useEffect, useRef } from "react";
import { Network, Sigma } from "lucide-react";

export function MermaidBlock() {
  const [code, setCode] = useState(`graph TD\n    A[Start Note] --> B{Choose Workspace}\n    B -->|Editor| C[Rich Text Blocks]\n    B -->|Canvas| D[Spatial Canvas]\n    B -->|Graph| E[Backlink Graph]`);
  const [svg, setSvg] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = await import("mermaid");
        mermaid.default.initialize({ theme: "dark", startOnLoad: false });
        const { svg: rendered } = await mermaid.default.render("mermaid-" + Date.now(), code);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setSvg("");
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div style={{ background: "#12131a", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "14px", margin: "16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--accent-color)", marginBottom: "8px" }}>
        <Network size={16} /> Mermaid Diagram Block
      </div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={4} style={{ width: "100%", background: "var(--bg-tertiary)", color: "#e2e8f0", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "8px", fontFamily: "monospace", fontSize: "12px", boxSizing: "border-box", marginBottom: "10px" }} />
      <div ref={containerRef} style={{ background: "#1a1b26", padding: "12px", borderRadius: "8px", overflow: "auto", minHeight: "80px" }}>
        {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <div style={{ color: "var(--text-muted)", fontSize: "12px", fontStyle: "italic" }}>Rendering diagram...</div>}
      </div>
    </div>
  );
}

export function MathBlock() {
  const [latex, setLatex] = useState("E = mc^2 \\quad \\text{and} \\quad \\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}");
  const [html, setHtml] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const katex = await import("katex");
        const rendered = katex.default.renderToString(latex, { throwOnError: false, displayMode: true });
        setHtml(rendered);
      } catch {
        setHtml("");
      }
    })();
  }, [latex]);

  return (
    <div style={{ background: "#12131a", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "14px", margin: "16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--accent-color)", marginBottom: "8px" }}>
        <Sigma size={16} /> KaTeX Math Block
      </div>
      <input type="text" value={latex} onChange={(e) => setLatex(e.target.value)} style={{ width: "100%", background: "var(--bg-tertiary)", color: "#e2e8f0", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "6px 10px", fontFamily: "monospace", fontSize: "12px", boxSizing: "border-box", marginBottom: "10px" }} />
      <div style={{ background: "rgba(99, 102, 241, 0.1)", padding: "12px", borderRadius: "8px", textAlign: "center", overflow: "auto" }}>
        {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <div style={{ color: "var(--text-muted)", fontSize: "12px", fontStyle: "italic" }}>Rendering math...</div>}
      </div>
    </div>
  );
}
