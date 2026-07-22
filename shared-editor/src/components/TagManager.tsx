import { useState, useMemo } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { Tag, Pin, Archive, Plus, X } from "lucide-react";
import { toast } from "./Toast";

export function TagManager() {
  const docId = useNoteStore((s) => s.docId);
  const documents = useNoteStore((s) => s.documents);
  const togglePinDocument = useNoteStore((s) => s.togglePinDocument);
  const toggleArchiveDocument = useNoteStore((s) => s.toggleArchiveDocument);
  const addTagToDocument = useNoteStore((s) => s.addTagToDocument);
  const removeTagFromDocument = useNoteStore((s) => s.removeTagFromDocument);

  const currentDoc = documents[docId];
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  const allVaultTags = useMemo(() => {
    const tagsSet = new Set<string>();
    Object.values(documents).forEach((doc) => {
      if (doc.tags) doc.tags.forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [documents]);

  if (!currentDoc || currentDoc.isFolder) return null;

  const currentTags = currentDoc.tags || [];

  const handleAddTag = (tagText: string) => {
    if (!tagText.trim()) return;
    addTagToDocument(docId, tagText);
    setNewTagInput("");
    setIsAddingTag(false);
    toast(`Added tag #${tagText.replace(/^#/, "")}`, "info");
  };

  return (
    <div
      className="graphite-tag-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px",
        marginBottom: "12px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        fontSize: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <Tag size={14} color="var(--accent-color)" />
        {currentTags.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              borderRadius: "12px",
              color: "var(--accent-color)",
              fontWeight: 500,
            }}
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTagFromDocument(docId, tag)}
              style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {isAddingTag ? (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="text"
              autoFocus
              placeholder="Tag name..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTag(newTagInput);
                if (e.key === "Escape") setIsAddingTag(false);
              }}
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "12px",
                width: "90px",
              }}
            />
            {allVaultTags.length > 0 && (
              <select
                onChange={(e) => e.target.value && handleAddTag(e.target.value)}
                defaultValue=""
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  fontSize: "11px",
                  padding: "2px",
                }}
              >
                <option value="" disabled>
                  Existing...
                </option>
                {allVaultTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingTag(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              background: "transparent",
              border: "1px dashed var(--border-color)",
              borderRadius: "12px",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <Plus size={12} /> Tag
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          type="button"
          className={`graphite-toolbar-btn${currentDoc.isPinned ? " active" : ""}`}
          title={currentDoc.isPinned ? "Unpin document" : "Pin document to top"}
          onClick={() => {
            togglePinDocument(docId);
            toast(currentDoc.isPinned ? "Document unpinned" : "Pinned to top!", "info");
          }}
          style={{ padding: "4px" }}
        >
          <Pin size={14} color={currentDoc.isPinned ? "var(--accent-color)" : "var(--text-muted)"} />
        </button>
        <button
          type="button"
          className={`graphite-toolbar-btn${currentDoc.isArchived ? " active" : ""}`}
          title={currentDoc.isArchived ? "Unarchive document" : "Archive document"}
          onClick={() => {
            toggleArchiveDocument(docId);
            toast(currentDoc.isArchived ? "Document unarchived" : "Archived document", "info");
          }}
          style={{ padding: "4px" }}
        >
          <Archive size={14} color={currentDoc.isArchived ? "#f87171" : "var(--text-muted)"} />
        </button>
      </div>
    </div>
  );
}
