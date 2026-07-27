import { useEffect, useRef, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { createYjsBinding, CONNECTED_COMMAND } from "@lexical/yjs";
import { getYDoc, authorizeYDoc, deauthorizeYDoc, setAwarenessState, clearAwareness } from "../utils/yjsSync";
import { getCurrentUser } from "../utils/userRegistry";

interface MultiplayerPluginProps {
  docId: string;
  onConnectionChange?: (connected: boolean) => void;
}

export function MultiplayerPlugin({ docId, onConnectionChange }: MultiplayerPluginProps) {
  const [editor] = useLexicalComposerContext();
  const clientIdRef = useRef<number>(0);
  const bindingRef = useRef<any>(null);
  const user = useRef(getCurrentUser());

  useEffect(() => {
    authorizeYDoc(docId);
    const yDoc = getYDoc(docId);

    const binding = createYjsBinding({
      editor,
      id: docId,
      doc: yDoc,
      docMap: yDoc.getMap("docs") as any,
    });
    bindingRef.current = binding;

    // Set awareness state for this user
    clientIdRef.current = setAwarenessState(
      user.current.id,
      user.current.name,
      user.current.color,
      { focused: true, docId }
    );

    editor.dispatchCommand(CONNECTED_COMMAND, true);
    onConnectionChange?.(true);

    return () => {
      deauthorizeYDoc(docId);
      clearAwareness(clientIdRef.current);
      try {
        (binding as any).destroy();
      } catch {}
      onConnectionChange?.(false);
    };
  }, [docId, editor, onConnectionChange]);

  const updateCursor = useCallback((cid?: number) => {
    const rootEl = editor.getRootElement();
    if (!rootEl) return;
    const sel = document.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = rootEl.getBoundingClientRect();

    return setAwarenessState(
      user.current.id,
      user.current.name,
      user.current.color,
      {
        cursor: { x: rect.left - editorRect.left, y: rect.top - editorRect.top },
        focused: true,
        docId,
      },
      cid
    );
  }, [editor, docId]);

  useEffect(() => {
    const rootEl = editor.getRootElement();
    if (!rootEl) return;

    const onMouseMove = () => {
      if (document.activeElement === rootEl) {
        clientIdRef.current = updateCursor(clientIdRef.current) || clientIdRef.current;
      }
    };

    const onFocus = () => {
      clientIdRef.current = setAwarenessState(
        user.current.id,
        user.current.name,
        user.current.color,
        { focused: true, docId },
        clientIdRef.current
      );
    };

    const onBlur = () => {
      clientIdRef.current = setAwarenessState(
        user.current.id,
        user.current.name,
        user.current.color,
        { focused: false, docId },
        clientIdRef.current
      );
    };

    rootEl.addEventListener("mousemove", onMouseMove);
    rootEl.addEventListener("focus", onFocus);
    rootEl.addEventListener("blur", onBlur);

    return () => {
      rootEl.removeEventListener("mousemove", onMouseMove);
      rootEl.removeEventListener("focus", onFocus);
      rootEl.removeEventListener("blur", onBlur);
    };
  }, [editor, updateCursor, docId]);

  return null;
}
