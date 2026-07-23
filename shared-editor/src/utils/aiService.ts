import { extractHumanText, GIT_DIR } from "./versionHistory";
import * as git from "isomorphic-git";

export interface AISuggestedLink {
  docId: string;
  title: string;
  reason: string;
}

export async function* streamLLM(prompt: string, contextText: string): AsyncGenerator<string> {
  const systemMsg = `You are Graphite AI, a helpful note-taking assistant. Use the following note context to answer the user's request accurately.\n\nNote Context:\n${contextText.slice(0, 8000)}`;
  const fullPrompt = `${systemMsg}\n\nUser: ${prompt}\n\nAssistant:`;

  // Try local Ollama with streaming
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama3", prompt: fullPrompt, stream: true }),
    });
    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) yield parsed.response;
          } catch {}
        }
      }
      return;
    }
  } catch {}

  // Fallback: keyword-based response (when no LLM available)
  const cleanContext = extractHumanText(contextText);
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("summarize") || lowerPrompt.includes("summary")) {
    const paragraphs = cleanContext.split("\n").filter((p) => p.trim().length > 10);
    if (paragraphs.length === 0) { yield "This note is currently empty."; return; }
    const keyPoints = paragraphs.slice(0, 3).map((p) => `• ${p.slice(0, 100)}...`).join("\n");
    yield `**Executive Summary**\n${keyPoints}\n\n*Generated locally by Graphite AI Engine.*`;
    return;
  }
  if (lowerPrompt.includes("checklist") || lowerPrompt.includes("action") || lowerPrompt.includes("todo")) {
    const sentences = cleanContext.split(/[.!?]\s+/).filter((s) => s.trim().length > 8);
    const tasks = sentences.slice(0, 4).map((s) => `- [ ] ${s.trim()}`).join("\n");
    yield `**Action Items**\n${tasks}`;
    return;
  }
  yield `Based on "${cleanContext.slice(0, 80)}...":\n1. Core concept covers note structure and workflow.\n2. Key references linked within the vault.\n3. Next steps: Add actionable task items and tags.`;
}

export async function queryLocalLLM(prompt: string, contextText: string): Promise<string> {
  let result = "";
  for await (const chunk of streamLLM(prompt, contextText)) {
    result += chunk;
  }
  return result;
}

export function autoSuggestTags(noteText: string): string[] {
  const clean = extractHumanText(noteText).toLowerCase();
  const tags = new Set<string>();
  if (clean.includes("react") || clean.includes("javascript") || clean.includes("code") || clean.includes("build")) tags.add("dev");
  if (clean.includes("project") || clean.includes("roadmap") || clean.includes("task")) tags.add("project");
  if (clean.includes("meeting") || clean.includes("sync") || clean.includes("call")) tags.add("meeting");
  if (clean.includes("design") || clean.includes("ui") || clean.includes("ux")) tags.add("design");
  if (clean.includes("git") || clean.includes("version") || clean.includes("commit")) tags.add("git");
  if (clean.includes("ai") || clean.includes("llm") || clean.includes("model")) tags.add("ai");
  if (tags.size === 0) tags.add("general");
  return Array.from(tags);
}

export function suggestSmartBacklinks(noteText: string, allDocs: Record<string, any>): AISuggestedLink[] {
  const clean = extractHumanText(noteText).toLowerCase();
  const suggestions: AISuggestedLink[] = [];
  Object.values(allDocs).forEach((doc: any) => {
    if (doc.isFolder || !doc.title) return;
    const titleLower = doc.title.toLowerCase();
    if (titleLower.length > 2 && clean.includes(titleLower)) {
      suggestions.push({ docId: doc.id, title: doc.title, reason: `Found keyword matching title "${doc.title}"` });
    }
  });
  return suggestions.slice(0, 5);
}

export async function getGitDiff(docId: string): Promise<string> {
  try {
    const lightningfs = await import("@isomorphic-git/lightning-fs");
    const FS = lightningfs.default;
    const fs = new FS("graphite_git_v1");
    const commits = await git.log({ fs, dir: GIT_DIR, ref: "main", depth: 2 });
    if (commits.length < 2) return "Only one commit — no diff available.";
    const oldContent = await fs.promises.readFile(`${GIT_DIR}/${docId}.md`, { encoding: "utf8" }).catch(() => "");
    await git.checkout({ fs, dir: GIT_DIR, ref: commits[1].oid });
    const newContent = await fs.promises.readFile(`${GIT_DIR}/${docId}.md`, { encoding: "utf8" }).catch(() => "");
    await git.checkout({ fs, dir: GIT_DIR, ref: "main" });
    const oldLines = (oldContent || "").split("\n");
    const newLines = (newContent || "").split("\n");
    let diff = "";
    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      if (oldLines[i] !== newLines[i]) {
        if (oldLines[i] !== undefined) diff += `- ${oldLines[i]}\n`;
        if (newLines[i] !== undefined) diff += `+ ${newLines[i]}\n`;
      }
    }
    return diff || "No visible changes.";
  } catch (err) {
    return "Git diff unavailable.";
  }
}
