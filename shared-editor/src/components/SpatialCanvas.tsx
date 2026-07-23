import { useState, useEffect, useRef } from "react";
import { useNoteStore } from "../store/useNoteStore";
import type { SpatialCard, SpatialEdge } from "../utils/spatialCanvasStorage";
import { Move, ArrowUpRight, ExternalLink, Trash2 } from "lucide-react";
import { ZoomControls } from "./ZoomControls";

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

  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; cardX: number; cardY: number } | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (storeCards.length === 0 && Object.values(documents).some((d) => !d.isFolder)) {
      // Seed initial cards from existing documents
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

  const persist = (nextCards: SpatialCard[], nextEdges: SpatialEdge[]) => {
    setCards(nextCards);
    setEdges(nextEdges);
    setSpatialData(nextCards, nextEdges);
  };

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

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "svg") {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      setConnectingFromId(null);
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      setOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    } else if (draggedCardId && dragStartRef.current) {
      const dx = (e.clientX - dragStartRef.current.mouseX) / zoomLevel;
      const dy = (e.clientY - dragStartRef.current.mouseY) / zoomLevel;
      const nextCards = cards.map((c) => {
        if (c.id === draggedCardId) {
          return {
            ...c,
            x: dragStartRef.current!.cardX + dx,
            y: dragStartRef.current!.cardY + dy,
          };
        }
        return c;
      });
      setCards(nextCards);
    }
  };

  const handleMouseUpCanvas = () => {
    if (draggedCardId) {
      persist(cards, edges);
    }
    isPanningRef.current = false;
    setDraggedCardId(null);
    dragStartRef.current = null;
  };

  const handleCardMouseDown = (e: React.MouseEvent, card: SpatialCard) => {
    e.stopPropagation();
    if (connectingFromId && connectingFromId !== card.id) {
      // Connect arrow edge
      const newEdge: SpatialEdge = {
        id: "edge_" + Math.random().toString(36).slice(2),
        fromCardId: connectingFromId,
        toCardId: card.id,
      };
      persist(cards, [...edges, newEdge]);
      setConnectingFromId(null);
      return;
    }

    setDraggedCardId(card.id);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      cardX: card.x,
      cardY: card.y,
    };
  };

  const handleOpenDoc = (docId: string) => {
    selectDocument(docId);
    setActiveTab("editor");
  };

  const removeCard = (cardId: string) => {
    const nextCards = cards.filter((c) => c.id !== cardId);
    const nextEdges = edges.filter((e) => e.fromCardId !== cardId && e.toCardId !== cardId);
    persist(nextCards, nextEdges);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMouseDownCanvas({ ...e, clientX: touch.clientX, clientY: touch.clientY, target: e.target } as unknown as React.MouseEvent);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMouseMoveCanvas({ ...e, clientX: touch.clientX, clientY: touch.clientY } as unknown as React.MouseEvent);
  };

  const handleTouchEnd = () => {
    handleMouseUpCanvas();
  };

  const handleCardTouchStart = (e: React.TouchEvent, card: SpatialCard) => {
    const touch = e.touches[0];
    handleCardMouseDown({ ...e, clientX: touch.clientX, clientY: touch.clientY } as unknown as React.MouseEvent, card);
  };

  return (
    <div
      className="graphite-spatial-canvas"
      onMouseDown={handleMouseDownCanvas}
      onMouseMove={handleMouseMoveCanvas}
      onMouseUp={handleMouseUpCanvas}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "relative",
        width: "100%",
        height: "calc(100vh - 140px)",
        minHeight: "500px",
        background: "#0f1015",
        backgroundImage: "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        borderRadius: "12px",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
      }}
    >
      {/* Top Bar Controls */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 200,
          display: "flex",
          gap: "8px",
          background: "var(--bg-secondary)",
          padding: "6px 12px",
          borderRadius: "10px",
          border: "1px solid var(--border-color)",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
          <Move size={14} /> Spatial Canvas
        </span>
        <div style={{ width: 1, background: "var(--border-color)", margin: "0 4px" }} />
        <select
          onChange={(e) => e.target.value && addNoteToCanvas(e.target.value)}
          defaultValue=""
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            fontSize: "12px",
            padding: "4px 8px",
          }}
        >
          <option value="" disabled>
            + Add Card from Vault...
          </option>
          {Object.values(documents)
            .filter((d) => !d.isFolder)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
        </select>
      </div>

      {/* Zoom Bar */}
      <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 200 }}>
        <ZoomControls
          zoomLevel={zoomLevel}
          minZoom={0.4}
          maxZoom={2}
          onZoomIn={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
          onZoomOut={() => setZoomLevel((z) => Math.max(0.4, z - 0.2))}
          onResetZoom={() => { setZoomLevel(1); setOffset({ x: 0, y: 0 }); }}
        />
      </div>

      {/* Infinite Canvas Transform Viewport */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoomLevel})`,
          transformOrigin: "0 0",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {/* SVG Arrow Connections Layer */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
          {edges.map((edge) => {
            const fromCard = cards.find((c) => c.id === edge.fromCardId);
            const toCard = cards.find((c) => c.id === edge.toCardId);
            if (!fromCard || !toCard) return null;

            const x1 = fromCard.x + fromCard.width / 2;
            const y1 = fromCard.y + fromCard.height / 2;
            const x2 = toCard.x + toCard.width / 2;
            const y2 = toCard.y + toCard.height / 2;

            return (
              <g key={edge.id}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6366f1" strokeWidth="2.5" strokeDasharray="6,4" />
                <circle cx={x2} cy={y2} r="4" fill="#a855f7" />
              </g>
            );
          })}
        </svg>

        {/* Note Cards */}
        {cards.map((card) => {
          const doc = documents[card.docId];
          const textSnippet = getSnippet(doc?.editorState);

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
                background: "var(--bg-secondary)",
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
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.03)",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {card.title || "Untitled Note"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    type="button"
                    className="graphite-toolbar-btn"
                    title="Connect arrow to another card"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnectingFromId(card.id);
                    }}
                    style={{ padding: "2px", color: connectingFromId === card.id ? "#a855f7" : "var(--text-muted)" }}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="graphite-toolbar-btn"
                    title="Open in Editor"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDoc(card.docId);
                    }}
                    style={{ padding: "2px" }}
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button
                    type="button"
                    className="graphite-toolbar-btn"
                    title="Remove from canvas"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCard(card.id);
                    }}
                    style={{ padding: "2px" }}
                  >
                    <Trash2 size={14} color="#f87171" />
                  </button>
                </div>
              </div>

              {/* Card Body Snippet */}
              <div style={{ padding: "10px 12px", fontSize: "12px", color: "var(--text-secondary)", overflow: "hidden", flex: 1 }}>
                {textSnippet || <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>Empty note content</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
