import { describe, it, expect, beforeEach } from "vitest";
import { newDocId, loadDocs, saveDocs, type GraphiteDoc } from "./docStorage";

describe("docStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("newDocId returns a unique id string", () => {
    const a = newDocId();
    const b = newDocId();
    expect(typeof a).toBe("string");
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });

  it("saveDocs then loadDocs round-trips documents", () => {
    const docs: Record<string, GraphiteDoc> = {
      "doc-1": {
        id: "doc-1",
        title: "First",
        isFolder: false,
        parentId: null,
        updatedAt: 2,
        editorState: "{}",
        canvasData: {},
      },
      "doc-2": {
        id: "doc-2",
        title: "Folder",
        isFolder: true,
        parentId: null,
        updatedAt: 4,
        editorState: "",
        canvasData: {},
      },
    };
    saveDocs(docs);
    expect(loadDocs()).toEqual(docs);
  });

  it("loadDocs returns empty object when storage is empty", () => {
    expect(loadDocs()).toEqual({});
  });
});
