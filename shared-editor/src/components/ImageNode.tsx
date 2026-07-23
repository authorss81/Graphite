import {
  DecoratorNode,
  type NodeKey,
  type LexicalNode,
  type SerializedLexicalNode,
  type Spread,
  createCommand,
  type LexicalCommand,
  $applyNodeReplacement,
} from "lexical";
import type { ReactElement } from "react";

export interface ImagePayload {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export type SerializedImageNode = Spread<
  ImagePayload,
  SerializedLexicalNode
>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> =
  createCommand("INSERT_IMAGE_COMMAND");

export class ImageNode extends DecoratorNode<ReactElement> {
  __src: string;
  __alt: string;
  __width?: number;
  __height?: number;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__key, node.__width, node.__height);
  }

  constructor(
    src: string,
    alt = "",
    key?: NodeKey,
    width?: number,
    height?: number,
  ) {
    super(key);
    // Block javascript: URLs in image sources
    if (typeof src === "string" && src.trim().toLowerCase().startsWith("javascript:")) {
      throw new Error("Image source cannot be a javascript: URL");
    }
    this.__src = src;
    this.__alt = alt;
    this.__width = width;
    this.__height = height;
  }

  static importJSON(serializedNode: Record<string, unknown>): ImageNode {
    const data = serializedNode as unknown as SerializedImageNode;
    return $createImageNode({
      src: data.src,
      alt: data.alt,
      width: data.width,
      height: data.height,
    });
  }

  exportJSON(): SerializedImageNode {
    return {
      type: "image",
      version: 1,
      src: this.__src,
      alt: this.__alt,
      width: this.__width,
      height: this.__height,
    };
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    return span;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return false;
  }

  decorate(): ReactElement {
    return (
      <img
        src={this.__src}
        alt={this.__alt}
        width={this.__width}
        height={this.__height}
        style={{ maxWidth: "100%", borderRadius: 8, margin: "12px 0" }}
        draggable={false}
      />
    );
  }
}

export function $createImageNode(payload: ImagePayload): ImageNode {
  const node = new ImageNode(payload.src, payload.alt, undefined, payload.width, payload.height);
  return $applyNodeReplacement(node);
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
