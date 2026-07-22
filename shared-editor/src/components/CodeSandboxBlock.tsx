import { useState, useRef } from "react";
import { Play, Code, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

export function CodeSandboxBlock() {
  const [code, setCode] = useState(`// JavaScript Sandboxed Web Worker Execution
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Doubled numbers:", doubled);
return "Result: " + doubled.reduce((a, b) => a + b, 0);`);

  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const runCode = () => {
    setOutput(null);
    setError(null);
    setIsRunning(true);

    if (workerRef.current) {
      workerRef.current.terminate();
    }

    const workerCode = `
      self.onmessage = function(e) {
        const userCode = e.data;
        const logs = [];
        const customConsole = {
          log: function(...args) { logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ")); },
          warn: function(...args) { logs.push("[WARN] " + args.join(" ")); },
          error: function(...args) { logs.push("[ERROR] " + args.join(" ")); }
        };

        try {
          const runner = new Function("console", userCode);
          const result = runner(customConsole);
          const resultStr = result !== undefined ? String(result) : "";
          const finalOutput = logs.concat(resultStr ? [resultStr] : []).join("\\n");
          self.postMessage({ success: true, output: finalOutput });
        } catch (err) {
          self.postMessage({ success: false, error: err.message || String(err) });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    workerRef.current = worker;

    const timeout = setTimeout(() => {
      worker.terminate();
      setIsRunning(false);
      setError("Execution timed out (2s limit). Sandboxed Worker terminated.");
      URL.revokeObjectURL(workerUrl);
    }, 2000);

    worker.onmessage = (e) => {
      clearTimeout(timeout);
      setIsRunning(false);
      URL.revokeObjectURL(workerUrl);
      if (e.data.success) {
        setOutput(e.data.output || "Code executed successfully with no output.");
      } else {
        setError(e.data.error || "Execution error.");
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timeout);
      setIsRunning(false);
      URL.revokeObjectURL(workerUrl);
      setError(`Worker runtime error: ${err.message}`);
    };

    worker.postMessage(code);
  };

  return (
    <div
      className="graphite-code-sandbox"
      style={{
        background: "#12131a",
        border: "1px solid var(--border-color)",
        borderRadius: "10px",
        overflow: "hidden",
        margin: "16px 0",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "rgba(255,255,255,0.03)",
          borderBottom: "1px solid var(--border-color)",
          fontSize: "12px",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Code size={15} color="var(--accent-color)" />
          <span>JavaScript Web Worker Sandbox</span>
        </div>
        <button
          type="button"
          onClick={runCode}
          disabled={isRunning}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: isRunning ? "var(--bg-tertiary)" : "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: isRunning ? "wait" : "pointer",
          }}
        >
          {isRunning ? <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={12} fill="#fff" />}
          {isRunning ? "Running..." : "Run Code"}
        </button>
      </div>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={6}
        style={{
          width: "100%",
          background: "transparent",
          color: "#e2e8f0",
          border: "none",
          padding: "12px",
          fontFamily: "monospace",
          fontSize: "13px",
          outline: "none",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />

      {(output || error) && (
        <div
          style={{
            borderTop: "1px solid var(--border-color)",
            padding: "10px 14px",
            background: error ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
            color: error ? "#f87171" : "#34d399",
            fontSize: "12px",
            whiteSpace: "pre-wrap",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            {error ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
            {error ? "Execution Error:" : "Console Output:"}
          </div>
          {error || output}
        </div>
      )}
    </div>
  );
}
