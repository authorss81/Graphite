import { useEffect, useCallback, useRef, useState, startTransition } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { EditorState } from "lexical";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { TRANSFORMERS } from "@lexical/markdown";
import { $insertNodes, $getSelection, $isRangeSelection, $getRoot, $createParagraphNode, $createTextNode, KEY_ENTER_COMMAND, COMMAND_PRIORITY_LOW, COMMAND_PRIORITY_HIGH } from "lexical";
import { CanvasNode, $createCanvasNode, INSERT_CANVAS_COMMAND } from "./CanvasNode";
import { ImageNode, $createImageNode, INSERT_IMAGE_COMMAND } from "./ImageNode";
import { BlockRefNode } from "./BlockRefNode";
import { BlockRefPlugin } from "./BlockRefPlugin";
import { GhostTextPlugin } from "./GhostTextPlugin";
import { CodeHighlightPlugin } from "./CodeHighlightPlugin";
import { MultiplayerPlugin } from "./MultiplayerPlugin";
import { AwarenessCursorsPlugin } from "./AwarenessCursorsPlugin";
import { EditorToolbar } from "./EditorToolbar";
import { SlashMenuPlugin } from "./SlashMenuPlugin";
import { WikiLinkPlugin } from "./WikiLinkPlugin";
import { BlockDragHandlePlugin } from "./BlockDragHandlePlugin";
import { HtmlImportPlugin } from "../plugins/HtmlImportPlugin";
import { TaskProgressHeader } from "./TaskProgressHeader";
import { TagManager } from "./TagManager";
import { SmartBacklinks } from "./SmartBacklinks";
import { sendUpdateToNative, logToNative, encodeBase64 } from "../utils/bridge";
import { useNoteStore } from "../store/useNoteStore";
import { uploadFromClipboard } from "../utils/upload";
import { extractTextFromPdf, pdfToMarkdown } from "../utils/pdfImport";
import { autoSuggestTags } from "../utils/aiService";
import { toast } from "./Toast";
import { ErrorBoundary } from "./ErrorBoundary";
import { isPluginActive } from "../utils/pluginSystem";
import { WordStatsBar } from "./WordStatsBar";
import { ShieldCheck } from "lucide-react";
import { $isCodeNode } from "@lexical/code";

interface EditorProps {
  docId: string;
  initialState?: string;
}

const graphiteTheme = {
  paragraph: "graphite-editor-paragraph",
  heading: {
    h1: "graphite-editor-h1",
    h2: "graphite-editor-h2",
    h3: "graphite-editor-h3",
  },
  list: {
    nested: { list: "graphite-editor-nested-list" },
    ol: "graphite-editor-ol",
    ul: "graphite-editor-ul",
    listitem: "graphite-editor-listitem",
  },
  text: {
    bold: "graphite-editor-bold",
    italic: "graphite-editor-italic",
    underline: "graphite-editor-underline",
    code: "graphite-editor-code",
  },
  quote: "graphite-editor-quote",
  link: "graphite-editor-link",
  code: "graphite-editor-codeblock",
};

function onError(error: Error) {
  logToNative("error", `Lexical Error: ${error.message}`);
}

function FileDropPlugin() {
  const [editor] = useLexicalComposerContext();
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      const items = e.dataTransfer?.items;
      if (items && items.length > 0) {
        const url = await uploadFromClipboard(items);
        if (url && file.type.startsWith("image/")) {
          editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src: url });
          return;
        }
      }
      if (file.type.startsWith("text/") || file.name.endsWith(".md")) {
        const text = await file.text();
        editor.update(() => {
          const sel = $getSelection();
          if ($isRangeSelection(sel)) {
            sel.insertRawText(text);
          }
        });
      }
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        try {
          const text = await extractTextFromPdf(file);
          const markdown = pdfToMarkdown(text, file.name);
          editor.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              sel.insertRawText(markdown);
            }
          });
          toast(`Imported PDF: ${file.name}`, "success");
        } catch (err) {
          toast(`Failed to import PDF: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
        }
      }
    };
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("drop", handleDrop);
    return () => {
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("drop", handleDrop);
    };
  }, [editor]);

  return <div ref={dropRef} style={{ display: "contents" }} />;
}

function EditorStateLoader({ initialState }: { initialState?: string }) {
  const [editor] = useLexicalComposerContext();
  const lastLoaded = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!initialState) return;
    if (lastLoaded.current === initialState) return;

    const trimmed = initialState.trim();

    if (trimmed.startsWith("enc:")) {
      // Document is client-side encrypted — skip Lexical AST parsing until unlocked
      return;
    }

    // Skip redundant setEditorState if current Lexical state already matches initialState
    try {
      const currentJson = editor.getEditorState().read(() => JSON.stringify(editor.getEditorState().toJSON()));
      if (currentJson === trimmed) {
        lastLoaded.current = initialState;
        return;
      }
    } catch {
      /* ignore */
    }

    lastLoaded.current = initialState;

    startTransition(() => {
      try {
        if (trimmed.startsWith("{")) {
          const parsedState = editor.parseEditorState(initialState);
          editor.setEditorState(parsedState);
          return;
        }
      } catch (err) {
        logToNative("error", `Failed to parse Lexical editor state: ${err instanceof Error ? err.message : String(err)}`);
        // Fallback: convert raw text to paragraph nodes to prevent editor crash on unknown nodes
        try {
          editor.update(() => {
            const root = $getRoot();
            root.clear();
            const p = $createParagraphNode();
            p.append($createTextNode(initialState));
            root.append(p);
          });
        } catch {
          /* fallback swallow */
        }
      }

      if (trimmed.startsWith("<")) {
        try {
          const parsedState = editor.parseEditorState(initialState);
          editor.setEditorState(parsedState);
        } catch {
          /* ignore fallback */
        }
      }
    });
  }, [editor, initialState]);

  return null;
}

function CanvasInserterPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_CANVAS_COMMAND,
      (data) => {
        editor.update(() => {
          $insertNodes([$createCanvasNode(data)]);
        });
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return null;
}

function KeyboardHandler() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const keyboardHeight = window.innerHeight - vv.height;
      document.documentElement.style.setProperty(
        "--keyboard-height",
        `${Math.max(0, keyboardHeight)}px`,
      );
    };

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  return null;
}

function ImagePastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          event.preventDefault();
          try {
            const url = await uploadFromClipboard(items);
            if (url) {
              editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src: url, alt: "Pasted image" });
            }
          } catch (err: unknown) {
            toast(`Image paste failed: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
          }
          return;
        }
      }
    };

    rootElement.addEventListener("paste", handlePaste);
    return () => rootElement.removeEventListener("paste", handlePaste);
  }, [editor]);

  return null;
}

function ImageInserterPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        editor.update(() => {
          $insertNodes([$createImageNode(payload)]);
        });
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return null;
}

function CodeExitPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent | null) => {
        if (!event) return false;
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        const anchorNode = selection.anchor.getNode();
        const codeNode = anchorNode.getTopLevelElementOrThrow();

        if ($isCodeNode(codeNode)) {
          if (event.shiftKey || event.ctrlKey || event.metaKey) {
            event.preventDefault();
            editor.update(() => {
              const p = $createParagraphNode();
              codeNode.insertAfter(p);
              p.select();
            });
            return true;
          }
          const text = codeNode.getTextContent();
          if (text.endsWith("\n") || text.trim() === "") {
            event.preventDefault();
            editor.update(() => {
              const p = $createParagraphNode();
              codeNode.insertAfter(p);
              p.select();
            });
            return true;
          }
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor]);

  return null;
}

export function Editor({ docId, initialState }: EditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingSaveRef = useRef<{ targetDocId: string; editorState: EditorState } | null>(null);

  const initialConfig = {
    namespace: "GraphiteEditor",
    theme: graphiteTheme,
    onError,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode, CanvasNode, ImageNode, BlockRefNode],
    editorState: undefined,
  };

  const flushPendingSave = useCallback(() => {
    if (!pendingSaveRef.current) return;
    const { targetDocId, editorState } = pendingSaveRef.current;
    pendingSaveRef.current = null;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }

    const currentDoc = useNoteStore.getState().documents[targetDocId];
    if (currentDoc?.editorState?.trim().startsWith("enc:")) {
      return;
    }

    try {
      editorState.read(() => {
        const serializedState = JSON.stringify(editorState.toJSON());
        if (!serializedState.trim().startsWith("enc:")) {
          sendUpdateToNative(targetDocId, encodeBase64(serializedState));
          useNoteStore.getState().updateContentForDoc(targetDocId, serializedState);
        }
      });
    } catch (err: unknown) {
      toast(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    }

    const currentDoc = useNoteStore.getState().documents[targetDocId];
    if (currentDoc && !currentDoc.editorState?.trim().startsWith("enc:")) {
      const tags = useNoteStore.getState().documents[targetDocId]?.tags;
      if (!tags || tags.length === 0) {
        autoSuggestTags("", currentDoc.editorState || "").then((suggestedTags) => {
          if (suggestedTags.length > 0) {
            const store = useNoteStore.getState();
            suggestedTags.forEach((t) => store.addTagToDocument(targetDocId, t));
          }
        }).catch(() => {});
      }
    }
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [collabConnected, setCollabConnected] = useState(false);

  const handleEditorChange = useCallback((editorState: EditorState) => {
    const targetDocId = docId;
    const currentDoc = useNoteStore.getState().documents[targetDocId];
    if (currentDoc?.editorState?.trim().startsWith("enc:")) {
      return;
    }

    setIsSaving(true);
    pendingSaveRef.current = { targetDocId, editorState };

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      flushPendingSave();
      setIsSaving(false);
    }, 300);
  }, [docId, flushPendingSave]);

  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [docId, flushPendingSave]);

  return (
    <div className="graphite-editor-container">
      <ErrorBoundary name="LexicalComposer">
      <LexicalComposer initialConfig={initialConfig}>
        <EditorStateLoader initialState={initialState} />
        <div className="editor-toolbar-wrap">
          <EditorToolbar />
          {isSaving && (
            <span
              style={{
                position: "absolute",
                right: 8,
                top: 6,
                fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Saving...
            </span>
          )}
          {collabConnected && (
            <span
              style={{
                position: "absolute",
                right: isSaving ? 68 : 8,
                top: 6,
                fontSize: 10,
                color: "var(--accent-success)",
                fontFamily: "var(--font-mono)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-success)", display: "inline-block" }} />
              Collab
            </span>
          )}
        </div>
        <TagManager />
        <TaskProgressHeader />
        {initialState?.trim().startsWith("enc:") && (
          <div
            style={{
              padding: "16px",
              margin: "16px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--accent-color)",
              borderRadius: "10px",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <ShieldCheck size={24} style={{ color: "var(--accent-color)" }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>Encrypted Document</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                This document is client-side encrypted. Click Security in the top bar to enter your password and unlock.
              </div>
            </div>
          </div>
        )}
        <div className="editor-inner" style={{ position: "relative" }}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="editor-input"
                dir="auto"
                spellCheck={true}
                aria-placeholder="Start writing something amazing... (Type / for commands, [[ for note links)"
                placeholder={<div className="editor-placeholder">Start writing something amazing... (Type / for commands, [[ for note links)</div>}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <OnChangePlugin onChange={handleEditorChange} />
          <CanvasInserterPlugin />
          <ImageInserterPlugin />
          <ImagePastePlugin />
          <CodeExitPlugin />
          <KeyboardHandler />
          <SlashMenuPlugin />
          <WikiLinkPlugin />
          <BlockDragHandlePlugin />
          <FileDropPlugin />
          <HtmlImportPlugin />
          <BlockRefPlugin />
          <GhostTextPlugin />
          <CodeHighlightPlugin />
          <MultiplayerPlugin docId={docId} onConnectionChange={setCollabConnected} />
          {collabConnected && <AwarenessCursorsPlugin />}
        </div>
        {isPluginActive("word-counter-pro") && <WordStatsBar />}
      </LexicalComposer>
      <SmartBacklinks />
      </ErrorBoundary>
    </div>
  );
}
