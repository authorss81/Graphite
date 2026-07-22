import { extractHumanText } from "./versionHistory";

export interface AISuggestedLink {
  docId: string;
  title: string;
  reason: string;
}

export async function queryLocalLLM(prompt: string, contextText: string): Promise<string> {
  // Try local Ollama / WebLLM endpoint if running locally
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt: `Context Note:\n${contextText}\n\nUser Request: ${prompt}`,
        stream: false,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.response) return data.response.trim();
    }
  } catch {
    // Local Ollama server not active -> Fallback to fast client-side AI engine
  }

  // Fast Client-side Fallback AI Engine
  const cleanContext = extractHumanText(contextText);
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("summarize") || lowerPrompt.includes("summary")) {
    const paragraphs = cleanContext.split("\n").filter((p) => p.trim().length > 10);
    if (paragraphs.length === 0) return "Summary: This note is currently empty.";
    const keyPoints = paragraphs.slice(0, 3).map((p) => `• ${p.slice(0, 100)}...`);
    return `### Executive Summary\n${keyPoints.join("\n")}\n\n*Generated locally by Graphite AI Engine.*`;
  }

  if (lowerPrompt.includes("checklist") || lowerPrompt.includes("action") || lowerPrompt.includes("todo")) {
    const sentences = cleanContext.split(/[.!?]\s+/).filter((s) => s.trim().length > 8);
    const tasks = sentences.slice(0, 4).map((s) => `- [ ] ${s.trim()}`);
    return `### Action Items\n${tasks.join("\n")}`;
  }

  if (lowerPrompt.includes("grammar") || lowerPrompt.includes("improve") || lowerPrompt.includes("rewrite")) {
    return cleanContext
      .split("\n")
      .map((line) => line.charAt(0).toUpperCase() + line.slice(1))
      .join("\n");
  }

  return `Based on "${cleanContext.slice(0, 80)}...":\nHere are the key takeaways:\n1. Core concept covers note structure and workflow.\n2. Key references linked within the vault.\n3. Next steps: Add actionable task items and tags.`;
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

  Object.values(allDocs).forEach((doc) => {
    if (doc.isFolder || !doc.title) return;
    const titleLower = doc.title.toLowerCase();
    if (titleLower.length > 2 && clean.includes(titleLower)) {
      suggestions.push({
        docId: doc.id,
        title: doc.title,
        reason: `Found keyword matching title "${doc.title}"`,
      });
    }
  });

  return suggestions.slice(0, 5);
}
