import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNoteStore } from "../store/useNoteStore";
import type { SpatialCard, SpatialEdge } from "../utils/spatialCanvasStorage";
import { Move, ArrowUpRight, ExternalLink, Trash2, Download, Upload, Layout, InfinityIcon, Search, Palette, Grid3X3, Minimize2, CheckSquare } from "lucide-react";
import { ZoomControls } from "./ZoomControls";
import { exportToJsonCanvas, importFromJsonCanvas, downloadCanvasFile, uploadCanvasFile } from "../utils/canvasFormat";
import { extractTextFromPdf } from "../utils/pdfImport";

const PAGE_WIDTH = 800;
const PAGE_HEIGHT = 1100;
const PAGE_GAP = 40;
const CARD_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4"];

// ── Rich content renderer ──────────────────────────────────────────────────
function renderLexicalContent(raw: string | undefined): { text: string; segments: { type: string; text: string }[] } {
  if (!raw) return { text: "", segments: [] };
  if (raw.trim().startsWith("enc:")) return { text: "[Encrypted Document]", segments: [] };
  try {
    const parsed = JSON.parse(raw);
    const segments: { type: string; text: string }[] = [];
    const walk = (n: any) => {
      if (n.type === "heading") {
        const tag = n.tag || "h1";
        const t = n.children?.map((c: any) => c.text || "").join("") || "";
        segments.push({ type: tag, text: t });
      } else if (n.type === "list") {
        n.children?.forEach((li: any) => {
          const t = li.children?.map((c: any) => c.text || "").join("") || "";
          segments.push({ type: "li", text: t });
        });
      } else if (n.type === "listitem") {
        const t = n.children?.map((c: any) => c.text || "").join("") || "";
        segments.push({ type: "li", text: t });
      } else if (n.type === "checklist") {
        n.children?.forEach((li: any) => {
          const checked = li.checked || false;
          const t = li.children?.map((c: any) => c.text || "").join("") || "";
          segments.push({ type: checked ? "checked" : "unchecked", text: t });
        });
      } else if (n.format & 1 && n.text) {
        segments.push({ type: "bold", text: n.text });
      } else if (n.text) {
        segments.push({ type: "text", text: n.text });
      }
      if (n.children) n.children.forEach(walk);
    };
    if (parsed.root) walk(parsed.root);
    const text = segments.map((s) => s.text).join(" ").slice(0, 200);
    return { text, segments: segments.slice(0, 20) };
  } catch {
    return { text: raw.slice(0, 200), segments: [{ type: "text", text: raw.slice(0, 200) }] };
  }
}

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
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  // ── Multi-select state ────────────────────────────────────────────────
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [groupDrag, setGroupDrag] = useState<{ originX: number; originY: number } | null>(null);
  const groupDragRef = useRef<{ cardOrigins: Map<string, { x: number; y: number }> } | null>(null);

  // ── Search state ───────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Minimap state ──────────────────────────────────────────────────────
  const [showMinimap, setShowMinimap] = useState(true);

  // ── Color picker state ─────────────────────────────────────────────────
  const [colorPickerCardId, setColorPickerCardId] = useState<string | null>(null);

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
  }, [documents]);

  const getCardColor = (card: SpatialCard): string => {
    if (card.color) return card.color;
    const doc = documents[card.docId];
    if (doc?.tags?.length) {
      const idx = doc.tags.join("").length % CARD_COLORS.length;
      return CARD_COLORS[idx];
    }
    return "transparent";
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
      const newCard: SpatialCard = { id, docId: id, title: file.name, x, y, width: 320, height: 240, imageUrl: dataUrl };
      persist([...cards, newCard], edges);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const el = dropAreaRef.current;
    if (!el) return;
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation();
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
              const newCards = pages.map((pageText, idx) => ({
                id: "pdf_" + Date.now().toString(36) + "_" + idx,
                docId: "pdf_" + Date.now().toString(36) + "_" + idx,
                title: `${file.name} — Page ${idx + 1}`,
                x: x + idx * 40,
                y: y + idx * 40,
                width: 400,
                height: 500,
                content: pageText.slice(0, 2000),
              }));
              persist([...cards, ...newCards], edges);
            } catch (err) { console.error("PDF import failed", err); }
        }
      }
    };
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("drop", handleDrop);
    return () => { el.removeEventListener("dragover", handleDragOver); el.removeEventListener("drop", handleDrop); };
  }, [offset, zoomLevel, cards, edges, persist]);

  // ── Auto-layout ──────────────────────────────────────────────────────
  const arrangeGrid = useCallback(() => {
    const cols = Math.ceil(Math.sqrt(cards.length));
    const gapX = 320;
    const gapY = 220;
    const arranged = cards.map((c, i) => ({ ...c, x: (i % cols) * gapX + 50, y: Math.floor(i / cols) * gapY + 50 }));
    persist(arranged, edges);
  }, [cards, edges, persist]);

  // ── Multi-select handlers ─────────────────────────────────────────────
  const toggleSelect = (cardId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      setSelectedCardIds((prev) => {
        const next = new Set(prev);
        if (next.has(cardId)) next.delete(cardId);
        else next.add(cardId);
        return next;
      });
    } else {
      setSelectedCardIds(new Set([cardId]));
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "SVG" || (e.target as HTMLElement).tagName === "svg") {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) setSelectedCardIds(new Set());
    }
  };

  const deleteSelectedCards = () => {
    const ids = new Set(selectedCardIds);
    if (ids.size === 0) return;
    persist(
      cards.filter((c) => !ids.has(c.id)),
      edges.filter((e) => !ids.has(e.fromCardId) && !ids.has(e.toCardId))
    );
    setSelectedCardIds(new Set());
  };

  const groupSelectedCards = () => {
    if (selectedCardIds.size < 2) return;
    const newColor = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
    persist(
      cards.map((c) => selectedCardIds.has(c.id) ? { ...c, color: newColor } : c),
      edges
    );
  };

  const handleGroupDragStart = (e: React.MouseEvent, cardId: string) => {
    if (!selectedCardIds.has(cardId) || selectedCardIds.size <= 1) return;
    const origins = new Map<string, { x: number; y: number }>();
    cards.filter((c) => selectedCardIds.has(c.id)).forEach((c) => origins.set(c.id, { x: c.x, y: c.y }));
    groupDragRef.current = { cardOrigins: origins };
    setGroupDrag({ originX: e.clientX, originY: e.clientY });
    setDraggedCardId(cardId);
  };

  // ── Search ─────────────────────────────────────────────────────────────
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const ql = q.toLowerCase();
    const results = cards.filter((c) => c.title.toLowerCase().includes(ql) || (c.content || "").toLowerCase().includes(ql));
    setSearchResults(results.map((c) => c.id));
  }, [cards]);

  const zoomToCard = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    setHighlightedCardId(cardId);
    const targetZoom = 1.5;
    const container = cardsContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const targetX = -(card.x * targetZoom - rect.width / 2 + card.width * targetZoom / 2);
      const targetY = -(card.y * targetZoom - rect.height / 2 + card.height * targetZoom / 2);
      setOffset({ x: targetX, y: targetY });
      setZoomLevel(targetZoom);
    }
    setTimeout(() => setHighlightedCardId(null), 1500);
    setSearchQuery("");
    setSearchResults([]);
  };

  // ── Minimap ────────────────────────────────────────────────────────────
  const minimapBounds = useMemo(() => {
    if (cards.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cards.forEach((c) => {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x + c.width > maxX) maxX = c.x + c.width;
      if (c.y + c.height > maxY) maxY = c.y + c.height;
    });
    return { minX, minY, maxX, maxY };
  }, [cards]);

  const totalPages = pageMode ? Math.max(1, Math.ceil(cards.length / 3)) : 0;

  // ── Mouse handlers ─────────────────────────────────────────────────────
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest("svg")) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      setConnectingFromId(null);
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) setSelectedCardIds(new Set());
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      setOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
    } else if (draggedCardId && dragStartRef.current && !groupDrag) {
      const dx = (e.clientX - dragStartRef.current.mouseX) / zoomLevel;
      const dy = (e.clientY - dragStartRef.current.mouseY) / zoomLevel;
      setCards((prev) => prev.map((c) => c.id === draggedCardId ? { ...c, x: dragStartRef.current!.cardX + dx, y: dragStartRef.current!.cardY + dy } : c));
    } else if (draggedCardId && groupDrag && groupDragRef.current) {
      const dx = (e.clientX - groupDrag.originX) / zoomLevel;
      const dy = (e.clientY - groupDrag.originY) / zoomLevel;
      setCards((prev) => prev.map((c) => {
        const origin = groupDragRef.current!.cardOrigins.get(c.id);
        return origin ? { ...c, x: origin.x + dx, y: origin.y + dy } : c;
      }));
    }
  };

  const handleMouseUpCanvas = () => {
    if (draggedCardId) persist(cards, edges);
    isPanningRef.current = false;
    setDraggedCardId(null);
    setGroupDrag(null);
    groupDragRef.current = null;
    dragStartRef.current = null;
  };

  const handleCardMouseDown = (e: React.MouseEvent, card: SpatialCard) => {
    e.stopPropagation();
    toggleSelect(card.id, e);
    if (connectingFromId && connectingFromId !== card.id) {
      persist(cards, [...edges, { id: "edge_" + Math.random().toString(36).slice(2), fromCardId: connectingFromId, toCardId: card.id }]);
      setConnectingFromId(null);
      return;
    }
    if (selectedCardIds.has(card.id) && selectedCardIds.size > 1 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      handleGroupDragStart(e, card.id);
      return;
    }
    setDraggedCardId(card.id);
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, cardX: card.x, cardY: card.y };
  };

  const handleOpenDoc = (docId: string) => { selectDocument(docId); setActiveTab("editor"); };

  const removeCard = (cardId: string) => {
    const newCards = cards.filter((c) => c.id !== cardId);
    persist(newCards, edges.filter((e) => e.fromCardId !== cardId && e.toCardId !== cardId));
    setSelectedCardIds((prev) => { const n = new Set(prev); n.delete(cardId); return n; });
  };

  const setCardColor = (cardId: string, color: string) => {
    persist(cards.map((c) => c.id === cardId ? { ...c, color } : c), edges);
    setColorPickerCardId(null);
  };

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
        onClick={handleCanvasClick}
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
        {/* ── Top Bar ── */}
        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 200, display: "flex", gap: "6px", background: "var(--bg-secondary)", padding: "6px 12px", borderRadius: "10px", border: "1px solid var(--border-color)", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}><Move size={14} /> Spatial</span>
          <div style={{ width: 1, background: "var(--border-color)", margin: "0 2px" }} />
          <button type="button" onClick={arrangeGrid} title="Arrange All (grid)" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: "3px" }}><Grid3X3 size={14} /> Arrange</button>
          <button type="button" onClick={() => downloadCanvasFile(exportToJsonCanvas(cards, edges), "spatial-canvas.graphite-canvas")} title="Export" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: "3px" }}><Download size={14} /></button>
          <button type="button" onClick={async () => { const json = await uploadCanvasFile(); if (!json) return; const imported = importFromJsonCanvas(json); if (imported) persist(imported.cards, imported.edges); }} title="Import" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: "3px" }}><Upload size={14} /></button>
          <div style={{ width: 1, background: "var(--border-color)", margin: "0 2px" }} />
          <button type="button" onClick={() => { setPageMode((p) => !p); setOffset({ x: 0, y: 0 }); setZoomLevel(1); }} title="Toggle page mode" style={{ background: pageMode ? "var(--accent-color)" : "none", border: "none", cursor: "pointer", color: pageMode ? "#fff" : "var(--text-muted)", padding: "4px 8px", fontSize: "12px", display: "flex", alignItems: "center", gap: "3px", borderRadius: "6px" }}>
            {pageMode ? <Layout size={14} /> : <InfinityIcon size={14} />} {pageMode ? "Page" : "Infinite"}
          </button>
          <button type="button" onClick={() => setShowMinimap((p) => !p)} title="Toggle minimap" style={{ background: "none", border: "none", cursor: "pointer", color: showMinimap ? "var(--accent-color)" : "var(--text-muted)", padding: "4px" }}><Minimize2 size={14} /></button>
          <div style={{ width: 1, background: "var(--border-color)", margin: "0 2px" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={12} style={{ position: "absolute", left: 6, color: "var(--text-muted)", pointerEvents: "none" }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: "110px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 6px 4px 22px", fontSize: "11px", color: "var(--text-primary)", outline: "none" }}
            />
            {searchResults.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "6px", marginTop: "4px", maxHeight: "200px", overflowY: "auto", zIndex: 300 }}>
                {searchResults.map((id) => {
                  const c = cards.find((cc) => cc.id === id);
                  if (!c) return null;
                  return (
                    <div key={id} onClick={() => zoomToCard(id)} style={{ padding: "6px 8px", cursor: "pointer", fontSize: "11px", color: "var(--text-primary)", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: getCardColor(c) || "var(--text-muted)", flexShrink: 0 }} />
                      {c.title}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ width: 1, background: "var(--border-color)", margin: "0 2px" }} />
          <select onChange={(e) => e.target.value && addNoteToCanvas(e.target.value)} defaultValue="" style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "11px", padding: "4px 6px", maxWidth: "140px" }}>
            <option value="" disabled>+ Add Card...</option>
            {Object.values(documents).filter((d) => !d.isFolder).map((d) => (<option key={d.id} value={d.id}>{d.title}</option>))}
          </select>
          {selectedCardIds.size > 0 && (
            <>
              <div style={{ width: 1, background: "var(--border-color)", margin: "0 2px" }} />
              <span style={{ fontSize: "11px", color: "var(--accent-color)", fontWeight: 500 }}>{selectedCardIds.size} selected</span>
              <button type="button" onClick={deleteSelectedCards} title="Delete selected" style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px" }}><Trash2 size={14} /></button>
              <button type="button" onClick={groupSelectedCards} title="Group selected (assign same color)" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}><Palette size={14} /></button>
            </>
          )}
        </div>

        {/* Page navigation */}
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

        {/* Drop hint */}
        <div style={{ position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)", zIndex: 199, fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "4px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", opacity: 0.6 }}>
          Drop images or PDFs to add cards
        </div>

        {/* ── Minimap ── */}
        {showMinimap && cards.length > 0 && (
          <div style={{ position: "absolute", bottom: 60, left: 12, zIndex: 200, width: "140px", height: "100px", background: "rgba(15,16,21,0.9)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden", backdropFilter: "blur(8px)" }}>
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              {cards.map((c) => {
                const mapW = 140;
                const mapH = 100;
                const rangeW = minimapBounds.maxX - minimapBounds.minX || 1;
                const rangeH = minimapBounds.maxY - minimapBounds.minY || 1;
                const cx = (c.x + c.width / 2 - minimapBounds.minX) / rangeW * mapW;
                const cy = (c.y + c.height / 2 - minimapBounds.minY) / rangeH * mapH;
                return (
                  <div
                    key={c.id}
                    onClick={() => zoomToCard(c.id)}
                    style={{ position: "absolute", left: cx - 3, top: cy - 2, width: 6, height: 4, borderRadius: "2px", background: getCardColor(c) || "var(--accent-color)", cursor: "pointer", opacity: 0.7 }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── Transform Viewport ── */}
        <div ref={cardsContainerRef} style={{ width: "100%", height: "100%", transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoomLevel})`, transformOrigin: "0 0", position: "absolute", top: 0, left: 0 }}>
          {/* SVG Edges */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
            {edges.map((edge) => {
              const fromCard = cards.find((c) => c.id === edge.fromCardId);
              const toCard = cards.find((c) => c.id === edge.toCardId);
              if (!fromCard || !toCard) return null;
              return (
                <g key={edge.id}>
                  <line x1={fromCard.x + fromCard.width / 2} y1={fromCard.y + fromCard.height / 2} x2={toCard.x + toCard.width / 2} y2={toCard.y + toCard.height / 2} stroke={getCardColor(toCard) || "#6366f1"} strokeWidth="2.5" strokeDasharray="6,4" />
                  <circle cx={toCard.x + toCard.width / 2} cy={toCard.y + toCard.height / 2} r="4" fill={getCardColor(toCard) || "#a855f7"} />
                </g>
              );
            })}
          </svg>

          {/* Page backgrounds */}
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
          {(pageMode ? cards.filter((_, i) => Math.floor(i / 3) === currentPage - 1) : cards).map((card) => {
            const doc = documents[card.docId];
            const content = renderLexicalContent(doc?.editorState);
            const textSnippet = card.content || content.text;
            const isSelected = selectedCardIds.has(card.id);
            const cardColor = getCardColor(card);
            const isHighlighted = highlightedCardId === card.id;

            return (
              <div
                key={card.id}
                ref={(el) => { if (el) cardRefsMap.current.set(card.id, el); else cardRefsMap.current.delete(card.id); }}
                onMouseDown={(e) => handleCardMouseDown(e, card)}
                onTouchStart={(e) => handleCardTouchStart(e, card)}
                style={{
                  position: "absolute",
                  top: card.y,
                  left: card.x,
                  width: card.width,
                  height: card.height,
                  background: card.imageUrl ? `url(${card.imageUrl}) center/cover no-repeat` : "var(--bg-secondary)",
                  border: isHighlighted ? "2px solid #fbbf24" : isSelected ? "2px solid var(--accent-color)" : connectingFromId === card.id ? "2px solid #a855f7" : "1px solid var(--border-color)",
                  borderRadius: "12px",
                  boxShadow: isSelected ? "0 0 0 2px var(--accent-color), 0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.4)",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "move",
                  userSelect: "none",
                  overflow: "hidden",
                  transition: isHighlighted ? "border-color 0.2s ease" : "none",
                }}
              >
                {!card.imageUrl && (
                  <>
                    {/* Card header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: cardColor !== "transparent" ? cardColor : "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border-color)" }}>
                      <span style={{ fontWeight: 600, fontSize: "12px", color: cardColor !== "transparent" ? "#fff" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {card.title || "Untitled Note"}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
                        <button type="button" className="graphite-toolbar-btn" title="Card color" onClick={(e) => { e.stopPropagation(); setColorPickerCardId(colorPickerCardId === card.id ? null : card.id); }} style={{ padding: "2px", color: "var(--text-muted)" }}><Palette size={12} /></button>
                        <button type="button" className="graphite-toolbar-btn" title="Connect arrow" onClick={(e) => { e.stopPropagation(); setConnectingFromId(card.id); }} style={{ padding: "2px", color: connectingFromId === card.id ? "#a855f7" : "var(--text-muted)" }}><ArrowUpRight size={12} /></button>
                        <button type="button" className="graphite-toolbar-btn" title="Open in Editor" onClick={(e) => { e.stopPropagation(); handleOpenDoc(card.docId); }} style={{ padding: "2px" }}><ExternalLink size={12} /></button>
                        <button type="button" className="graphite-toolbar-btn" title="Remove" onClick={(e) => { e.stopPropagation(); removeCard(card.id); }} style={{ padding: "2px" }}><Trash2 size={12} color="#f87171" /></button>
                      </div>
                    </div>
                    {/* Color picker dropdown */}
                    {colorPickerCardId === card.id && (
                      <div style={{ position: "absolute", top: 32, left: 10, zIndex: 50, display: "flex", gap: "3px", padding: "4px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }} onClick={(e) => e.stopPropagation()}>
                        {CARD_COLORS.map((clr) => (
                          <div key={clr} onClick={() => setCardColor(card.id, clr)} style={{ width: 14, height: 14, borderRadius: "50%", background: clr, cursor: "pointer", border: card.color === clr ? "2px solid #fff" : "2px solid transparent" }} />
                        ))}
                        <div onClick={() => setCardColor(card.id, "")} style={{ width: 14, height: 14, borderRadius: "50%", background: "transparent", cursor: "pointer", border: "2px dashed var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: "var(--text-muted)" }}>✕</div>
                      </div>
                    )}
                    {/* Rich content */}
                    <div style={{ padding: "8px 10px", fontSize: "11px", color: "var(--text-secondary)", overflow: "hidden", flex: 1, lineHeight: "1.5" }}>
                      {content.segments.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {content.segments.map((seg, i) => {
                            if (seg.type === "h1" || seg.type === "h2" || seg.type === "h3") {
                              return <span key={i} style={{ fontWeight: 700, fontSize: "12px", color: "var(--text-primary)" }}>{seg.text}</span>;
                            }
                            if (seg.type === "bold") {
                              return <span key={i} style={{ fontWeight: 700 }}>{seg.text}</span>;
                            }
                            if (seg.type === "li") {
                              return <span key={i} style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}><span style={{ color: "var(--text-muted)" }}>•</span> {seg.text}</span>;
                            }
                            if (seg.type === "checked") {
                              return <span key={i} style={{ display: "flex", alignItems: "flex-start", gap: "4px", color: "var(--text-muted)", textDecoration: "line-through" }}><CheckSquare size={10} style={{ flexShrink: 0, marginTop: 2 }} color="#10b981" /> {seg.text}</span>;
                            }
                            if (seg.type === "unchecked") {
                              return <span key={i} style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}><CheckSquare size={10} style={{ flexShrink: 0, marginTop: 2 }} /> {seg.text}</span>;
                            }
                            return <span key={i}>{seg.text}</span>;
                          })}
                        </div>
                      ) : (
                        textSnippet || <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>Empty note content</span>
                      )}
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
