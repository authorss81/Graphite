import { memo } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { TableOfContents } from "./TableOfContents";
import { DailyJournal } from "./DailyJournal";
import { MetadataEditor } from "./MetadataEditor";

export const InfoTab = memo(function InfoTab() {
  const docId = useNoteStore((s) => s.docId);
  const editorState = useNoteStore((s) => s.editorState);
  const wordCount = useNoteStore((s) => s.wordCount);
  const charCount = useNoteStore((s) => s.charCount);
  const backlinks = useNoteStore((s) => s.backlinks);
  const gitStatus = useNoteStore((s) => s.gitStatus);

  return (
    <div
      className="graphite-editor-container"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <h2 style={{ margin: 0, fontFamily: "var(--font-heading)" }}>
        Analytics & Context
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <div
          style={{
            padding: "16px",
            background: "var(--bg-tertiary)",
            borderRadius: "10px",
            border: "1px solid var(--border-color)",
          }}
        >
          <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Words
          </span>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              marginTop: "4px",
            }}
          >
            {wordCount}
          </div>
        </div>
        <div
          style={{
            padding: "16px",
            background: "var(--bg-tertiary)",
            borderRadius: "10px",
            border: "1px solid var(--border-color)",
          }}
        >
          <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Characters
          </span>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              marginTop: "4px",
            }}
          >
            {charCount}
          </div>
        </div>
        <div
          style={{
            padding: "16px",
            background: "var(--bg-tertiary)",
            borderRadius: "10px",
            border: "1px solid var(--border-color)",
          }}
        >
          <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Git
          </span>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "500",
              marginTop: "8px",
              color: "var(--accent-success)",
            }}
          >
            {gitStatus}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "12px" }}>
        <h3
          style={{
            margin: "0 0 8px 0",
            fontSize: "16px",
            color: "var(--text-secondary)",
          }}
        >
          Detected Wiki Links
        </h3>
        {backlinks.length > 0 ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {backlinks.map((link) => (
              <span
                key={link}
                style={{
                  padding: "4px 10px",
                  background: "rgba(129, 140, 248, 0.15)",
                  border: "1px solid rgba(129, 140, 248, 0.3)",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "#a5b4fc",
                }}
              >
                [[{link}]]
              </span>
            ))}
          </div>
        ) : (
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-muted)",
              fontStyle: "italic",
            }}
          >
            No internal page links found. Try typing [[Page Title]] in
            the editor.
          </p>
        )}
      </div>
      <TableOfContents editorState={editorState} />
      <DailyJournal />
      <MetadataEditor docId={docId} />
    </div>
  );
});
