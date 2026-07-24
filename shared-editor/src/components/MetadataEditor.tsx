import { useState, useCallback } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { X, Plus, Tag } from "lucide-react";
import type { GraphiteDoc } from "../utils/docStorage";

interface MetadataEditorProps {
  docId: string;
}

export function MetadataEditor({ docId }: MetadataEditorProps) {
  const doc = useNoteStore((s) => s.documents[docId]) as GraphiteDoc | undefined;
  const updateDoc = useNoteStore((s) => s.updateDocMetadata);
  const [addingTag, setAddingTag] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (!doc || doc.isFolder) return null;

  const tags = doc.tags || [];
  const properties = doc.properties || {};

  const addTag = useCallback(() => {
    const t = addingTag.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      updateDoc(docId, { tags: [...tags, t] });
    }
    setAddingTag("");
  }, [addingTag, tags, docId, updateDoc]);

  const removeTag = useCallback((tag: string) => {
    updateDoc(docId, { tags: tags.filter((t) => t !== tag) });
  }, [tags, docId, updateDoc]);

  const updateProperty = useCallback((key: string, value: string) => {
    updateDoc(docId, { properties: { ...properties, [key]: value } });
    setEditingKey(null);
  }, [properties, docId, updateDoc]);

  const removeProperty = useCallback((key: string) => {
    const next = { ...properties };
    delete next[key];
    updateDoc(docId, { properties: next });
  }, [properties, docId, updateDoc]);

  const addProperty = useCallback(() => {
    if (editingKey && editValue.trim()) {
      updateProperty(editingKey, editValue.trim());
    }
  }, [editingKey, editValue, updateProperty]);

  return (
    <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "12px 16px", fontSize: "13px" }}>
      <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px", color: "var(--text-primary)" }}>Properties</div>

      <div style={{ marginBottom: "8px" }}>
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
            {tags.map((t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 6px", background: "rgba(99,102,241,0.1)", borderRadius: "6px", fontSize: "11px", color: "var(--accent-color)" }}>
                <Tag size={10} />#{t}
                <button onClick={() => removeTag(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", opacity: 0.6, display: "flex" }}><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: "4px" }}>
          <input value={addingTag} onChange={(e) => setAddingTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (addTag(), setAddingTag(""))} placeholder="Add tag…" style={{ flex: 1, padding: "4px 8px", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "12px", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }} />
          <button onClick={addTag} style={{ background: "var(--accent-color)", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "11px" }}><Plus size={12} /></button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {Object.entries(properties).map(([key, value]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {editingKey === key ? (
              <>
                <input value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addProperty(); if (e.key === "Escape") setEditingKey(null); }} autoFocus style={{ flex: 1, padding: "3px 6px", border: "1px solid var(--accent-color)", borderRadius: "4px", fontSize: "12px", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }} />
                <button onClick={addProperty} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-color)", padding: "2px", fontSize: "11px" }}>Save</button>
              </>
            ) : (
              <>
                <span style={{ fontWeight: 500, color: "var(--text-muted)", minWidth: "60px", fontSize: "12px" }}>{key}:</span>
                <span style={{ color: "var(--text-primary)", fontSize: "12px" }}>{value}</span>
                <button onClick={() => { setEditingKey(key); setEditValue(value); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px", marginLeft: "auto", fontSize: "11px" }}>Edit</button>
                <button onClick={() => removeProperty(key)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px", display: "flex" }}><X size={12} /></button>
              </>
            )}
          </div>
        ))}
      </div>

      {!editingKey && (
        <button onClick={() => { setEditingKey(""); setEditValue(""); }} style={{ marginTop: "6px", background: "none", border: "1px dashed var(--border-color)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "var(--text-muted)", fontSize: "12px", width: "100%" }}>
          <Plus size={12} style={{ marginRight: "4px" }} /> Add property
        </button>
      )}
    </div>
  );
}
