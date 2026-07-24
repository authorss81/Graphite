function extractPlainText(node: any): string {
  let text = "";
  if (node.text) text += node.text;
  if (node.children) { for (const c of node.children) text += extractPlainText(c); }
  return text;
}

function nodeToMarkdown(node: any, indent: number = 0): string {
  const type = node.type;
  const prefix = "  ".repeat(indent);

  if (type === "heading" || type === "h1") return `# ${extractPlainText(node)}`;
  if (type === "h2") return `## ${extractPlainText(node)}`;
  if (type === "h3") return `### ${extractPlainText(node)}`;
  if (type === "quote") return `> ${node.children ? node.children.map((c: any) => extractPlainText(c)).join(" ") : ""}`;
  if (type === "list") {
    const items = (node.children || []).map((c: any) => {
      const checked = c.checked !== undefined ? (c.checked ? "- [x]" : "- [ ]") : "-";
      return `${prefix}${checked} ${extractPlainText(c)}`;
    });
    return items.join("\n");
  }
  if (type === "checklistitem" || type === "listitem") {
    const checked = node.checked !== undefined ? (node.checked ? "- [x]" : "- [ ]") : "-";
    return `${prefix}${checked} ${extractPlainText(node)}`;
  }
  if (type === "code" || type === "codeblock") {
    const lang = node.language || "";
    return `${prefix}\`\`\`${lang}\n${extractPlainText(node)}\n\`\`\``;
  }
  if (type === "horizontalrule" || type === "divider") return `${prefix}---`;
  if (type === "paragraph" || type === "text") {
    const text = extractPlainText(node);
    return text ? `${prefix}${text}` : "";
  }
  const text = extractPlainText(node);
  return text ? `${prefix}${text}` : "";
}

function nodeToHtml(node: any): string {
  const type = node.type;
  let content = "";
  if (node.children) { for (const c of node.children) content += nodeToHtml(c); }

  if (type === "root") return content;
  if (type === "heading" || type === "h1") return `<h1>${extractPlainText(node)}</h1>`;
  if (type === "h2") return `<h2>${extractPlainText(node)}</h2>`;
  if (type === "h3") return `<h3>${extractPlainText(node)}</h3>`;
  if (type === "quote") return `<blockquote>${content || extractPlainText(node)}</blockquote>`;
  if (type === "paragraph") return `<p>${content || extractPlainText(node)}</p>`;
  if (type === "text") {
    let t = node.text || "";
    if (node.bold) t = `<strong>${t}</strong>`;
    if (node.italic) t = `<em>${t}</em>`;
    if (node.code) t = `<code>${t}</code>`;
    if (node.strikethrough) t = `<s>${t}</s>`;
    return t;
  }
  if (type === "link") {
    return `<a href="${node.url || "#"}" target="_blank">${extractPlainText(node)}</a>`;
  }
  if (type === "list") {
    const tag = node.listType === "number" ? "ol" : "ul";
    return `<${tag}>${content}</${tag}>`;
  }
  if (type === "listitem" || type === "checklistitem") {
    const checked = node.checked !== undefined ? (node.checked ? ` checked` : "") : "";
    return `<li${checked}>${content || extractPlainText(node)}</li>`;
  }
  if (type === "code" || type === "codeblock") {
    const lang = node.language ? ` class="language-${node.language}"` : "";
    return `<pre><code${lang}>${extractPlainText(node)}</code></pre>`;
  }
  if (type === "horizontalrule" || type === "divider") return `<hr />`;
  if (type === "image") return `<img src="${node.src || ""}" alt="${node.alt || ""}" style="max-width:100%" />`;
  return content || extractPlainText(node);
}

export function editorStateToMarkdown(editorState: string): string {
  try {
    const parsed = JSON.parse(editorState);
    if (!parsed.root) return editorState;
    const parts: string[] = [];
    for (const child of parsed.root.children || []) {
      const md = nodeToMarkdown(child);
      if (md) parts.push(md);
    }
    return parts.join("\n\n");
  } catch {
    return editorState;
  }
}

export function editorStateToHtml(editorState: string, title: string = "Document"): string {
  try {
    const parsed = JSON.parse(editorState);
    const body = parsed.root ? (parsed.root.children || []).map((c: any) => nodeToHtml(c)).join("\n") : editorState;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}h1,h2,h3{color:#111}blockquote{border-left:3px solid #ddd;margin:0;padding:4px 16px;color:#666}pre{background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:0.9em}img{max-width:100%;height:auto}hr{border:none;border-top:1px solid #ddd}</style></head><body><h1>${title}</h1>${body}</body></html>`;
  } catch {
    return `<html><body><pre>${editorState}</pre></body></html>`;
  }
}

export function downloadAsFile(content: string, filename: string, mime: string = "text/markdown") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printDocument(html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
