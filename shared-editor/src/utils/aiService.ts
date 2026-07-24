import { extractHumanText } from "./versionHistory";
import { loadAIConfig, type AIConfig, type AIProvider } from "./aiConfig";
import { embeddingCache } from "./embedding";

export interface AISuggestedLink {
  docId: string;
  title: string;
  reason: string;
  score: number;
}

function getConfig(): AIConfig {
  return loadAIConfig();
}

async function* streamOpenAI(prompt: string, systemMsg: string, config: AIConfig): AsyncGenerator<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openaiKey}`,
    },
    body: JSON.stringify({
      model: config.openaiModel,
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: prompt },
      ],
      stream: true,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (trimmed.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {}
      }
    }
  }
}

async function* streamAnthropic(prompt: string, systemMsg: string, config: AIConfig): AsyncGenerator<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      system: systemMsg,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
  const data = await res.json();
  if (data.content?.[0]?.text) {
    yield data.content[0].text;
  }
}

async function* streamOllama(prompt: string, systemMsg: string, config: AIConfig): AsyncGenerator<string> {
  const fullPrompt = `${systemMsg}\n\nUser: ${prompt}\n\nAssistant:`;
  const res = await fetch(`${config.ollamaEndpoint}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.ollamaModel, prompt: fullPrompt, stream: true }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const reader = res.body!.getReader();
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
}

function getStreamer(config: AIConfig): typeof streamOpenAI {
  switch (config.provider) {
    case "openai": return streamOpenAI;
    case "anthropic": return streamAnthropic;
    case "ollama": return streamOllama;
  }
}

export async function* streamLLM(prompt: string, contextText: string): AsyncGenerator<string> {
  const config = getConfig();
  const systemMsg = `You are Graphite AI, a helpful note-taking assistant. Use the following note context to answer accurately.\n\nNote Context:\n${contextText.slice(0, 8000)}`;
  const streamer = getStreamer(config);

  if (config.provider === "openai" && !config.openaiKey) {
    return fallbackResponse(prompt, contextText);
  }
  if (config.provider === "anthropic" && !config.anthropicKey) {
    return fallbackResponse(prompt, contextText);
  }

  try {
    for await (const chunk of streamer(prompt, systemMsg, config)) {
      yield chunk;
    }
    return;
  } catch {
    return fallbackResponse(prompt, contextText);
  }
}

async function* fallbackResponse(prompt: string, contextText: string): AsyncGenerator<string> {
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

function extractPlainText(editorState: string): string {
  try {
    if (editorState.startsWith("{")) {
      const json = JSON.parse(editorState);
      const text = json.root?.children?.map((child: any) => {
        if (child.children) {
          return child.children.map((c: any) => c.text || "").join("");
        }
        return child.text || "";
      }).join("\n") || "";
      return text;
    }
  } catch {}
  return extractHumanText(editorState);
}

export async function autoSuggestTags(noteText: string, editorState?: string): Promise<string[]> {
  const config = getConfig();
  const clean = editorState ? extractPlainText(editorState) : noteText;

  if (config.provider === "openai" && config.openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.openaiKey}`,
        },
        body: JSON.stringify({
          model: config.openaiModel,
          messages: [
            { role: "system", content: "Suggest 2-5 short tags (single words or compounds) for this note content. Return ONLY a comma-separated list of tags, no explanation." },
            { role: "user", content: clean.slice(0, 4000) },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        return text.split(",").map((t: string) => t.trim().toLowerCase().replace(/[^a-z0-9-#]/g, "")).filter(Boolean);
      }
    } catch {}
  }

  if (config.provider === "anthropic" && config.anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.anthropicModel,
          system: "Suggest 2-5 short tags (single words or compounds) for this note content. Return ONLY a comma-separated list of tags, no explanation.",
          messages: [{ role: "user", content: clean.slice(0, 4000) }],
          max_tokens: 100,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text || "";
        return text.split(",").map((t: string) => t.trim().toLowerCase().replace(/[^a-z0-9-#]/g, "")).filter(Boolean);
      }
    } catch {}
  }

  if (config.provider === "ollama" && config.ollamaEndpoint) {
    try {
      const res = await fetch(`${config.ollamaEndpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.ollamaModel,
          prompt: `Suggest 2-5 short tags (single words or compounds) for this note content. Return ONLY a comma-separated list of tags, no explanation.\n\nContent:\n${clean.slice(0, 3000)}`,
          stream: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.response || "";
        return text.split(",").map((t: string) => t.trim().toLowerCase().replace(/[^a-z0-9-#]/g, "")).filter(Boolean);
      }
    } catch {}
  }

  const fallback = clean.toLowerCase();
  const tags = new Set<string>();
  if (fallback.includes("react") || fallback.includes("javascript") || fallback.includes("code") || fallback.includes("build")) tags.add("dev");
  if (fallback.includes("project") || fallback.includes("roadmap") || fallback.includes("task")) tags.add("project");
  if (fallback.includes("meeting") || fallback.includes("sync") || fallback.includes("call")) tags.add("meeting");
  if (fallback.includes("design") || fallback.includes("ui") || fallback.includes("ux")) tags.add("design");
  if (tags.size === 0) tags.add("notes");
  return Array.from(tags);
}

export async function suggestSmartBacklinks(
  noteText: string,
  allDocs: Record<string, any>
): Promise<AISuggestedLink[]> {
  const clean = extractHumanText(noteText).toLowerCase();
  const candidates: AISuggestedLink[] = [];

  const { cosineSimilarity, getCachedEmbedding } = await import("./embedding");
  const noteEmbedding = getCachedEmbedding("current");
  const docs = Object.values(allDocs) as any[];

  for (const doc of docs) {
    if (doc.isFolder || !doc.title || !doc.id) continue;
    const titleLower = doc.title.toLowerCase();
    let score = 0;
    let reason = "";

    if (clean.includes(titleLower) && titleLower.length > 2) {
      score = 0.5;
      reason = `Mentions "${doc.title}" in content`;
    }

    if (noteEmbedding) {
      const docEmb = getCachedEmbedding(doc.id);
      if (docEmb) {
        const sim = cosineSimilarity(noteEmbedding, docEmb);
        if (sim > score) {
          score = sim;
          reason = `Semantically similar (${Math.round(sim * 100)}% match)`;
        }
      }
    }

    if (score > 0.3) {
      candidates.push({ docId: doc.id, title: doc.title, reason, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 5);
}

export async function generateFromPrompt(prompt: string, contextText: string): Promise<string> {
  const config = getConfig();
  const systemMsg = `You are Graphite AI. Generate rich note content based on the user's request. Use the following context for reference.\n\nContext:\n${contextText.slice(0, 4000)}`;
  const streamer = getStreamer(config);

  let result = "";
  let hasRealLLM = false;

  if (config.provider === "openai" && config.openaiKey) hasRealLLM = true;
  if (config.provider === "anthropic" && config.anthropicKey) hasRealLLM = true;
  if (config.provider === "ollama") hasRealLLM = true;

  if (hasRealLLM) {
    try {
      for await (const chunk of streamer(prompt, systemMsg, config)) {
        result += chunk;
      }
    } catch {}
  }

  if (!result) {
    const lower = prompt.toLowerCase();
    if (lower.includes("meeting")) {
      result = `# Meeting Notes\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:** \n\n## Agenda\n1. \n2. \n3. \n\n## Discussion\n\n## Action Items\n- [ ] \n- [ ] \n\n## Next Meeting\n`;
    } else if (lower.includes("brainstorm") || lower.includes("idea")) {
      result = `# Brainstorming\n\n## Ideas\n- \n- \n- \n\n## Next Steps\n- Evaluate feasibility\n- Prioritize\n- Assign owners\n`;
    } else {
      result = `# Generated Note\n\n${prompt}\n\n---\n\n*Generated by Graphite AI*`;
    }
  }

  return result;
}

export async function rewriteText(text: string, instruction: string): Promise<string> {
  const config = getConfig();
  const systemMsg = `You are Graphite AI. Rewrite the following text according to the instruction. Return ONLY the rewritten text, no explanations.`;
  const prompt = `Instruction: ${instruction}\n\nText:\n${text}`;

  const streamer = getStreamer(config);
  let result = "";
  let hasRealLLM = false;

  if (config.provider === "openai" && config.openaiKey) hasRealLLM = true;
  if (config.provider === "anthropic" && config.anthropicKey) hasRealLLM = true;
  if (config.provider === "ollama") hasRealLLM = true;

  if (hasRealLLM) {
    try {
      for await (const chunk of streamer(prompt, systemMsg, config)) {
        result += chunk;
      }
      return result.trim() || text;
    } catch {}
  }

  return text;
}
