import { useEffect, useCallback, useRef } from "react";
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
import { $insertNodes, COMMAND_PRIORITY_LOW } from "lexical";
import { CanvasNode, $createCanvasNode, INSERT_CANVAS_COMMAND } from "./CanvasNode";
import { EditorToolbar } from "./EditorToolbar";
import { sendUpdateToNative, logToNative, encodeBase64 } from "../utils/bridge";
import { useNoteStore } from "../store/useNoteStore";

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

function EditorStateLoader({ initialState }: { initialState?: string }) {
  const [editor] = useLexicalComposerContext();
  const lastLoaded = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!initialState) return;
    if (lastLoaded.current === initialState) return;
    lastLoaded.current = initialState;

    const trimmed = initialState.trim();

    try {
      if (trimmed.startsWith("{")) {
        JSON.parse(initialState);
        editor.setEditorState(editor.parseEditorState(initialState));
        return;
      }
    } catch {
      // not JSON
    }

    if (trimmed.startsWith("<")) {
      editor.setEditorState(editor.parseEditorState(initialState));
    }
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

export function Editor({ docId, initialState }: EditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const initialConfig = {
    namespace: "GraphiteEditor",
    theme: graphiteTheme,
    onError,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode, CanvasNode],
    editorState: undefined,
  };

  const handleEditorChange = useCallback((editorState: EditorState) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      editorState.read(() => {
        const serializedState = JSON.stringify(editorState.toJSON());
        sendUpdateToNative(docId, encodeBase64(serializedState));
        useNoteStore.getState().updateCurrentContent(serializedState);
      });
    }, 300);
  }, [docId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="graphite-editor-container">
      <LexicalComposer initialConfig={initialConfig}>
        <EditorStateLoader initialState={initialState} />
        <div className="editor-toolbar-wrap">
          <EditorToolbar />
        </div>
        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="editor-input"
                aria-placeholder="Write your thoughts..."
                placeholder={<div className="editor-placeholder">Start writing something amazing...</div>}
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
        </div>
      </LexicalComposer>
    </div>
  );
}
