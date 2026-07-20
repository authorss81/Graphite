import { useEffect, useCallback, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { EditorState } from "lexical";
import { sendUpdateToNative, logToNative, encodeBase64 } from "../utils/bridge";

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
};

function onError(error: Error) {
  logToNative("error", `Lexical Error: ${error.message}`);
}

function EditorStateLoader({ initialState }: { initialState?: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!initialState) return;

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

export function Editor({ docId, initialState }: EditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const initialConfig = {
    namespace: "GraphiteEditor",
    theme: graphiteTheme,
    onError,
    editorState: undefined,
  };

  const handleEditorChange = useCallback((editorState: EditorState) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      editorState.read(() => {
        const serializedState = JSON.stringify(editorState.toJSON());
        sendUpdateToNative(docId, encodeBase64(serializedState));
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
          <OnChangePlugin onChange={handleEditorChange} />
        </div>
      </LexicalComposer>
    </div>
  );
}
