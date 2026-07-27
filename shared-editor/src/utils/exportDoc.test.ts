import { describe, it, expect, vi } from "vitest";
import { editorStateToMarkdown, editorStateToHtml, isJavaScriptUrl } from "./exportDoc";

const sampleLexical = JSON.stringify({
  root: {
    children: [
      { type: "heading", tag: "h1", children: [{ text: "My Title" }] },
      { type: "paragraph", children: [{ type: "text", text: "Hello, " }, { type: "text", text: "world", bold: true }] },
      { type: "list", children: [
        { type: "listitem", children: [{ text: "Item 1" }] },
        { type: "listitem", children: [{ text: "Item 2" }] },
      ]},
    ],
  },
});

const sampleWithCode = JSON.stringify({
  root: {
    children: [
      { type: "code", language: "typescript", children: [{ text: "const x = 1;" }] },
    ],
  },
});

const sampleWithLink = JSON.stringify({
  root: {
    children: [
      { type: "paragraph", children: [
        { text: "Visit " },
        { type: "link", url: "https://example.com", children: [{ type: "text", text: "Example" }] },
      ]},
    ],
  },
});

describe("editorStateToMarkdown", () => {
  it("converts headings", () => {
    const md = editorStateToMarkdown(sampleLexical);
    expect(md).toContain("# My Title");
  });

  it("converts paragraph text", () => {
    const md = editorStateToMarkdown(sampleLexical);
    expect(md).toContain("Hello,");
    expect(md).toContain("world");
  });

  it("converts list items", () => {
    const md = editorStateToMarkdown(sampleLexical);
    expect(md).toContain("- Item 1");
    expect(md).toContain("- Item 2");
  });

  it("converts code blocks with language", () => {
    const md = editorStateToMarkdown(sampleWithCode);
    expect(md).toContain("```typescript");
    expect(md).toContain("const x = 1;");
  });

  it("falls back to raw string on invalid JSON", () => {
    const md = editorStateToMarkdown("not json");
    expect(md).toBe("not json");
  });

  it("handles empty editor state", () => {
    const empty = JSON.stringify({ root: { children: [] } });
    expect(editorStateToMarkdown(empty)).toBe("");
  });
});

describe("editorStateToHtml", () => {
  it("wraps in HTML document", () => {
    const html = editorStateToHtml(sampleLexical, "Test Doc");
    expect(html).toContain("<h1>Test Doc</h1>");
    expect(html).toContain("<h1>My Title</h1>");
    expect(html).toContain("<strong>world</strong>");
  });

  it("escapes HTML in title", () => {
    const html = editorStateToHtml(sampleLexical, "<script>alert('xss')</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("sanitizes javascript: URLs in links", () => {
    const xssLexical = JSON.stringify({
      root: { children: [{ type: "link", url: "javascript:alert(1)", children: [{ text: "click" }] }] },
    });
    const html = editorStateToHtml(xssLexical, "Test");
    expect(html).toContain('href="#"');
    expect(html).not.toContain("javascript:");
  });

  it("handles invalid JSON gracefully", () => {
    const html = editorStateToHtml("garbage", "Title");
    expect(html).toContain("garbage");
    expect(html).toContain("</html>");
  });

  it("includes safe CSS styles", () => {
    const html = editorStateToHtml(sampleLexical, "Doc");
    expect(html).toContain("max-width:800px");
    expect(html).toContain("line-height:1.6");
  });
});

describe("isJavaScriptUrl", () => {
  it("detects standard javascript: URLs", () => {
    expect(isJavaScriptUrl("javascript:alert(1)")).toBe(true);
    expect(isJavaScriptUrl("JAVASCRIPT:doEvil()")).toBe(true);
    expect(isJavaScriptUrl("  javascript:void(0)")).toBe(true);
  });

  it("detects javascript: URLs with newline/tab bypass attempts", () => {
    expect(isJavaScriptUrl("java\nscript:alert(1)")).toBe(true);
    expect(isJavaScriptUrl("java\rscript:alert(1)")).toBe(true);
    expect(isJavaScriptUrl("java\t script:alert(1)")).toBe(true);
    expect(isJavaScriptUrl("  java\nscript:alert(1)")).toBe(true);
  });

  it("allows safe URLs", () => {
    expect(isJavaScriptUrl("https://example.com")).toBe(false);
    expect(isJavaScriptUrl("")).toBe(false);
    expect(isJavaScriptUrl("data:image/png,123")).toBe(false);
    expect(isJavaScriptUrl("http://localhost:3000")).toBe(false);
  });

  it("blocks javascript: in link HTML output", () => {
    const xssLexical = JSON.stringify({
      root: { children: [{ type: "link", url: "javascript:alert(1)", children: [{ text: "click" }] }] },
    });
    const html = editorStateToHtml(xssLexical, "Test");
    expect(html).toContain('href="#"');
    expect(html).not.toContain("javascript:");
  });

  it("blocks newline-bypass javascript: in link HTML output", () => {
    const xssLexical = JSON.stringify({
      root: { children: [{ type: "link", url: "java\nscript:alert(1)", children: [{ text: "click" }] }] },
    });
    const html = editorStateToHtml(xssLexical, "Test");
    expect(html).toContain('href="#"');
    expect(html).not.toContain("javascript:");
  });
});


