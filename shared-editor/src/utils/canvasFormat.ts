export interface JsonCanvasNode {
  id: string;
  type: "text" | "file" | "group";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color?: string;
  label?: string;
  file?: string;
}

export interface JsonCanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: "top" | "right" | "bottom" | "left";
  fromPort?: string;
  toNode: string;
  toSide?: "top" | "right" | "bottom" | "left";
  toPort?: string;
  label?: string;
  color?: string;
}

export interface JsonCanvas {
  nodes: JsonCanvasNode[];
  edges: JsonCanvasEdge[];
}

function generateId(): string {
  return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Export internal spatial canvas data to JSON Canvas format
export function exportToJsonCanvas(cards: any[], edges: any[]): string {
  const canvas: JsonCanvas = { nodes: [], edges: [] };

  for (const card of cards) {
    const node: JsonCanvasNode = {
      id: card.id || generateId(),
      type: card.type === "group" ? "group" : "text",
      x: card.x || 0,
      y: card.y || 0,
      width: card.width || 200,
      height: card.height || 100,
      text: card.title || card.content || "",
      color: card.color,
    };
    canvas.nodes.push(node);
  }

  for (const edge of edges) {
    canvas.edges.push({
      id: edge.id || generateId(),
      fromNode: edge.from || edge.source || edge.fromNode,
      toNode: edge.to || edge.target || edge.toNode,
      label: edge.label,
      color: edge.color,
    });
  }

  return JSON.stringify(canvas, null, 2);
}

// Import from JSON Canvas format to internal data
export function importFromJsonCanvas(json: string): { cards: any[]; edges: any[] } | null {
  try {
    const canvas: JsonCanvas = JSON.parse(json);
    if (!canvas.nodes || !Array.isArray(canvas.nodes)) return null;

    const cards = canvas.nodes.map((n: JsonCanvasNode) => ({
      id: n.id,
      docId: n.id,
      type: n.type === "group" ? "group" : "note",
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      title: n.text || n.label || "",
      content: n.text || "",
      color: n.color || undefined,
    }));

    const edges = (canvas.edges || []).map((e: JsonCanvasEdge) => ({
      id: e.id,
      fromNode: e.fromNode,
      toNode: e.toNode,
      label: e.label,
      color: e.color,
    }));

    return { cards, edges };
  } catch {
    return null;
  }
}

export function downloadCanvasFile(json: string, filename: string = "canvas.graphite-canvas") {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function uploadCanvasFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".graphite-canvas,.canvas,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      try {
        const text = await file.text();
        resolve(text);
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}
