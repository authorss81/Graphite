function escapeHtml(text: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return text.replace(/[&<>"']/g, (ch) => map[ch] || ch);
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsMarkdown(title: string, editorStateJSON: string) {
  let textContent = `# ${title}\n\n`;
  if (editorStateJSON) {
    try {
      const parsed = JSON.parse(editorStateJSON);
      const traverse = (node: any): string => {
        if (!node) return "";
        if (node.text) return node.text;
        let childrenText = "";
        if (node.children) {
          childrenText = node.children.map(traverse).join("");
        }
        if (node.type === "paragraph") return `${childrenText}\n\n`;
        if (node.type === "heading") {
          const hashes = "#".repeat(node.tag === "h1" ? 1 : node.tag === "h2" ? 2 : 3);
          return `${hashes} ${childrenText}\n\n`;
        }
        if (node.type === "quote") return `> ${childrenText}\n\n`;
        if (node.type === "code") return `\`\`\`\n${childrenText}\n\`\`\`\n\n`;
        if (node.type === "listitem") return `- ${childrenText}\n`;
        return childrenText;
      };
      if (parsed.root) {
        textContent += traverse(parsed.root);
      }
    } catch {
      textContent += editorStateJSON;
    }
  }

  const safeTitle = (title || "Untitled").replace(/[^a-zA-Z0-9_\-]/g, "_");
  downloadFile(`${safeTitle}.md`, textContent, "text/markdown;charset=utf-8");
}

export function exportAsHTML(title: string, editorStateJSON: string) {
  let bodyHTML = `<h1>${escapeHtml(title)}</h1>`;
  if (editorStateJSON) {
    try {
      const parsed = JSON.parse(editorStateJSON);
      const traverse = (node: any): string => {
        if (!node) return "";
        if (node.text) return escapeHtml(node.text);
        let childrenText = "";
        if (node.children) {
          childrenText = node.children.map(traverse).join("");
        }
        if (node.type === "paragraph") return `<p>${childrenText}</p>`;
        if (node.type === "heading") return `<${node.tag}>${childrenText}</${node.tag}>`;
        if (node.type === "quote") return `<blockquote>${childrenText}</blockquote>`;
        if (node.type === "code") return `<pre><code>${childrenText}</code></pre>`;
        if (node.type === "listitem") return `<li>${childrenText}</li>`;
        return childrenText;
      };
      if (parsed.root) {
        bodyHTML += traverse(parsed.root);
      }
    } catch {
      bodyHTML += `<p>${escapeHtml(editorStateJSON)}</p>`;
    }
  }

  const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1e293b; background: #fafafa; }
    h1, h2, h3 { color: #0f172a; }
    blockquote { border-left: 4px solid #6366f1; margin: 0; padding-left: 16px; color: #475569; }
    pre { background: #1e1e24; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  ${bodyHTML}
</body>
</html>`;

  const safeTitle = (title || "Untitled").replace(/[^a-zA-Z0-9_\-]/g, "_");
  downloadFile(`${safeTitle}.html`, fullHTML, "text/html;charset=utf-8");
}

export function exportAsPDF() {
  window.print();
}
