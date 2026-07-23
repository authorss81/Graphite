import { useState, useMemo } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { getDocCommits, computeTextDiff, createDocCommit, formatRelativeTime, type DocCommit } from "../utils/versionHistory";
import { toast } from "./Toast";
import { History, GitCommit, RotateCcw, X, Clock, FileDiff, Plus, Search } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function VersionHistoryModal({ isOpen, onClose }: Props) {
  const docId = useNoteStore((s) => s.docId);
  const documents = useNoteStore((s) => s.documents);
  const updateCurrentContent = useNoteStore((s) => s.updateCurrentContent);

  const currentDoc = documents[docId];
  const [commits, setCommits] = useState<DocCommit[]>(() => getDocCommits(docId));
  const [selectedCommit, setSelectedCommit] = useState<DocCommit | null>(commits[0] || null);
  const [customMsg, setCustomMsg] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  const refreshCommits = () => {
    const list = getDocCommits(docId);
    setCommits(list);
    if (!selectedCommit && list[0]) setSelectedCommit(list[0]);
  };

  const filteredCommits = useMemo(() => {
    if (!searchFilter.trim()) return commits;
    const q = searchFilter.toLowerCase();
    return commits.filter((c) => c.message.toLowerCase().includes(q) || c.commitId.toLowerCase().includes(q));
  }, [commits, searchFilter]);

  if (!isOpen || !currentDoc) return null;

  const handleCreateSnapshot = async () => {
    const msg = customMsg.trim() || `Manual Snapshot (${new Date().toLocaleTimeString()})`;
    const commit = await createDocCommit(docId, currentDoc.title, currentDoc.editorState, currentDoc.canvasData, msg);
    toast("Git snapshot commit created!", "success");
    setCustomMsg("");
    refreshCommits();
    setSelectedCommit(commit);
  };

  const handleRestore = async (commit: DocCommit) => {
    await createDocCommit(docId, currentDoc.title, currentDoc.editorState, currentDoc.canvasData, `Before restoring to ${new Date(commit.timestamp).toLocaleTimeString()}`);
    updateCurrentContent(commit.editorState, commit.canvasData);
    toast(`Restored version from ${new Date(commit.timestamp).toLocaleString()}`, "success");
    onClose();
  };

  const currentPlainText = currentDoc.editorState || "";
  const commitPlainText = selectedCommit?.editorState || "";
  const diffs = computeTextDiff(commitPlainText, currentPlainText);

  return (
    <div
      role="dialog"
      aria-modal="true"
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
        className="graphite-history-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "800px",
          height: "600px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
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
            <History size={20} color="var(--accent-color)" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
              Version History — {currentDoc.title}
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

        {/* Create Snapshot Bar */}
        <div style={{ display: "flex", gap: "10px", padding: "10px 16px", borderBottom: "1px solid var(--border-color)", background: "rgba(255,255,255,0.02)" }}>
          <input
            type="text"
            placeholder="Commit message (e.g. 'Saved before major rewrite')..."
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateSnapshot()}
            style={{
              flex: 1,
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "13px",
            }}
          />
          <button
            type="button"
            className="graphite-btn active"
            onClick={handleCreateSnapshot}
            style={{ background: "var(--accent-color)", color: "#fff", border: "none" }}
          >
            <Plus size={16} />
            Snapshot
          </button>
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr", overflow: "hidden" }}>
          {/* Commit List Sidebar */}
          <div style={{ borderRight: "1px solid var(--border-color)", padding: "12px", overflowY: "auto", background: "rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Filter snapshots..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  padding: "2px 4px",
                  outline: "none",
                }}
              />
            </div>

            {filteredCommits.length === 0 ? (
              <div style={{ padding: "20px 8px", fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}>
                No snapshots match your search filter.
              </div>
            ) : (
              filteredCommits.map((c) => {
                const isSelected = selectedCommit?.commitId === c.commitId;

                return (
                  <button
                    key={c.commitId}
                    type="button"
                    onClick={() => setSelectedCommit(c)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid",
                      borderColor: isSelected ? "var(--accent-color)" : "transparent",
                      borderRadius: "8px",
                      background: isSelected ? "var(--bg-tertiary)" : "transparent",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      textAlign: "left",
                      marginBottom: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 500 }}>
                      <GitCommit size={14} color="var(--accent-color)" />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.message}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      <Clock size={12} />
                      <span>{formatRelativeTime(c.timestamp)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Diff & Preview Main Area */}
          <div style={{ display: "flex", flexDirection: "column", padding: "16px", overflowY: "auto" }}>
            {selectedCommit ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>{selectedCommit.message}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      Commit SHA: {selectedCommit.commitId}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="graphite-btn active"
                    onClick={() => handleRestore(selectedCommit)}
                    style={{ background: "var(--accent-color)", color: "#fff", border: "none" }}
                  >
                    <RotateCcw size={15} />
                    Restore Version
                  </button>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px" }}>
                    <FileDiff size={15} />
                    <span>Diff View (Compared to current live state)</span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      background: "#12131a",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "12px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      overflowY: "auto",
                      maxHeight: "360px",
                    }}
                  >
                    {diffs.map((d, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "2px 6px",
                          background: d.type === "add" ? "rgba(16, 185, 129, 0.15)" : d.type === "del" ? "rgba(239, 68, 68, 0.15)" : "transparent",
                          color: d.type === "add" ? "#34d399" : d.type === "del" ? "#f87171" : "var(--text-secondary)",
                        }}
                      >
                        {d.type === "add" ? "+ " : d.type === "del" ? "- " : "  "}
                        {d.text}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
                Select a snapshot from the timeline to preview diff and restore.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
