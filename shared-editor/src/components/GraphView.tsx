import { useEffect, useRef, useState, useMemo } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { Network, Filter, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface NodeItem {
  id: string;
  title: string;
  isFolder: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isCurrent: boolean;
}

interface EdgeItem {
  source: string;
  target: string;
}

export function GraphView() {
  const documents = useNoteStore((s) => s.documents);
  const currentDocId = useNoteStore((s) => s.docId);
  const selectDocument = useNoteStore((s) => s.selectDocument);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  const { nodes, edges } = useMemo(() => {
    const rawDocs = Object.values(documents);
    const docMap = new Map(rawDocs.map((d) => [d.id, d]));

    let targetDocs = rawDocs;
    if (isLocalMode && currentDocId && docMap.has(currentDocId)) {
      const neighbors = new Set<string>([currentDocId]);
      const currentDoc = docMap.get(currentDocId)!;
      if (currentDoc.parentId) neighbors.add(currentDoc.parentId);
      for (const d of rawDocs) {
        if (d.parentId === currentDocId) neighbors.add(d.id);
      }
      targetDocs = rawDocs.filter((d) => neighbors.has(d.id));
    }

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      targetDocs = targetDocs.filter((d) => d.title.toLowerCase().includes(q));
    }

    const nodeItems: NodeItem[] = targetDocs.map((doc, idx) => {
      let hash = 0;
      for (let i = 0; i < doc.id.length; i++) {
        hash = (hash << 5) - hash + doc.id.charCodeAt(i);
        hash |= 0;
      }
      const normalized = (Math.abs(hash) % 1000) / 1000;
      const angle = (idx / Math.max(1, targetDocs.length)) * Math.PI * 2;
      const radiusDist = 120 + normalized * 80;
      return {
        id: doc.id,
        title: doc.title || "Untitled",
        isFolder: doc.isFolder,
        x: Math.cos(angle) * radiusDist,
        y: Math.sin(angle) * radiusDist,
        vx: 0,
        vy: 0,
        radius: doc.isFolder ? 10 : 8,
        color: doc.isFolder ? "#a855f7" : doc.id === currentDocId ? "#6366f1" : "#38bdf8",
        isCurrent: doc.id === currentDocId,
      };
    });

    const edgeItems: EdgeItem[] = [];
    const validIds = new Set(nodeItems.map((n) => n.id));
    const titleToIdMap = new Map<string, string>();
    targetDocs.forEach((d) => {
      if (!d.isFolder) titleToIdMap.set(d.title.toLowerCase(), d.id);
    });

    for (const doc of targetDocs) {
      if (doc.parentId && validIds.has(doc.parentId)) {
        edgeItems.push({ source: doc.id, target: doc.parentId });
      }
      // Parse [[WikiLinks]] inside editorState text content
      if (doc.editorState) {
        const matches = doc.editorState.matchAll(/\[\[(.*?)\]\]/g);
        for (const match of matches) {
          const targetTitle = match[1]?.trim().toLowerCase();
          if (targetTitle && titleToIdMap.has(targetTitle)) {
            const targetId = titleToIdMap.get(targetTitle)!;
            if (targetId !== doc.id && validIds.has(targetId)) {
              edgeItems.push({ source: doc.id, target: targetId });
            }
          }
        }
      }
    }

    return { nodes: nodeItems, edges: edgeItems };
  }, [documents, currentDocId, isLocalMode, filterQuery]);

  const nodesRef = useRef<NodeItem[]>([]);
  useEffect(() => {
    nodesRef.current = nodes.map((n) => ({ ...n }));
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animIdRef = { current: 0 };
    let mounted = true;

    const updateDimensions = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);
      if (w > 0 && h > 0 && (canvas.width !== targetW || canvas.height !== targetH)) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateDimensions();

    const simulate = () => {
      if (!mounted) return;
      updateDimensions();
      const currentNodes = nodesRef.current;
      if (currentNodes.length === 0) {
        if (mounted) animIdRef.current = requestAnimationFrame(simulate);
        return;
      }
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.clearRect(0, 0, width, height);

      ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
      ctx.scale(zoomLevel, zoomLevel);

      for (let i = 0; i < currentNodes.length; i++) {
        const n1 = currentNodes[i];
        for (let j = i + 1; j < currentNodes.length; j++) {
          const n2 = currentNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 220) {
            const force = ((220 - dist) / dist) * 0.05;
            n1.vx -= dx * force;
            n1.vy -= dy * force;
            n2.vx += dx * force;
            n2.vy += dy * force;
          }
        }
        n1.x += n1.vx;
        n1.y += n1.vy;
        n1.vx *= 0.85;
        n1.vy *= 0.85;
      }

      const nodeMap = new Map(currentNodes.map((n) => [n.id, n]));

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      for (const edge of edges) {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);
        if (s && t) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        }
      }

      for (const node of currentNodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.isCurrent ? node.color : "transparent";
        ctx.shadowBlur = node.isCurrent ? 16 : 0;
        ctx.fill();
        ctx.lineWidth = node.isCurrent ? 2.5 : 1;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.shadowBlur = 0;
        ctx.fillText(node.title, node.x, node.y + node.radius + 14);
      }

      ctx.restore();
      if (mounted) animIdRef.current = requestAnimationFrame(simulate);
    };

    animIdRef.current = requestAnimationFrame(simulate);
    return () => {
      mounted = false;
      cancelAnimationFrame(animIdRef.current);
    };
  }, [edges, zoomLevel, offset]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const mouseX = (e.clientX - rect.left - width / 2 - offset.x) / zoomLevel;
    const mouseY = (e.clientY - rect.top - height / 2 - offset.y) / zoomLevel;

    for (const node of nodesRef.current) {
      const dx = node.x - mouseX;
      const dy = node.y - mouseY;
      if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 6) {
        setDraggedNode(node.id);
        if (!node.isFolder) {
          selectDocument(node.id);
        }
        return;
      }
    }

    isPanningRef.current = true;
    startPanRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNode) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const mouseX = (e.clientX - rect.left - width / 2 - offset.x) / zoomLevel;
      const mouseY = (e.clientY - rect.top - height / 2 - offset.y) / zoomLevel;

      const target = nodesRef.current.find((n) => n.id === draggedNode);
      if (target) {
        target.x = mouseX;
        target.y = mouseY;
      }
    } else if (isPanningRef.current) {
      setOffset({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    isPanningRef.current = false;
  };

  const handleTouchStartCanvas = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    handleMouseDown({ ...e, clientX: touch.clientX, clientY: touch.clientY } as unknown as React.MouseEvent<HTMLCanvasElement>);
  };

  const handleTouchMoveCanvas = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    handleMouseMove({ ...e, clientX: touch.clientX, clientY: touch.clientY } as unknown as React.MouseEvent<HTMLCanvasElement>);
  };

  const handleTouchEndCanvas = () => {
    handleMouseUp();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel((prev) => Math.min(2.5, Math.max(0.4, prev + delta)));
  };

  return (
    <div className="graphite-graph-container" style={{ position: "relative", width: "100%", height: "calc(100vh - 140px)", minHeight: "500px", background: "#12131a", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
      <div className="graph-controls-bar" style={{ position: "absolute", top: 12, left: 12, zIndex: 10, display: "flex", gap: "8px", background: "var(--bg-secondary)", padding: "6px 12px", borderRadius: "10px", border: "1px solid var(--border-color)", backdropFilter: "blur(12px)" }}>
        <button
          className={`graphite-toolbar-btn${!isLocalMode ? " active" : ""}`}
          title="Global Vault Graph"
          onClick={() => setIsLocalMode(false)}
        >
          <Network size={15} />
          Global
        </button>
        <button
          className={`graphite-toolbar-btn${isLocalMode ? " active" : ""}`}
          title="Local Connected Graph"
          onClick={() => setIsLocalMode(true)}
        >
          <Filter size={15} />
          Local
        </button>
        <div style={{ width: 1, background: "var(--border-color)", margin: "0 4px" }} />
        <input
          type="text"
          placeholder="Filter notes..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", width: "140px" }}
        />
      </div>

      <div className="graph-zoom-bar" style={{ position: "absolute", bottom: 12, right: 12, zIndex: 10, display: "flex", gap: "6px", background: "var(--bg-secondary)", padding: "6px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
        <button className="graphite-toolbar-btn" title="Zoom In" onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}>
          <ZoomIn size={16} />
        </button>
        <button className="graphite-toolbar-btn" title="Zoom Out" onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.2))}>
          <ZoomOut size={16} />
        </button>
        <button className="graphite-toolbar-btn" title="Reset View" onClick={() => { setZoomLevel(1); setOffset({ x: 0, y: 0 }); }}>
          <Maximize2 size={16} />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStartCanvas}
        onTouchMove={handleTouchMoveCanvas}
        onTouchEnd={handleTouchEndCanvas}
        onWheel={handleWheel}
        style={{ width: "100%", height: "100%", cursor: isPanningRef.current ? "grabbing" : "grab", touchAction: "none" }}
      />
    </div>
  );
}
