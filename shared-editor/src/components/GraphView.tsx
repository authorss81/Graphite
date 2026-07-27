import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { Network, Filter, Tags, Calendar, Save, Upload, X, ExternalLink } from "lucide-react";
import { ZoomControls } from "./ZoomControls";
import {
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide,
} from "d3-force";

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
  tags: string[];
  updatedAt: number;
  fx?: number | null;
  fy?: number | null;
}

interface EdgeItem {
  source: string;
  target: string;
  weight: number;
}

const GRAPH_LAYOUT_KEY = "graphite_graph_layouts";

function loadLayouts(): Record<string, { nodes: Record<string, { x: number; y: number }> }> {
  try {
    return JSON.parse(localStorage.getItem(GRAPH_LAYOUT_KEY) || "{}");
  } catch { return {}; }
}

function saveLayouts(layouts: Record<string, { nodes: Record<string, { x: number; y: number }> }>) {
  try { localStorage.setItem(GRAPH_LAYOUT_KEY, JSON.stringify(layouts)); } catch {}
}

const TAG_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4"];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) { hash = (hash << 5) - hash + tag.charCodeAt(i); hash |= 0; }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
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
  const simRef = useRef<any>(null);

  // ── Popup state (13.2) ─────────────────────────────────────────────────
  const [popupNode, setPopupNode] = useState<NodeItem | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  // ── Advanced filters (13.3) ────────────────────────────────────────────
  const [filterTag, setFilterTag] = useState("");
  const [filterDateRange, setFilterDateRange] = useState<{ start: number | null; end: number | null }>({ start: null, end: null });
  const [showFilters, setShowFilters] = useState(false);

  // ── Cluster by tag (13.4) ──────────────────────────────────────────────
  const [clusterByTag, setClusterByTag] = useState(false);

  // ── Timeline slider (13.6) ─────────────────────────────────────────────
  const [timelineYear, setTimelineYear] = useState<number | null>(null);

  // ── Saved layouts (13.7) ───────────────────────────────────────────────
  const savedLayouts = useMemo(() => loadLayouts(), []);
  const [activeLayout, setActiveLayout] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    Object.values(documents).forEach(d => d.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [documents]);

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
      const visited = new Set(neighbors);
      const queue = Array.from(neighbors);
      while (queue.length > 0) {
        const id = queue.shift()!;
        const doc = docMap.get(id);
        if (doc?.editorState) {
          const matches = doc.editorState.matchAll(/\[\[(.*?)\]\]/g);
          for (const match of matches) {
            const title = match[1]?.trim().toLowerCase();
            for (const d of rawDocs) {
              if (d.title.toLowerCase() === title && !visited.has(d.id)) {
                visited.add(d.id);
                neighbors.add(d.id);
                queue.push(d.id);
              }
            }
          }
        }
      }
      targetDocs = rawDocs.filter((d) => neighbors.has(d.id));
    }

    // Apply filters (13.3)
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      targetDocs = targetDocs.filter((d) => d.title.toLowerCase().includes(q));
    }

    if (filterTag) {
      targetDocs = targetDocs.filter((d) => d.tags?.includes(filterTag));
    }

    if (filterDateRange.start || filterDateRange.end) {
      targetDocs = targetDocs.filter((d) => {
        const t = d.updatedAt || 0;
        if (filterDateRange.start && t < filterDateRange.start) return false;
        if (filterDateRange.end && t > filterDateRange.end) return false;
        return true;
      });
    }

    if (timelineYear) {
      const yearStart = new Date(timelineYear, 0, 1).getTime();
      const yearEnd = new Date(timelineYear, 11, 31, 23, 59, 59).getTime();
      targetDocs = targetDocs.filter((d) => {
        const t = d.updatedAt || 0;
        return t >= yearStart && t <= yearEnd;
      });
    }

    // Apply saved layout positions
    let savedPos: Record<string, { x: number; y: number }> | null = null;
    if (activeLayout && savedLayouts[activeLayout]) {
      savedPos = savedLayouts[activeLayout].nodes;
    }

    const nodeItems: NodeItem[] = targetDocs.map((doc, idx) => {
      let hash = 0;
      for (let i = 0; i < doc.id.length; i++) { hash = (hash << 5) - hash + doc.id.charCodeAt(i); hash |= 0; }
      const normalized = (Math.abs(hash) % 1000) / 1000;
      const angle = (idx / Math.max(1, targetDocs.length)) * Math.PI * 2;
      const radiusDist = 120 + normalized * 80;

      let nodeColor = doc.isFolder ? "#a855f7" : doc.id === currentDocId ? "#6366f1" : "#38bdf8";
      if (clusterByTag && doc.tags?.length) {
        nodeColor = getTagColor(doc.tags[0]);
      }

      const saved = savedPos?.[doc.id];
      return {
        id: doc.id,
        title: doc.title || "Untitled",
        isFolder: doc.isFolder,
        x: saved?.x ?? Math.cos(angle) * radiusDist,
        y: saved?.y ?? Math.sin(angle) * radiusDist,
        vx: 0, vy: 0,
        radius: doc.isFolder ? 10 : 8,
        color: nodeColor,
        isCurrent: doc.id === currentDocId,
        tags: doc.tags || [],
        updatedAt: doc.updatedAt || 0,
      };
    });

    // Build edges with weights (13.5)
    const edgeMap = new Map<string, number>();
    const validIds = new Set(nodeItems.map((n) => n.id));
    const titleToIdMap = new Map<string, string>();
    targetDocs.forEach((d) => { if (!d.isFolder) titleToIdMap.set(d.title.toLowerCase(), d.id); });

    for (const doc of targetDocs) {
      if (doc.parentId && validIds.has(doc.parentId)) {
        const key = [doc.id, doc.parentId].sort().join("::");
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
      }
      if (doc.editorState) {
        const matches = doc.editorState.matchAll(/\[\[(.*?)\]\]/g);
        for (const match of matches) {
          const targetTitle = match[1]?.trim().toLowerCase();
          if (targetTitle && titleToIdMap.has(targetTitle)) {
            const targetId = titleToIdMap.get(targetTitle)!;
            if (targetId !== doc.id && validIds.has(targetId)) {
              const key = [doc.id, targetId].sort().join("::");
              edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
            }
          }
        }
      }
    }

    const edgeItems: EdgeItem[] = Array.from(edgeMap.entries()).map(([key, weight]) => {
      const [source, target] = key.split("::");
      return { source, target, weight: Math.min(weight, 5) };
    });

    return { nodes: nodeItems, edges: edgeItems };
  }, [documents, currentDocId, isLocalMode, filterQuery, filterTag, filterDateRange, clusterByTag, timelineYear, activeLayout, savedLayouts]);

  const nodesRef = useRef<NodeItem[]>([]);
  useEffect(() => {
    nodesRef.current = nodes.map((n) => ({ ...n }));
  }, [nodes]);

  // ── d3-force simulation (13.1) ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animIdRef = { current: 0 };
    let mounted = true;

    const simNodes = nodes.map((n) => ({ ...n }));
    const simLinks = edges.filter(e => {
      const s = simNodes.find(n => n.id === e.source);
      const t = simNodes.find(n => n.id === e.target);
      return s && t;
    }).map(e => {
      const sIdx = simNodes.findIndex(n => n.id === e.source);
      const tIdx = simNodes.findIndex(n => n.id === e.target);
      return { source: sIdx, target: tIdx, weight: e.weight };
    });

    const simulation = forceSimulation(simNodes as any)
      .force("link", forceLink(simLinks).id((d: any) => d.id).distance(100).strength((l: any) => 0.3 / (l.weight || 1)))
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(0, 0))
      .force("collide", forceCollide(18))
      .alphaDecay(0.08)
      .stop();

    simRef.current = simulation;

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

    const render = () => {
      if (!mounted) return;
      updateDimensions();
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.clearRect(0, 0, width, height);
      ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
      ctx.scale(zoomLevel, zoomLevel);

      // Draw edges with weight-based thickness (13.5)
      const nodeMap = new Map(simNodes.map((n: any) => [n.id, n]));
      for (const edge of edges) {
        const s = simNodes.find((n: any) => n.id === edge.source) as any;
        const t = simNodes.find((n: any) => n.id === edge.target) as any;
        if (s && t) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + edge.weight * 0.06})`;
          ctx.lineWidth = 0.5 + edge.weight * 0.8;
          ctx.stroke();
        }
      }

      // Draw nodes
      for (const n of simNodes as any) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color || "#38bdf8";
        ctx.shadowColor = n.isCurrent ? n.color : "transparent";
        ctx.shadowBlur = n.isCurrent ? 16 : 0;
        ctx.fill();
        ctx.lineWidth = n.isCurrent ? 2.5 : 1;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.shadowBlur = 0;
        const title = n.title.length > 20 ? n.title.slice(0, 18) + "…" : n.title;
        ctx.fillText(title.slice(0, 80), n.x, n.y + n.radius + 14);
      }

      ctx.restore();

      // Sync sim positions back to nodesRef for drag interaction
      if (!draggedNode) {
        simNodes.forEach((n: any, i: number) => {
          if (nodesRef.current[i]) {
            nodesRef.current[i].x = n.x;
            nodesRef.current[i].y = n.y;
          }
        });
      }

      if (mounted) animIdRef.current = requestAnimationFrame(render);
    };

    simulation.on("tick", render);
    simulation.restart();

    return () => {
      mounted = false;
      simulation.stop();
      simRef.current = null;
      cancelAnimationFrame(animIdRef.current);
    };
  }, [edges, zoomLevel, offset, nodes]);

  // ── 13.2: Popup on click ──────────────────────────────────────────────
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
        setPopupNode(node);
        setPopupPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        if (!node.isFolder) {
          selectDocument(node.id);
        }
        return;
      }
    }

    setPopupNode(null);
    isPanningRef.current = true;
    startPanRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNode) {
      const sim: any = simRef.current;
      const node = sim?.nodes()?.find((n: any) => n.id === draggedNode);
      if (node) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        node.fx = (e.clientX - rect.left - width / 2 - offset.x) / zoomLevel;
        node.fy = (e.clientY - rect.top - height / 2 - offset.y) / zoomLevel;
        if (sim) sim.alpha(0.3).restart();
      }
    } else if (isPanningRef.current) {
      setOffset({ x: e.clientX - startPanRef.current.x, y: e.clientY - startPanRef.current.y });
    }
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      const sim: any = simRef.current;
      const node = sim?.nodes()?.find((n: any) => n.id === draggedNode);
      if (node) { node.fx = null; node.fy = null; }
    }
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
  const handleTouchEndCanvas = () => handleMouseUp();
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoomLevel((prev) => Math.min(2.5, Math.max(0.4, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  };

  // ── 13.7: Save / load layouts ──────────────────────────────────────────
  const saveCurrentLayout = useCallback(() => {
    const name = prompt("Layout name:", `layout-${Date.now().toString(36)}`);
    if (!name || name === "__proto__" || name === "constructor" || name === "toString") return;
    const sim: any = simRef.current;
    const simNodes = sim?.nodes();
    const pos: Record<string, { x: number; y: number }> = {};
    if (simNodes) {
      simNodes.forEach((n: any) => { pos[n.id] = { x: n.x, y: n.y }; });
    } else {
      nodesRef.current.forEach(n => { pos[n.id] = { x: n.x, y: n.y }; });
    }
    const layouts = loadLayouts();
    layouts[name] = { nodes: pos };
    saveLayouts(layouts);
    setActiveLayout(name);
  }, []);

  const loadLayout = useCallback((name: string) => {
    setActiveLayout(name);
  }, []);

  const deleteLayout = useCallback((name: string) => {
    const layouts = loadLayouts();
    delete layouts[name];
    saveLayouts(layouts);
    if (activeLayout === name) setActiveLayout(null);
  }, [activeLayout]);

  const availableLayoutNames = useMemo(() => Object.keys(savedLayouts).filter(k => k !== "null"), [savedLayouts]);

  const dateRangeYears = useMemo(() => {
    const years = new Set<number>();
    Object.values(documents).forEach(d => {
      if (d.updatedAt) years.add(new Date(d.updatedAt).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [documents]);

  return (
    <div className="graphite-graph-container" style={{ position: "relative", width: "100%", height: "calc(100vh - 140px)", minHeight: "500px", background: "#12131a", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
      {/* ── Controls bar ── */}
      <div className="graph-controls-bar" style={{ position: "absolute", top: 12, left: 12, zIndex: 10, display: "flex", gap: "6px", background: "var(--bg-secondary)", padding: "6px 12px", borderRadius: "10px", border: "1px solid var(--border-color)", backdropFilter: "blur(12px)", flexWrap: "wrap", maxWidth: "calc(100% - 24px)" }}>
        <button className={`graphite-toolbar-btn${!isLocalMode ? " active" : ""}`} title="Global Vault Graph" onClick={() => setIsLocalMode(false)}><Network size={15} /> Global</button>
        <button className={`graphite-toolbar-btn${isLocalMode ? " active" : ""}`} title="Local Connected Graph" onClick={() => setIsLocalMode(true)}><Filter size={15} /> Local</button>
        <div style={{ width: 1, background: "var(--border-color)", margin: "0 4px" }} />
        <input type="text" placeholder="Filter notes..." value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", width: "120px" }} />
        <button className={`graphite-toolbar-btn${showFilters ? " active" : ""}`} title="Advanced filters" onClick={() => setShowFilters(p => !p)}><Tags size={14} /></button>
        <div style={{ width: 1, background: "var(--border-color)", margin: "0 4px" }} />

        {/* ── Layout save/load (13.7) ── */}
        <button className="graphite-toolbar-btn" title="Save current layout" onClick={saveCurrentLayout}><Save size={14} /></button>
        {availableLayoutNames.length > 0 && (
          <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
            <select value={activeLayout || ""} onChange={(e) => e.target.value ? loadLayout(e.target.value) : null} style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "4px", fontSize: "10px", padding: "2px 4px", maxWidth: "100px" }}>
              <option value="">Load layout...</option>
              {availableLayoutNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            {activeLayout && <button className="graphite-toolbar-btn" title="Delete layout" onClick={() => deleteLayout(activeLayout)} style={{ color: "#ef4444" }}><X size={12} /></button>}
          </div>
        )}

        {/* ── Cluster toggle (13.4) ── */}
        <button className={`graphite-toolbar-btn${clusterByTag ? " active" : ""}`} title="Cluster by tag" onClick={() => setClusterByTag(p => !p)}>Cluster</button>

        {/* ── Timeline (13.6) ── */}
        {dateRangeYears.length > 0 && (
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <Calendar size={12} style={{ color: "var(--text-muted)" }} />
            <select value={timelineYear || ""} onChange={(e) => setTimelineYear(e.target.value ? Number(e.target.value) : null)} style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "4px", fontSize: "10px", padding: "2px 4px" }}>
              <option value="">All time</option>
              {dateRangeYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Advanced filter panel (13.3) ── */}
      {showFilters && (
        <div style={{ position: "absolute", top: 52, left: 12, zIndex: 11, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "12px", backdropFilter: "blur(12px)", minWidth: "200px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>Advanced Filters</div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>By Tag</label>
            <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} style={{ width: "100%", background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px" }}>
              <option value="">All tags</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Modified after</label>
            <input type="date" onChange={(e) => setFilterDateRange(p => ({ ...p, start: e.target.value ? new Date(e.target.value).getTime() : null }))} style={{ width: "100%", background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px" }} />
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Modified before</label>
            <input type="date" onChange={(e) => setFilterDateRange(p => ({ ...p, end: e.target.value ? new Date(e.target.value).getTime() : null }))} style={{ width: "100%", background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px" }} />
          </div>
          <button type="button" onClick={() => { setFilterTag(""); setFilterDateRange({ start: null, end: null }); setTimelineYear(null); }} style={{ fontSize: "11px", padding: "4px 8px", background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "none", borderRadius: "6px", cursor: "pointer" }}>Clear filters</button>
        </div>
      )}

      {/* ── Node popup (13.2) ── */}
      {popupNode && (
        <div style={{
          position: "absolute", top: popupPos.y + 20, left: popupPos.x + 20, zIndex: 20,
          background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "10px",
          padding: "12px 16px", backdropFilter: "blur(12px)", minWidth: "180px", maxWidth: "260px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{popupNode.title}</span>
            <button type="button" onClick={() => setPopupNode(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}><X size={14} /></button>
          </div>
          {popupNode.tags.length > 0 && (
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "6px" }}>
              {popupNode.tags.map(t => <span key={t} style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: getTagColor(t) + "33", color: getTagColor(t) }}>{t}</span>)}
            </div>
          )}
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>
            {popupNode.isFolder ? "📁 Folder" : "📄 Document"}
            {popupNode.updatedAt > 0 && ` · ${new Date(popupNode.updatedAt).toLocaleDateString()}`}
          </div>
          <button type="button" onClick={() => { selectDocument(popupNode.id); setPopupNode(null); }} style={{ width: "100%", padding: "6px 12px", background: "var(--accent-color)", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}><ExternalLink size={12} /> Open</button>
        </div>
      )}

      {/* ── Legend ── */}
      {clusterByTag && allTags.length > 0 && (
        <div style={{ position: "absolute", bottom: 60, left: 12, zIndex: 10, background: "rgba(18,19,26,0.9)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "8px 10px", fontSize: "10px", backdropFilter: "blur(8px)", maxHeight: "150px", overflowY: "auto" }}>
          {allTags.map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 0" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: getTagColor(t), flexShrink: 0 }} />
              <span style={{ color: "var(--text-muted)" }}>{t}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 10 }}>
        <ZoomControls zoomLevel={zoomLevel} minZoom={0.4} maxZoom={2.5}
          onZoomIn={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
          onZoomOut={() => setZoomLevel((z) => Math.max(0.4, z - 0.2))}
          onResetZoom={() => { setZoomLevel(1); setOffset({ x: 0, y: 0 }); }} />
      </div>

      <canvas ref={canvasRef}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStartCanvas} onTouchMove={handleTouchMoveCanvas} onTouchEnd={handleTouchEndCanvas}
        onWheel={handleWheel}
        style={{ width: "100%", height: "100%", cursor: isPanningRef.current ? "grabbing" : "grab", touchAction: "none" }} />
    </div>
  );
}
