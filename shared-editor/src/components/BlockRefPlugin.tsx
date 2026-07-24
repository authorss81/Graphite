import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createTextNode, $getRoot, $isParagraphNode, $isTextNode } from "lexical";
import { $createBlockRefNode } from "./BlockRefNode";

const BLOCK_REF_REGEX = /(!)?\[\[([\w-]+)#\^([\w-]+)\]\]/;

export function BlockRefPlugin() {
  const [editor] = useLexicalComposerContext();
  const processed = useRef(new Set<string>());

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        for (const child of root.getChildren()) {
          if ($isParagraphNode(child)) {
            const key = child.getKey();
            if (processed.current.has(key)) continue;
            const text = child.getTextContent();
            const match = text.match(BLOCK_REF_REGEX);
            if (!match) continue;
            const targetDoc = match[2];
            const blockId = match[3];
            const fullMatch = match[0];

            editor.update(() => {
              const paragraphs = $getRoot().getChildren();
              for (const p of paragraphs) {
                if (!$isParagraphNode(p) || !p.getTextContent().includes(fullMatch)) continue;
                const textNode = p.getFirstChild();
                if (!textNode || !$isTextNode(textNode)) continue;
                const content = textNode.getTextContent();
                const idx = content.indexOf(fullMatch);
                if (idx < 0) continue;
                const before = content.slice(0, idx);
                const after = content.slice(idx + fullMatch.length);
                let refNode: any = textNode;
                if (before) {
                  const bn = $createTextNode(before);
                  refNode.insertAfter(bn);
                  refNode = bn;
                }
                const brn = $createBlockRefNode(targetDoc, blockId, fullMatch);
                refNode.insertAfter(brn);
                refNode = brn;
                if (after) {
                  const an = $createTextNode(after);
                  refNode.insertAfter(an);
                }
                textNode.remove();
                processed.current.add(key);
              }
            });
          }
        }
      });
    });
  }, [editor]);

  return null;
}
