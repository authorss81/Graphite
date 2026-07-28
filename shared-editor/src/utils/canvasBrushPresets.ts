export interface BrushPreset {
  name: string;
  label: string;
  icon: string;
  appState: Record<string, any>;
  strokeOptions?: Record<string, any>;
}

export const BRUSH_PRESETS: BrushPreset[] = [
  {
    name: "fine",
    label: "Fine Pen",
    icon: "✎",
    appState: {
      currentItemStrokeWidth: 1,
      currentItemRoughness: 0,
      currentItemStrokeStyle: "solid",
      currentItemOpacity: 100,
    },
    strokeOptions: {
      size: 2,
      thinning: 0.6,
      smoothing: 0.4,
      streamline: 0.6,
      simulatePressure: true,
      easing: "easeOutSine",
      start: { cap: true },
      end: { cap: true },
    },
  },
  {
    name: "marker",
    label: "Marker",
    icon: "■",
    appState: {
      currentItemStrokeWidth: 4,
      currentItemRoughness: 0,
      currentItemStrokeStyle: "solid",
      currentItemOpacity: 92,
    },
    strokeOptions: {
      size: 6,
      thinning: 0.3,
      smoothing: 0.3,
      streamline: 0.5,
      simulatePressure: true,
      easing: "linear",
      start: { cap: true, taper: 0 },
      end: { cap: true, taper: 0 },
    },
  },
  {
    name: "highlighter",
    label: "Highlighter",
    icon: "▣",
    appState: {
      currentItemStrokeWidth: 14,
      currentItemRoughness: 0,
      currentItemStrokeStyle: "solid",
      currentItemOpacity: 25,
    },
    strokeOptions: {
      size: 18,
      thinning: 0.1,
      smoothing: 1,
      streamline: 0.8,
      simulatePressure: false,
      easing: "linear",
      start: { cap: true, taper: 0 },
      end: { cap: true, taper: 0 },
    },
  },
  {
    name: "fountain",
    label: "Fountain Pen",
    icon: "✒",
    appState: {
      currentItemStrokeWidth: 2,
      currentItemRoughness: 0,
      currentItemStrokeStyle: "solid",
      currentItemOpacity: 100,
    },
    strokeOptions: {
      size: 3,
      thinning: 0.9,
      smoothing: 0.5,
      streamline: 0.7,
      simulatePressure: true,
      easing: "easeOutQuad",
      start: { cap: true, taper: 0.2 },
      end: { cap: true, taper: 0.2 },
    },
  },
  {
    name: "calligraphy",
    label: "Calligraphy",
    icon: "🖊",
    appState: {
      currentItemStrokeWidth: 4,
      currentItemRoughness: 0,
      currentItemStrokeStyle: "solid",
      currentItemOpacity: 100,
    },
    strokeOptions: {
      size: 5,
      thinning: -0.3,
      smoothing: 0.3,
      streamline: 0.6,
      simulatePressure: true,
      easing: "easeInOutCubic",
      start: { cap: true, taper: 0.3 },
      end: { cap: true, taper: 0.3 },
    },
  },
  {
    name: "sketch",
    label: "Sketch Pencil",
    icon: "✏",
    appState: {
      currentItemStrokeWidth: 2,
      currentItemRoughness: 2,
      currentItemStrokeStyle: "solid",
      currentItemOpacity: 100,
    },
    strokeOptions: {
      size: 3,
      thinning: 0.4,
      smoothing: 0.2,
      streamline: 0.3,
      simulatePressure: true,
      easing: "easeOutQuad",
      start: { cap: true },
      end: { cap: true },
    },
  },
];

export function applyBrushPreset(
  excalidrawAPI: any,
  preset: BrushPreset,
) {
  if (!excalidrawAPI?.getAppState) return;
  const state = excalidrawAPI.getAppState();
  excalidrawAPI.updateScene({
    appState: {
      ...state,
      ...preset.appState,
      currentStrokeOptions: preset.strokeOptions || undefined,
    },
  });
}
