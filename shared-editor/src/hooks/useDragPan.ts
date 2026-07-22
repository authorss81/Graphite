import { useState, useRef, useCallback } from "react";

interface Options {
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  initialOffset?: { x: number; y: number };
}

export function useDragPan(options?: Options) {
  const minZoom = options?.minZoom ?? 0.2;
  const maxZoom = options?.maxZoom ?? 3.0;

  const [zoomLevel, setZoomLevel] = useState(options?.initialZoom ?? 1);
  const [offset, setOffset] = useState(options?.initialOffset ?? { x: 0, y: 0 });

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const startPan = useCallback((clientX: number, clientY: number) => {
    isPanningRef.current = true;
    panStartRef.current = {
      x: clientX - offset.x,
      y: clientY - offset.y,
    };
  }, [offset]);

  const movePan = useCallback((clientX: number, clientY: number) => {
    if (!isPanningRef.current) return;
    setOffset({
      x: clientX - panStartRef.current.x,
      y: clientY - panStartRef.current.y,
    });
  }, []);

  const endPan = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(maxZoom, Number((z + 0.15).toFixed(2))));
  }, [maxZoom]);

  const zoomOut = useCallback(() => {
    setZoomLevel((z) => Math.max(minZoom, Number((z - 0.15).toFixed(2))));
  }, [minZoom]);

  const resetZoomPan = useCallback(() => {
    setZoomLevel(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  return {
    zoomLevel,
    offset,
    isPanning: isPanningRef.current,
    startPan,
    movePan,
    endPan,
    zoomIn,
    zoomOut,
    resetZoomPan,
    setZoomLevel,
    setOffset,
  };
}
