import { describe, it, expect, beforeEach, vi } from "vitest";
import { encodeBase64, decodeBase64, sendUpdateToNative } from "./bridge";

describe("bridge base64", () => {
  it("round-trips ASCII text", () => {
    const input = "Hello, Graphite!";
    expect(decodeBase64(encodeBase64(input))).toBe(input);
  });

  it("round-trips unicode (emoji + Chinese) text", () => {
    const input = "✏️ 画布 中文 🎨";
    expect(decodeBase64(encodeBase64(input))).toBe(input);
  });

  it("round-trips Lexical editorState JSON", () => {
    const input = JSON.stringify({
      root: { children: [], direction: null, format: "", indent: 0, type: "root", version: 1 },
    });
    expect(decodeBase64(encodeBase64(input))).toBe(input);
  });
});

describe("sendUpdateToNative", () => {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {});

  beforeEach(() => {
    spy.mockClear();
    window.AndroidBridge = undefined;
    window.webkit = undefined;
  });

  it("falls back to console.log when no native host is present", () => {
    sendUpdateToNative("doc-1", "cGF5bG9hZA==");
    expect(spy).toHaveBeenCalled();
  });

  it("prefers AndroidBridge when available", () => {
    const onDocumentUpdated = vi.fn();
    window.AndroidBridge = { onDocumentUpdated, logMessage: vi.fn() };
    sendUpdateToNative("doc-2", "cGF5bG9hZA==");
    expect(onDocumentUpdated).toHaveBeenCalledWith("doc-2", "cGF5bG9hZA==");
  });
});
