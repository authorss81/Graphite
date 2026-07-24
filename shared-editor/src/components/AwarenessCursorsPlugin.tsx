import { useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { awarenessStates, type AwarenessState } from "../utils/userRegistry";

interface CursorDisplay {
  user: { id: string; name: string; color: string };
  x: number;
  y: number;
}

export function AwarenessCursorsPlugin() {
  const [editor] = useLexicalComposerContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorsRef = useRef<CursorDisplay[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const rootEl = editor.getRootElement();
    if (!rootEl) return;

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;";
    canvasRef.current = canvas;
    rootEl.style.position = "relative";
    rootEl.appendChild(canvas);

    const resizeObserver = new ResizeObserver(() => {
      if (canvas) {
        canvas.width = rootEl.offsetWidth;
        canvas.height = rootEl.offsetHeight;
      }
    });
    resizeObserver.observe(rootEl);

    const render = () => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      const activeCursors: CursorDisplay[] = [];

      awarenessStates.forEach((state: AwarenessState) => {
        if (!state.cursor || !state.focused) return;
        if (now - state.lastSeen > 10000) return;
        activeCursors.push({
          user: state.user,
          x: state.cursor.x,
          y: state.cursor.y,
        });
      });

      cursorsRef.current = activeCursors;

      for (const cursor of activeCursors) {
        const { x, y } = cursor;
        const color = cursor.user.color;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 12, y + 4);
        ctx.lineTo(x + 4, y + 12);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.fillStyle = color;
        ctx.font = "11px Inter, sans-serif";
        ctx.fillText(cursor.user.name, x + 14, y + 6);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      canvas.remove();
    };
  }, [editor]);

  return null;
}
