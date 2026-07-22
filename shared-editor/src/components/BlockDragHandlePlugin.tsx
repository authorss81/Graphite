import { useEffect, useState, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNearestNodeFromDOMNode } from "lexical";
import { GripVertical } from "lucide-react";

export function BlockDragHandlePlugin() {
  const [editor] = useLexicalComposerContext();
  const [targetNodeKey, setTargetNodeKey] = useState<string | null>(null);
  const [handlePosition, setHandlePosition] = useState<{ top: number; left: number } | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (isDraggingRef.current) return;

      const target = event.target as HTMLElement;
      const block = target.closest(".editor-input > *") as HTMLElement;

      if (block && rootElement.contains(block)) {
        editor.update(() => {
          const node = $getNearestNodeFromDOMNode(block);
          if (node) {
            const topLevel = node.getTopLevelElementOrThrow();
            setTargetNodeKey(topLevel.getKey());
            const rect = block.getBoundingClientRect();
            const rootRect = rootElement.getBoundingClientRect();
            setHandlePosition({
              top: rect.top - rootRect.top + rootElement.scrollTop,
              left: Math.max(0, rect.left - rootRect.left - 24),
            });
          }
        });
      }
    };

    rootElement.addEventListener("mousemove", handleMouseMove);
    return () => rootElement.removeEventListener("mousemove", handleMouseMove);
  }, [editor]);

  const onDragStart = (e: React.DragEvent) => {
    isDraggingRef.current = true;
    if (targetNodeKey) {
      e.dataTransfer.setData("text/plain", targetNodeKey);
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const onDragEnd = () => {
    isDraggingRef.current = false;
  };

  if (!handlePosition || !targetNodeKey) return null;

  return (
    <div
      className="graphite-block-drag-handle"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        position: "absolute",
        top: handlePosition.top,
        left: handlePosition.left,
        cursor: "grab",
        opacity: 0.6,
        padding: "2px",
        borderRadius: "4px",
        zIndex: 20,
        color: "var(--text-muted)",
        transition: "opacity 0.15s ease",
      }}
      title="Drag to reorder block"
    >
      <GripVertical size={16} />
    </div>
  );
}
