import { useEffect, useRef, useState, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  KEY_TAB_COMMAND,
  COMMAND_PRIORITY_LOW,
} from "lexical";
import { loadAIConfig } from "../utils/aiConfig";
import { toast } from "./Toast";

let ghostAbortController: AbortController | null = null;

export function GhostTextPlugin() {
  const [editor] = useLexicalComposerContext();
  const ghostRef = useRef<HTMLSpanElement>(null);
  const suggestionRef = useRef<string>("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestion = useCallback(async (textBefore: string) => {
    if (ghostAbortController) {
      ghostAbortController.abort();
    }
    ghostAbortController = new AbortController();

    const config = loadAIConfig();

    if (config.provider === "openai" && !config.openaiKey) return;
    if (config.provider === "anthropic" && !config.anthropicKey) return;

    const text = textBefore.slice(-2000);
    if (text.trim().length < 10) return;

    try {
      let result = "";
      const systemMsg = "You are an inline code completion engine. Complete the text where the cursor is. Return ONLY the completion text, no explanations, no markdown. Keep it under 50 characters unless context requires more.";

      if (config.provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          signal: ghostAbortController.signal,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.openaiKey}`,
          },
          body: JSON.stringify({
            model: config.openaiModel,
            messages: [
              { role: "system", content: systemMsg },
              { role: "user", content: text },
            ],
            max_tokens: 50,
            temperature: 0.3,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          result = data.choices?.[0]?.message?.content?.trim() || "";
        }
      } else if (config.provider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          signal: ghostAbortController.signal,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: config.anthropicModel,
            system: systemMsg,
            messages: [{ role: "user", content: text }],
            max_tokens: 50,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          result = data.content?.[0]?.text?.trim() || "";
        }
      } else if (config.provider === "ollama") {
        const res = await fetch(`${config.ollamaEndpoint}/api/generate`, {
          signal: ghostAbortController.signal,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: config.ollamaModel,
            prompt: `${systemMsg}\n\nText:\n${text}`,
            stream: false,
            options: { temperature: 0.3, num_predict: 50 },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          result = (data.response || "").trim();
        }
      }

      if (result && result.length < 200 && !result.includes("\n")) {
        suggestionRef.current = result;
        if (ghostRef.current) {
          ghostRef.current.textContent = result;
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        suggestionRef.current = "";
      }
    }
  }, []);

  useEffect(() => {
    const unregisterListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel) || !sel.isCollapsed()) {
          suggestionRef.current = "";
          if (ghostRef.current) ghostRef.current.textContent = "";
          return;
        }

        const node = sel.anchor.getNode();
        const text = node.getTextContent();
        const offset = sel.anchor.offset;
        const textBeforeCursor = text.slice(0, offset);

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        const lastLine = textBeforeCursor.split("\n").pop() || "";
        if (lastLine.trim().length >= 15 && !lastLine.endsWith(" ")) {
          debounceTimerRef.current = setTimeout(() => {
            fetchSuggestion(lastLine);
          }, 800);
        } else {
          suggestionRef.current = "";
          if (ghostRef.current) ghostRef.current.textContent = "";
        }
      });
    });

    return () => {
      unregisterListener();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [editor, fetchSuggestion]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_TAB_COMMAND,
      (event: KeyboardEvent | null) => {
        if (suggestionRef.current) {
          event?.preventDefault();
          const text = suggestionRef.current;
          suggestionRef.current = "";
          if (ghostRef.current) ghostRef.current.textContent = "";

          editor.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              sel.insertRawText(text);
            }
          });
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  useEffect(() => {
    const rootEl = editor.getRootElement();
    if (!rootEl) return;

    const ghost = document.createElement("span");
    ghost.className = "graphite-ghost-text";
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.cssText =
      "color: var(--text-muted); opacity: 0.5; pointer-events: none; user-select: none; white-space: pre;";
    ghostRef.current = ghost;

    const style = document.createElement("style");
    style.textContent = `
      .graphite-ghost-text {
        color: var(--text-muted) !important;
        opacity: 0.5 !important;
        pointer-events: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);

    const updatePosition = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && suggestionRef.current) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = rootEl.getBoundingClientRect();
        ghost.style.position = "absolute";
        ghost.style.left = `${rect.right - editorRect.left}px`;
        ghost.style.top = `${rect.top - editorRect.top}px`;
        ghost.style.lineHeight = `${rect.height}px`;
        ghost.style.fontSize = window.getComputedStyle(rootEl).fontSize;
      }
    };

    rootEl.style.position = "relative";
    rootEl.appendChild(ghost);

    const observer = new ResizeObserver(updatePosition);
    observer.observe(rootEl);

    return () => {
      ghost.remove();
      style.remove();
      observer.disconnect();
    };
  }, [editor]);

  return null;
}
