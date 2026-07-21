import { describe, it, expect } from "vitest";
import { createEditor } from "lexical";
import { $createCanvasNode, $isCanvasNode, CanvasNode } from "./CanvasNode";

const editor = createEditor({ nodes: [CanvasNode] });

describe("CanvasNode", () => {
  it("creates a node with default empty data", () => {
    editor.update(() => {
      const node = $createCanvasNode();
      expect($isCanvasNode(node)).toBe(true);
      expect(node.exportJSON().data).toEqual({});
    });
  });

  it("creates a node carrying canvas data", () => {
    const data = { elements: [{ id: "e1" }], appState: {}, files: {} };
    editor.update(() => {
      const node = $createCanvasNode(data);
      expect(node.exportJSON().data).toEqual(data);
    });
  });

  it("round-trips through JSON import/export", () => {
    const data = { elements: [{ id: "x" }], appState: { viewBackgroundColor: "#fff" }, files: {} };
    editor.update(() => {
      const node = $createCanvasNode(data);
      const json = node.exportJSON();
      const restored = CanvasNode.importJSON(json);
      expect(restored.exportJSON()).toEqual(json);
    });
  });

  it("setData mutates the stored data", () => {
    editor.update(() => {
      const node = $createCanvasNode();
      node.setData({ elements: [{ id: "y" }] });
      expect(node.exportJSON().data).toEqual({ elements: [{ id: "y" }] });
    });
  });

  it("reports its type as 'canvas'", () => {
    expect(CanvasNode.getType()).toBe("canvas");
  });
});
