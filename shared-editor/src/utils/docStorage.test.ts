import { describe, it, expect, beforeEach } from "vitest";
import { newDocId, loadDocs, saveDocs, loadDocsPaginated, type GraphiteDoc } from "./docStorage";

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

  it("loadDocsPaginated returns first page of documents sorted by updatedAt desc", () => {
    const docs: Record<string, GraphiteDoc> = {
      "doc-old": { id: "doc-old", title: "Old", isFolder: false, parentId: null, updatedAt: 10, editorState: "", canvasData: {} },
      "doc-new": { id: "doc-new", title: "New", isFolder: false, parentId: null, updatedAt: 100, editorState: "", canvasData: {} },
      "doc-mid": { id: "doc-mid", title: "Mid", isFolder: false, parentId: null, updatedAt: 50, editorState: "", canvasData: {} },
    };
    saveDocs(docs);

    const page0 = loadDocsPaginated(0);
    expect(page0.total).toBe(3);
    const ids = Object.keys(page0.docs);
    expect(ids[0]).toBe("doc-new");
    expect(ids[1]).toBe("doc-mid");
    expect(ids[2]).toBe("doc-old");

    const page1 = loadDocsPaginated(1);
    expect(page1.total).toBe(3);
    expect(Object.keys(page1.docs)).toHaveLength(0);
  });
});
