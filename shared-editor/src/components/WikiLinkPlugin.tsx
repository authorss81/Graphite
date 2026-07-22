import { useEffect, useState, useCallback, useMemo } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
  type TextNode,
} from "lexical";
import { useNoteStore } from "../store/useNoteStore";
import { FileText } from "lucide-react";

export function WikiLinkPlugin() {
  const [editor] = useLexicalComposerContext();
  const documents = useNoteStore((s) => s.documents);
  const [isOpen, setIsOpen] = useState(false);
  const [queryString, setQueryString] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const docList = useMemo(() => {
    return Object.values(documents).filter((d) => !d.isFolder);
  }, [documents]);

  const filteredDocs = useMemo(() => {
    if (!queryString) return docList;
    const q = queryString.toLowerCase();
    return docList.filter((d) => d.title.toLowerCase().includes(q));
  }, [docList, queryString]);

  const insertWikiLink = useCallback(
    (title: string) => {
      editor.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) {
          const node = sel.anchor.getNode();
          const text = node.getTextContent();
          const lastBracket = text.lastIndexOf("[[");
          if (lastBracket !== -1) {
            (node as TextNode).setTextContent(text.substring(0, lastBracket));
          }
          const wikiTextNode = $createTextNode(`[[${title}]]`);
          sel.insertNodes([wikiTextNode]);
        }
      });
      setIsOpen(false);
      setQueryString("");
    },
    [editor],
  );

  // Scan and highlight [[WikiLink]] text nodes with interactive pill styling
  useEffect(() => {
    if (typeof document === "undefined") return;
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const highlightWikiLinks = () => {
      if (typeof document === "undefined") return;
      const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null);
      let currentNode = walker.nextNode();
      const nodesToStyle: { textNode: Text; matches: { title: string; start: number; end: number }[] }[] = [];

      while (currentNode) {
        const val = currentNode.nodeValue || "";
        if (val.includes("[[")) {
          const regex = /\[\[(.*?)\]\]/g;
          let match: RegExpExecArray | null;
          const matches = [];
          while ((match = regex.exec(val)) !== null) {
            matches.push({ title: match[1], start: match.index, end: match.index + match[0].length });
          }
          if (matches.length > 0) {
            nodesToStyle.push({ textNode: currentNode as Text, matches });
          }
        }
        currentNode = walker.nextNode();
      }

      nodesToStyle.forEach(({ textNode }) => {
        const parent = textNode.parentNode;
        if (parent && !(parent as HTMLElement).classList?.contains("graphite-wikilink-pill")) {
          const val = textNode.nodeValue || "";
          const parts = val.split(/(\[\[.*?\]\])/g);
          if (parts.length > 1) {
            const frag = document.createDocumentFragment();
            parts.forEach((part) => {
              if (part.startsWith("[[") && part.endsWith("]]")) {
                const title = part.slice(2, -2);
                const pill = document.createElement("span");
                pill.className = "graphite-wikilink-pill";
                pill.setAttribute("data-wikilink", title);
                pill.innerText = `🔗 ${title}`;
                pill.onclick = (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const found = Object.values(useNoteStore.getState().documents).find(
                    (d) => d.title.toLowerCase() === title.toLowerCase() && !d.isFolder
                  );
                  if (found) {
                    useNoteStore.getState().selectDocument(found.id);
                  }
                };
                frag.appendChild(pill);
              } else {
                frag.appendChild(document.createTextNode(part));
              }
            });
            parent.replaceChild(frag, textNode);
          }
        }
      });
    };

    const unbind = editor.registerUpdateListener(() => {
      setTimeout(highlightWikiLinks, 50);
    });
    highlightWikiLinks();

    return () => unbind();
  }, [editor]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.classList?.contains("graphite-wikilink-pill")) {
        const linkTitle = target.getAttribute("data-wikilink");
        if (linkTitle) {
          const found = Object.values(useNoteStore.getState().documents).find(
            (d) => d.title.toLowerCase() === linkTitle.toLowerCase() && !d.isFolder
          );
          if (found) {
            e.preventDefault();
            useNoteStore.getState().selectDocument(found.id);
          }
        }
      }
    };

    const rootElement = editor.getRootElement();
    if (rootElement) {
      rootElement.addEventListener("click", handleDocumentClick);
    }
    return () => {
      if (rootElement) {
        rootElement.removeEventListener("click", handleDocumentClick);
      }
    };
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel) || !sel.isCollapsed()) {
          setIsOpen(false);
          return;
        }

        const anchor = sel.anchor;
        const node = anchor.getNode();
        const text = node.getTextContent();
        const offset = anchor.offset;

        const textBeforeCursor = text.slice(0, offset);
        const lastBracket = textBeforeCursor.lastIndexOf("[[");

        if (lastBracket !== -1 && !textBeforeCursor.slice(lastBracket).includes("]]")) {
          const query = textBeforeCursor.slice(lastBracket + 2);
          setQueryString(query);
          setSelectedIndex(0);

          const domSelection = window.getSelection();
          if (domSelection && domSelection.rangeCount > 0) {
            const range = domSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setMenuPosition({
              top: rect.bottom + window.scrollY + 6,
              left: Math.min(rect.left + window.scrollX, window.innerWidth - 260),
            });
            setIsOpen(true);
          }
        } else {
          setIsOpen(false);
        }
      });
    });
  }, [editor]);

  useEffect(() => {
    if (!isOpen) return;

    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredDocs.length));
          return true;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredDocs.length) % Math.max(1, filteredDocs.length));
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          if (filteredDocs[selectedIndex]) {
            insertWikiLink(filteredDocs[selectedIndex].title);
          } else if (queryString.trim()) {
            insertWikiLink(queryString.trim());
          }
          return true;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setIsOpen(false);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, isOpen, filteredDocs, selectedIndex, queryString, insertWikiLink]);

  if (!isOpen) return null;

  return (
    <div
      className="graphite-slash-menu wikilink-menu"
      style={{
        position: "absolute",
        top: menuPosition.top,
        left: menuPosition.left,
        zIndex: 1000,
      }}
    >
      <div className="slash-menu-header">Link to Document</div>
      <div className="slash-menu-list">
        {filteredDocs.length === 0 ? (
          <button
            type="button"
            className="slash-menu-item selected"
            onClick={() => insertWikiLink(queryString.trim() || "New Page")}
          >
            <div className="slash-menu-icon">
              <FileText size={16} />
            </div>
            <div className="slash-menu-content">
              <span className="slash-menu-title">[[{queryString || "New Page"}]]</span>
              <span className="slash-menu-desc">Create new backlink</span>
            </div>
          </button>
        ) : (
          filteredDocs.map((doc, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={doc.id}
                type="button"
                className={`slash-menu-item${isSelected ? " selected" : ""}`}
                onClick={() => insertWikiLink(doc.title)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="slash-menu-icon">
                  <FileText size={16} />
                </div>
                <div className="slash-menu-content">
                  <span className="slash-menu-title">{doc.title}</span>
                  <span className="slash-menu-desc">Link to existing note</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
