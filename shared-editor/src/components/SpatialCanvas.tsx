import { useState, useEffect, useRef, useCallback } from "react";
import { useNoteStore } from "../store/useNoteStore";
import type { SpatialCard, SpatialEdge } from "../utils/spatialCanvasStorage";
import { Move, ArrowUpRight, ExternalLink, Trash2, Download, Upload, Layout, Infinity } from "lucide-react";
import { ZoomControls } from "./ZoomControls";
import { exportToJsonCanvas, importFromJsonCanvas, downloadCanvasFile, uploadCanvasFile } from "../utils/canvasFormat";
import { extractTextFromPdf } from "../utils/pdfImport";

const PAGE_WIDTH = 800;
const PAGE_HEIGHT = 1100;
const PAGE_GAP = 40;

export function SpatialCanvas() {
  const documents = useNoteStore((s) => s.documents);
  const selectDocument = useNoteStore((s) => s.selectDocument);
  const setActiveTab = useNoteStore((s) => s.setActiveTab);
  const storeCards = useNoteStore((s) => s.spatialCards);
  const storeEdges = useNoteStore((s) => s.spatialEdges);
  const setSpatialData = useNoteStore((s) => s.setSpatialData);

  const [cards, setCards] = useState<SpatialCard[]>(storeCards);
  const [edges, setEdges] = useState<SpatialEdge[]>(storeEdges);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pageMode, setPageMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; cardX: number; cardY: number } | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (storeCards.length === 0 && Object.values(documents).some((d) => !d.isFolder)) {
      const docs = Object.values(documents).filter((d) => !d.isFolder);
      const seededCards: SpatialCard[] = docs.slice(0, 4).map((d, i) => ({
        id: "card_" + d.id,
        docId: d.id,
        title: d.title,
        x: (i % 2) * 320 + 100,
        y: Math.floor(i / 2) * 240 + 100,
        width: 280,
        height: 180,
      }));
      setCards(seededCards);
      setEdges([]);
      setSpatialData(seededCards, []);
    } else if (storeCards.length > 0) {
      setCards(storeCards);
      setEdges(storeEdges);
    }
  }, [documents]); // eslint-disable-line react-hooks/exhaustive-deps

  const getSnippet = (raw?: string): string => {
    if (!raw) return "Empty note";
    if (raw.trim().startsWith("enc:")) return "[Encrypted Document]";
    try {
      const parsed = JSON.parse(raw);
      let extracted = "";
      const extractText = (n: any) => {
        if (n.text) extracted += n.text + " ";
        if (n.children) n.children.forEach(extractText);
      };
      if (parsed.root) extractText(parsed.root);
      return extracted.trim().slice(0, 120) || "Empty note";
    } catch {
      return raw.slice(0, 120);
    }
  };

  const persist = useCallback((nextCards: SpatialCard[], nextEdges: SpatialEdge[]) => {
    setCards(nextCards);
    setEdges(nextEdges);
    setSpatialData(nextCards, nextEdges);
  }, [setSpatialData]);

  const addNoteToCanvas = (docId: string) => {
    const doc = documents[docId];
    if (!doc) return;
    if (cards.some((c) => c.docId === docId)) return;
    const newCard: SpatialCard = {
      id: "card_" + doc.id,
      docId: doc.id,
      title: doc.title,
      x: -offset.x + 100 + cards.length * 20,
      y: -offset.y + 100 + cards.length * 20,
      width: 280,
      height: 180,
    };
    persist([...cards, newCard], edges);
  };

  const addImageCard = (file: File, x: number, y: number) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const id = "img_" + Date.now().toString(36);
      const newCard: SpatialCard = {
        id,
        docId: id,
        title: file.name,
        x, y,
        width: 320,
        height: 240,
        imageUrl: dataUrl,
      };
      persist([...cards, newCard], edges);
    };
    reader.readAsDataURL(file);
  };

  // File drop handler for images and PDFs
  useEffect(() => {
    const el = dropAreaRef.current;
    if (!el) return;
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left - offset.x) / zoomLevel;
      const y = (e.clientY - rect.top - offset.y) / zoomLevel;

      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          addImageCard(file, x, y);
        } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          try {
            const text = await extractTextFromPdf(file);
            const pages = text.split(/\n\n(?=Page \d|$)/);
            pages.forEach((pageText, idx) => {
              const id = "pdf_" + Date.now().toString(36) + "_" + idx;
              const newCard: SpatialCard = {
                id,
                docId: id,
                title: `${file.name} — Page ${idx + 1}`,
                x: x + idx * 40,
                y: y + idx * 40,
                width: 400,
                height: 500,
                content: pageText.slice(0, 2000),
              };
              setCards((prev) => [...prev, newCard]);
            });
          } catch (err) {
            console.error("PDF import failed", err);
          }
        }
      }
    };
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("drop", handleDrop);
    return () => {
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("drop", handleDrop);
    };
  }, [offset, zoomLevel, cards, edges, persist]);

  // Page mode: generate page backgrounds
  const totalPages = pageMode ? Math.max(1, Math.ceil(cards.length / 3) + 1) : 0;

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "svg") {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      setConnectingFromId(null);
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      setOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
    } else if (draggedCardId && dragStartRef.current) {
      const dx = (e.clientX - dragStartRef.current.mouseX) / zoomLevel;
      const dy = (e.clientY - dragStartRef.current.mouseY) / zoomLevel;
      setCards((prev) => prev.map((c) => c.id === draggedCardId ? { ...c, x: dragStartRef.current!.cardX + dx, y: dragStartRef.current!.cardY + dy } : c));
    }
  };

  const handleMouseUpCanvas = () => {
    if (draggedCardId) persist(cards, edges);
    isPanningRef.current = false;
    setDraggedCardId(null);
    dragStartRef.current = null;
  };

  const handleCardMouseDown = (e: React.MouseEvent, card: SpatialCard) => {
    e.stopPropagation();
    if (connectingFromId && connectingFromId !== card.id) {
      persist(cards, [...edges, { id: "edge_" + Math.random().toString(36).slice(2), fromCardId: connectingFromId, toCardId: card.id }]);
      setConnectingFromId(null);
      return;
    }
    setDraggedCardId(card.id);
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, cardX: card.x, cardY: card.y };
  };

  const handleOpenDoc = (docId: string) => { selectDocument(docId); setActiveTab("editor"); };

  const removeCard = (cardId: string) => persist(cards.filter((c) => c.id !== cardId), edges.filter((e) => e.fromCardId !== cardId && e.toCardId !== cardId));

  const handleTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; handleMouseDownCanvas({ ...e, clientX: t.clientX, clientY: t.clientY, target: e.target } as unknown as React.MouseEvent); };
  const handleTouchMove = (e: React.TouchEvent) => { const t = e.touches[0]; handleMouseMoveCanvas({ ...e, clientX: t.clientX, clientY: t.clientY } as unknown as React.MouseEvent); };
  const handleTouchEnd = () => handleMouseUpCanvas();
  const handleCardTouchStart = (e: React.TouchEvent, card: SpatialCard) => { const t = e.touches[0]; handleCardMouseDown({ ...e, clientX: t.clientX, clientY: t.clientY } as unknown as React.MouseEvent, card); };

  return (
    <div ref={canvasRef} style={{ position: "relative", width: "100%", height: "calc(100vh - 140px)", minHeight: "500px" }}>
      <div
        ref={dropAreaRef}
        className="graphite-spatial-canvas"
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMoveCanvas}
        onMouseUp={handleMouseUpCanvas}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: "100%",
          height: "100%",
          background: pageMode ? "#1a1a22" : "#0f1015",
          backgroundImage: pageMode ? "none" : "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: `${24 * zoomLevel}px ${24 * zoomLevel}px`,
          borderRadius: "12px",
          border: "1px solid var(--border-color)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Top Bar Controls */}
        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 200, display: "flex", gap: "8px", background: "var(--bg-secondary)", padding: "6px 12px", borderRadius: "10px", border: "1px solid var(--border-color)", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}><Move size={14} /> Spatial Canvas</span>
          <div style={{ width: 1, background: "var(--border-color)", margin: "0 4px" }} />
          <button type="button" onClick={() => downloadCanvasFile(exportToJsonCanvas(cards, edges), "spatial-canvas.graphite-canvas")} title="Export canvas" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: "3px" }}><Download size={14} /> Export</button>
          <button type="button" onClick={async () => { const json = await uploadCanvasFile(); if (!json) return; const imported = importFromJsonCanvas(json); if (imported) persist(imported.cards, imported.edges); }} title="Import canvas" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: "3px" }}><Upload size={14} /> Import</button>
          <div style={{ width: 1, background: "var(--border-color)", margin: "0 4px" }} />
          <button type="button" onClick={() => { setPageMode((p) => !p); setOffset({ x: 0, y: 0 }); setZoomLevel(1); }} title="Toggle page mode" style={{ background: pageMode ? "var(--accent-color)" : "none", border: "none", cursor: "pointer", color: pageMode ? "#fff" : "var(--text-muted)", padding: "4px 8px", fontSize: "12px", display: "flex", alignItems: "center", gap: "3px", borderRadius: "6px" }}>
            {pageMode ? <Layout size={14} /> : <Infinity size={14} />} {pageMode ? "Page" : "Infinite"}
          </button>
          <div style={{ width: 1, background: "var(--border-color)", margin: "0 4px" }} />
          <select onChange={(e) => e.target.value && addNoteToCanvas(e.target.value)} defaultValue="" style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "12px", padding: "4px 8px" }}>
            <option value="" disabled>+ Add Card from Vault...</option>
            {Object.values(documents).filter((d) => !d.isFolder).map((d) => (<option key={d.id} value={d.id}>{d.title}</option>))}
          </select>
        </div>

        {/* Page navigation (page mode) */}
        {pageMode && (
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 200, display: "flex", gap: "4px", alignItems: "center", background: "var(--bg-secondary)", padding: "4px 8px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px 6px", fontSize: "14px", opacity: currentPage <= 1 ? 0.4 : 1 }}>◀</button>
            <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>{currentPage} / {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px 6px", fontSize: "14px", opacity: currentPage >= totalPages ? 0.4 : 1 }}>▶</button>
          </div>
        )}

        {/* Zoom Bar */}
        <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 200 }}>
          <ZoomControls zoomLevel={zoomLevel} minZoom={0.4} maxZoom={2} onZoomIn={() => setZoomLevel((z) => Math.min(2, z + 0.2))} onZoomOut={() => setZoomLevel((z) => Math.max(0.4, z - 0.2))} onResetZoom={() => { setZoomLevel(1); setOffset({ x: 0, y: 0 }); }} />
        </div>

        {/* Drop hint overlay */}
        <div style={{ position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)", zIndex: 199, fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "4px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", opacity: 0.6 }}>
          Drop images or PDFs to add cards
        </div>

        {/* Canvas Transform Viewport */}
        <div style={{ width: "100%", height: "100%", transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoomLevel})`, transformOrigin: "0 0", position: "absolute", top: 0, left: 0 }}>
          {/* SVG Arrow Connections */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
            {edges.map((edge) => {
              const fromCard = cards.find((c) => c.id === edge.fromCardId);
              const toCard = cards.find((c) => c.id === edge.toCardId);
              if (!fromCard || !toCard) return null;
              return (
                <g key={edge.id}>
                  <line x1={fromCard.x + fromCard.width / 2} y1={fromCard.y + fromCard.height / 2} x2={toCard.x + toCard.width / 2} y2={toCard.y + toCard.height / 2} stroke="#6366f1" strokeWidth="2.5" strokeDasharray="6,4" />
                  <circle cx={toCard.x + toCard.width / 2} cy={toCard.y + toCard.height / 2} r="4" fill="#a855f7" />
                </g>
              );
            })}
          </svg>

          {/* Page mode backgrounds */}
          {pageMode && Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            const py = (PAGE_HEIGHT + PAGE_GAP) * idx;
            return (
              <div key={`page-${pageNum}`} style={{ position: "absolute", top: py, left: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, background: "#1e1e28", borderRadius: "4px", border: "2px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 6, right: 12, fontSize: "11px", color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>{pageNum}</div>
                {pageNum === currentPage && <div style={{ position: "absolute", inset: 0, border: "2px solid var(--accent-color)", borderRadius: "2px", pointerEvents: "none" }} />}
              </div>
            );
          })}

          {/* Cards */}
          {cards.map((card) => {
            const doc = documents[card.docId];
            const textSnippet = card.content || getSnippet(doc?.editorState);
            return (
              <div
                key={card.id}
                onMouseDown={(e) => handleCardMouseDown(e, card)}
                onTouchStart={(e) => handleCardTouchStart(e, card)}
                style={{
                  position: "absolute",
                  top: card.y,
                  left: card.x,
                  width: card.width,
                  height: card.height,
                  background: card.imageUrl ? `url(${card.imageUrl}) center/cover no-repeat` : "var(--bg-secondary)",
                  border: connectingFromId === card.id ? "2px solid #a855f7" : "1px solid var(--border-color)",
                  borderRadius: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "move",
                  userSelect: "none",
                  overflow: "hidden",
                }}
              >
                {!card.imageUrl && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border-color)" }}>
                      <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {card.title || "Untitled Note"}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <button type="button" className="graphite-toolbar-btn" title="Connect arrow" onClick={(e) => { e.stopPropagation(); setConnectingFromId(card.id); }} style={{ padding: "2px", color: connectingFromId === card.id ? "#a855f7" : "var(--text-muted)" }}><ArrowUpRight size={14} /></button>
                        <button type="button" className="graphite-toolbar-btn" title="Open in Editor" onClick={(e) => { e.stopPropagation(); handleOpenDoc(card.docId); }} style={{ padding: "2px" }}><ExternalLink size={14} /></button>
                        <button type="button" className="graphite-toolbar-btn" title="Remove from canvas" onClick={(e) => { e.stopPropagation(); removeCard(card.id); }} style={{ padding: "2px" }}><Trash2 size={14} color="#f87171" /></button>
                      </div>
                    </div>
                    <div style={{ padding: "10px 12px", fontSize: "12px", color: "var(--text-secondary)", overflow: "hidden", flex: 1 }}>
                      {textSnippet || <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>Empty note content</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
