import { DecoratorNode, type NodeKey, type LexicalNode, type SerializedLexicalNode, type Spread, createCommand, type LexicalCommand, $applyNodeReplacement } from "lexical";
import type { ReactElement } from "react";
import { useNoteStore } from "../store/useNoteStore";

export type SerializedBlockRefNode = Spread<
  { targetDoc: string; blockId: string; fallbackText: string },
  SerializedLexicalNode
>;

export const INSERT_BLOCK_REF_COMMAND: LexicalCommand<{ targetDoc: string; blockId: string; fallbackText: string }> =
  createCommand("INSERT_BLOCK_REF_COMMAND");

function useBlockContent(targetDoc: string, blockId: string): string | null {
  const documents = useNoteStore((s) => s.documents);
  const doc = documents[targetDoc];
  if (!doc || !doc.editorState) return null;
  try {
    const parsed = JSON.parse(doc.editorState);
    const findBlock = (node: any): string | null => {
      if (!node) return null;
      if (node.blockId === blockId) {
        if (node.text) return node.text;
        if (node.children && node.children.length > 0) return node.children.map((c: any) => c.text || "").join(" ");
      }
      if (node.children) { for (const child of node.children) { const r = findBlock(child); if (r) return r; } }
      return null;
    };
    return findBlock(parsed.root);
  } catch { return null; }
}

export class BlockRefNode extends DecoratorNode<ReactElement> {
  __targetDoc: string;
  __blockId: string;
  __fallbackText: string;

  static getType(): string { return "block-ref"; }

  static clone(node: BlockRefNode): BlockRefNode {
    return new BlockRefNode(node.__targetDoc, node.__blockId, node.__fallbackText, node.__key);
  }

  static importJSON(serializedNode: SerializedBlockRefNode): BlockRefNode {
    return new BlockRefNode(serializedNode.targetDoc, serializedNode.blockId, serializedNode.fallbackText);
  }

  constructor(targetDoc: string, blockId: string, fallbackText: string, key?: NodeKey) {
    super(key);
    this.__targetDoc = targetDoc;
    this.__blockId = blockId;
    this.__fallbackText = fallbackText;
  }

  exportJSON(): SerializedBlockRefNode {
    return { type: "block-ref", version: 1, targetDoc: this.__targetDoc, blockId: this.__blockId, fallbackText: this.__fallbackText };
  }

  createDOM(): HTMLElement { return document.createElement("span"); }

  updateDOM(): boolean { return false; }

  decorate(): ReactElement {
    const Component = () => {
      const documents = useNoteStore((s) => s.documents);
      const selectDocument = useNoteStore((s) => s.selectDocument);
      const content = useBlockContent(this.__targetDoc, this.__blockId);

      if (!content) {
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 6px", background: "rgba(239,68,68,0.1)", borderRadius: "4px", fontSize: "13px", color: "var(--text-muted)", border: "1px dashed rgba(239,68,68,0.3)" }}>
            Missing block: {this.__fallbackText || this.__blockId}
          </span>
        );
      }

      return (
        <span
          onClick={() => selectDocument(this.__targetDoc)}
          style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", background: "rgba(99,102,241,0.08)", borderRadius: "6px", fontSize: "13px", color: "var(--accent-color)", border: "1px solid rgba(99,102,241,0.2)", cursor: "pointer" }}
          title={`From: ${documents[this.__targetDoc]?.title || "Untitled"}`}
        >
          {content.slice(0, 120)}{content.length > 120 ? "…" : ""}
        </span>
      );
    };
    return <Component />;
  }
}

export function $createBlockRefNode(targetDoc: string, blockId: string, fallbackText: string): BlockRefNode {
  return $applyNodeReplacement(new BlockRefNode(targetDoc, blockId, fallbackText));
}

export function $isBlockRefNode(node: LexicalNode | null | undefined): node is BlockRefNode {
  return node instanceof BlockRefNode;
}
