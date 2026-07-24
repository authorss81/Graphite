import { useEffect, useRef, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { createYjsBinding, CONNECTED_COMMAND, syncCursorPositions, setLocalStateFocus } from "@lexical/yjs";
import { getYDoc, setAwarenessState, clearAwareness } from "../utils/yjsSync";
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
    const yDoc = getYDoc(docId);

    const binding = createYjsBinding(editor, yDoc, docId, {
      isLocal: true,
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
      clearAwareness(clientIdRef.current);
      try { binding.destroy(); } catch {}
      onConnectionChange?.(false);
    };
  }, [docId, editor, onConnectionChange]);

  const updateCursor = useCallback(() => {
    const rootEl = editor.getRootElement();
    if (!rootEl) return;
    const sel = document.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = rootEl.getBoundingClientRect();

    setAwarenessState(
      user.current.id,
      user.current.name,
      user.current.color,
      {
        cursor: { x: rect.left - editorRect.left, y: rect.top - editorRect.top },
        focused: true,
        docId,
      }
    );
  }, [editor, docId]);

  useEffect(() => {
    const rootEl = editor.getRootElement();
    if (!rootEl) return;

    const onMouseMove = (e: MouseEvent) => {
      if (document.activeElement === rootEl) {
        updateCursor();
      }
    };

    const onFocus = () => {
      setLocalStateFocus(editor, true);
    };

    const onBlur = () => {
      setLocalStateFocus(editor, false);
    };

    rootEl.addEventListener("mousemove", onMouseMove);
    rootEl.addEventListener("focus", onFocus);
    rootEl.addEventListener("blur", onBlur);

    return () => {
      rootEl.removeEventListener("mousemove", onMouseMove);
      rootEl.removeEventListener("focus", onFocus);
      rootEl.removeEventListener("blur", onBlur);
    };
  }, [editor, updateCursor]);

  return null;
}
