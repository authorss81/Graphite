import "@testing-library/jest-dom";

if (typeof global !== "undefined") {
  // DOMMatrix polyfill
  if (!("DOMMatrix" in global)) {
    (global as any).DOMMatrix = class DOMMatrix {};
  }

  // ResizeObserver polyfill
  if (!("ResizeObserver" in global)) {
    (global as any).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  // indexedDB mock polyfill
  if (!("indexedDB" in global)) {
    (global as any).indexedDB = {
      open: () => ({
        addEventListener: () => {},
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      }),
    };
  }

  // BroadcastChannel mock polyfill
  if (!("BroadcastChannel" in global)) {
    (global as any).BroadcastChannel = class BroadcastChannel {
      name: string;
      onmessage: ((this: BroadcastChannel, ev: MessageEvent) => any) | null = null;
      onmessageerror: ((this: BroadcastChannel, ev: MessageEvent) => any) | null = null;

      constructor(name: string) {
        this.name = name;
      }
      postMessage(message: any) {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() {
        return true;
      }
    };
  }
}

if (typeof window !== "undefined") {
  if (!("DOMMatrix" in window)) {
    (window as any).DOMMatrix = (global as any).DOMMatrix;
  }
  if (!("ResizeObserver" in window)) {
    (window as any).ResizeObserver = (global as any).ResizeObserver;
  }
  if (!("indexedDB" in window)) {
    (window as any).indexedDB = (global as any).indexedDB;
  }
  if (!("BroadcastChannel" in window)) {
    (window as any).BroadcastChannel = (global as any).BroadcastChannel;
  }
}
