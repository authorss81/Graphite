import {
  DecoratorNode,
  type NodeKey,
  type LexicalNode,
  type SerializedLexicalNode,
  type Spread,
  createCommand,
  type LexicalCommand,
} from "lexical";
import type { ReactElement } from "react";
import { ExcalidrawCanvasComponent } from "./ExcalidrawCanvasComponent";

export interface CanvasData {
  elements?: any[];
  appState?: any;
  files?: any;
}

export type SerializedCanvasNode = Spread<
  { data: CanvasData },
  SerializedLexicalNode
>;

export const INSERT_CANVAS_COMMAND: LexicalCommand<CanvasData | undefined> =
  createCommand("INSERT_CANVAS_COMMAND");

export class CanvasNode extends DecoratorNode<ReactElement> {
  __data: CanvasData;

  static getType(): string {
    return "canvas";
  }

  static clone(node: CanvasNode): CanvasNode {
    return new CanvasNode(node.__data, node.__key);
  }

  constructor(data?: CanvasData, key?: NodeKey) {
    super(key);
    this.__data = data ?? {};
  }

  static importJSON(serializedNode: SerializedCanvasNode): CanvasNode {
    return $createCanvasNode(serializedNode.data);
  }

  exportJSON(): SerializedCanvasNode {
    return {
      type: "canvas",
      version: 1,
      data: this.__data,
    };
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  setData(data: CanvasData): void {
    const writable = this.getWritable();
    writable.__data = data;
  }

  decorate(): ReactElement {
    return (
      <ExcalidrawCanvasComponent nodeKey={this.getKey()} data={this.__data} />
    );
  }
}

export function $createCanvasNode(data?: CanvasData): CanvasNode {
  return new CanvasNode(data);
}

export function $isCanvasNode(
  node: LexicalNode | null | undefined,
): node is CanvasNode {
  return node instanceof CanvasNode;
}
