import { useState } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { exportAsMarkdown, exportAsHTML, exportAsPDF } from "../utils/exportDoc";
import { toast } from "./Toast";
import { Share2, Globe, FileText, Printer, Copy, Check, X, Code } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PublishModal({ isOpen, onClose }: Props) {
  const docId = useNoteStore((s) => s.docId);
  const documents = useNoteStore((s) => s.documents);
  const currentDoc = documents[docId];

  const [isPublished, setIsPublished] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !currentDoc) return null;

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}#doc=${docId}`
    : `https://graphite.studio/p/${docId}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      toast("Public link copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
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
        className="graphite-publish-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        }}
      >
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
            <Share2 size={20} color="var(--accent-color)" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
              Publish & Export
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <div
            style={{
              padding: "16px",
              background: "var(--bg-tertiary)",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Globe size={18} color={isPublished ? "#10b981" : "var(--text-muted)"} />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Publish to Web
                </span>
              </div>
              <button
                type="button"
                className="graphite-btn"
                onClick={() => {
                  setIsPublished((p) => !p);
                  toast(isPublished ? "Document unpublished" : "Document published to web!", "info");
                }}
                style={{
                  background: isPublished ? "rgba(239, 68, 68, 0.15)" : "var(--accent-color)",
                  color: isPublished ? "#f87171" : "#fff",
                  border: "none",
                  padding: "4px 12px",
                  fontSize: "12px",
                }}
              >
                {isPublished ? "Unpublish" : "Publish Link"}
              </button>
            </div>

            {isPublished && (
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  style={{
                    flex: 1,
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "12px",
                  }}
                />
                <button
                  type="button"
                  className="graphite-btn"
                  onClick={copyShareLink}
                  style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                >
                  {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>

          <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Export Document
          </h4>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              className="graphite-btn"
              onClick={() => exportAsMarkdown(currentDoc.title, currentDoc.editorState)}
              style={{ flexDirection: "column", gap: "6px", padding: "12px 8px", fontSize: "12px" }}
            >
              <FileText size={18} color="var(--accent-color)" />
              Markdown (.md)
            </button>
            <button
              type="button"
              className="graphite-btn"
              onClick={() => exportAsHTML(currentDoc.title, currentDoc.editorState)}
              style={{ flexDirection: "column", gap: "6px", padding: "12px 8px", fontSize: "12px" }}
            >
              <Code size={18} color="#a855f7" />
              HTML (.html)
            </button>
            <button
              type="button"
              className="graphite-btn"
              onClick={() => exportAsPDF()}
              style={{ flexDirection: "column", gap: "6px", padding: "12px 8px", fontSize: "12px" }}
            >
              <Printer size={18} color="#38bdf8" />
              Print / PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
