import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  extractHumanText, computeTextDiff,
  getDocCommits, clearDocCommits, flushPendingCommits, scheduleDocCommit,
} from "./versionHistory";

vi.mock("@isomorphic-git/lightning-fs", () => ({
  default: vi.fn().mockImplementation(() => ({
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(""),
      unlink: vi.fn().mockResolvedValue(undefined),
      readdir: vi.fn().mockResolvedValue([]),
      rmdir: vi.fn().mockResolvedValue(undefined),
      stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
    },
  })),
}));

vi.mock("isomorphic-git", () => ({
  default: {
    add: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue("mock-hash-123"),
  },
}));

vi.mock("./bridge", () => ({
  sendUpdateToNative: vi.fn(),
}));

const p = (text: string) => `{"root":{"children":[{"type":"paragraph","children":[{"text":"${text}"}]}]}}`;

beforeEach(() => {
  localStorage.clear();
});

describe("extractHumanText", () => {
  it("extracts text from Lexical JSON", () => {
    const json = JSON.stringify({
      root: { children: [
        { type: "paragraph", children: [{ text: "Hello " }, { text: "world" }] },
        { type: "heading", tag: "h1", children: [{ text: "Title" }] },
      ]}
    });
    const result = extractHumanText(json);
    expect(result).toContain("Hello");
    expect(result).toContain("world");
    expect(result).toContain("Title");
  });

  it("handles empty state", () => {
    expect(extractHumanText("")).toBe("");
  });

  it("handles non-JSON (plain text fallback)", () => {
    const text = extractHumanText("just plain text");
    expect(text).toContain("just plain text");
  });
});

describe("computeTextDiff", () => {
  it("detects additions in single-line content", () => {
    const diffs = computeTextDiff(p("hello"), p("hello world"));
    expect(diffs.some(d => d.type === "add")).toBe(true);
    expect(diffs.some(d => d.text.includes("world"))).toBe(true);
  });

  it("detects deletions in single-line content", () => {
    const diffs = computeTextDiff(p("hello world"), p("hello"));
    expect(diffs.some(d => d.type === "del")).toBe(true);
    expect(diffs.some(d => d.text.includes("world"))).toBe(true);
  });

  it("returns same lines for identical content", () => {
    const diffs = computeTextDiff(p("same"), p("same"));
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs.every(d => d.type === "same")).toBe(true);
  });

  it("handles multi-line content", () => {
    const oldJson = JSON.stringify({ root: { children: [
      { type: "paragraph", children: [{ text: "line1" }] },
      { type: "paragraph", children: [{ text: "line2" }] },
      { type: "paragraph", children: [{ text: "line3" }] },
    ]}});
    const newJson = JSON.stringify({ root: { children: [
      { type: "paragraph", children: [{ text: "line1" }] },
      { type: "paragraph", children: [{ text: "INSERTED" }] },
      { type: "paragraph", children: [{ text: "line2" }] },
      { type: "paragraph", children: [{ text: "line3" }] },
    ]}});
    const diffs = computeTextDiff(oldJson, newJson);
    expect(diffs.some(d => d.type === "add" && d.text.includes("INSERTED"))).toBe(true);
  });
});

describe("getDocCommits / clearDocCommits", () => {
  it("returns empty array for unknown doc", () => {
    expect(getDocCommits("unknown")).toEqual([]);
  });

  it("clears commits that were actually created", async () => {
    scheduleDocCommit("doc-1", "Test", p("hello"), null);
    await flushPendingCommits();
    expect(getDocCommits("doc-1").length).toBeGreaterThanOrEqual(1);
    clearDocCommits("doc-1");
    expect(getDocCommits("doc-1")).toEqual([]);
  });

  it("does not affect other docs when clearing", async () => {
    scheduleDocCommit("doc-1", "Title1", p("hello"), null);
    scheduleDocCommit("doc-2", "Title2", p("world"), null);
    await flushPendingCommits();
    clearDocCommits("doc-1");
    const commits = getDocCommits("doc-2");
    expect(commits.length).toBeGreaterThanOrEqual(1);
    expect(commits[0].docTitle).toBe("Title2");
  });
});

describe("scheduleDocCommit / flushPendingCommits", () => {
  it("schedules and flushes a commit", async () => {
    scheduleDocCommit("doc-1", "Test", p("hello"), null);
    expect(getDocCommits("doc-1").length).toBe(0);
    await flushPendingCommits();
    const commits = getDocCommits("doc-1");
    expect(commits.length).toBeGreaterThanOrEqual(1);
    expect(commits[0].docTitle).toBe("Test");
  });

  it("deduplicates identical commits", async () => {
    scheduleDocCommit("doc-1", "Test", p("hello"), null);
    await flushPendingCommits();
    const count1 = getDocCommits("doc-1").length;
    scheduleDocCommit("doc-1", "Test", p("hello"), null);
    await flushPendingCommits();
    const count2 = getDocCommits("doc-1").length;
    expect(count2).toBe(count1);
  });
});
