import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateNodesFromDOM } from "@lexical/html";
import { $getSelection, $isRangeSelection, PASTE_COMMAND, COMMAND_PRIORITY_LOW } from "lexical";

export function HtmlImportPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (payload: ClipboardEvent | null) => {
        if (!payload) return false;
        const html = payload.clipboardData?.getData("text/html");
        if (!html) return false;
        // Only handle if it looks like rich HTML (not just a line break)
        if (html.trim() === "<br>" || html.trim() === "<br/>") return false;

        const parser = new DOMParser();
        const dom = parser.parseFromString(html, "text/html");
        const nodes = $generateNodesFromDOM(editor, dom);
        if (nodes.length === 0) return false;

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;
        selection.insertNodes(nodes);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  return null;
}
