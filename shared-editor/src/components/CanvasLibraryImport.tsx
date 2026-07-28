import { useCallback, useRef, useState } from "react";

const LIBRARY_KEY = "graphite_excalidraw_library";

function loadLibrary(): any[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLibrary(items: any[]) {
  try {
    if (!Array.isArray(items)) return;
    const valid = items.slice(0, 500).filter(item => item && typeof item === "object");
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(valid));
  } catch {}
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Props {
  excalidrawAPI: any;
}

export function CanvasLibraryImport({ excalidrawAPI }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const addImagesToLibrary = useCallback(async (dataURLs: string[]) => {
    const items: any[] = [];
    for (const dataURL of dataURLs) {
      items.push({
        type: "image",
        dataURL,
      });
    }
    const existing = loadLibrary();
    const merged = [...items, ...existing].slice(0, 500);
    saveLibrary(merged);
    if (excalidrawAPI?.updateLibrary) {
      await excalidrawAPI.updateLibrary({ libraryItems: merged });
    }
  }, [excalidrawAPI]);

  const handleFilePick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImporting(true);
    try {
      const dataURLs = await Promise.all(files.map(readFileAsDataURL));
      await addImagesToLibrary(dataURLs);
    } catch {}
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [addImagesToLibrary]);

  const handleUrlImport = useCallback(async () => {
    if (!url.trim()) return;
    setImporting(true);
    try {
      const resp = await fetch(url.trim());
      const blob = await resp.blob();
      const dataURL = await readFileAsDataURL(new File([blob], "imported", { type: blob.type }));
      await addImagesToLibrary([dataURL]);
      setUrl("");
      setShowUrlInput(false);
    } catch {}
    setImporting(false);
  }, [url, addImagesToLibrary]);

  return (
    <div className="canvas-library-import" style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        multiple
        style={{ display: "none" }}
        onChange={handleFilePick}
      />
      <button
        type="button"
        className="canvas-brush-preset-btn"
        title="Import images to library"
        disabled={importing}
        onClick={() => fileInputRef.current?.click()}
        style={{ fontSize: 14 }}
      >
        📁
      </button>
      <button
        type="button"
        className="canvas-brush-preset-btn"
        title="Import from URL"
        disabled={importing}
        onClick={() => setShowUrlInput(!showUrlInput)}
        style={{ fontSize: 14 }}
      >
        🔗
      </button>
      {showUrlInput && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/image.png"
            onKeyDown={(e) => { if (e.key === "Enter") handleUrlImport(); }}
            style={{
              padding: "2px 6px",
              borderRadius: 4,
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: 11,
              width: 180,
            }}
          />
          <button
            type="button"
            className="canvas-brush-preset-btn"
            onClick={handleUrlImport}
            disabled={importing || !url.trim()}
            style={{ fontSize: 10 }}
          >
            {importing ? "..." : "↲"}
          </button>
        </div>
      )}
    </div>
  );
}
