import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
  type TextNode,
} from "lexical";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $createCodeNode } from "@lexical/code";
import { INSERT_CHECK_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from "@lexical/list";
import { INSERT_CANVAS_COMMAND } from "./CanvasNode";
import { INSERT_IMAGE_COMMAND } from "./ImageNode";
import { pickImage, uploadImage } from "../utils/upload";
import {
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Code,
  Palette,
  Image as ImageIcon,
  LayoutGrid,
  Network,
  Sigma,
  Play,
} from "lucide-react";

interface SlashOption {
  title: string;
  description: string;
  keywords: string[];
  icon: any;
  badge?: string;
  action: (editor: any) => void;
}

export function SlashMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const [queryString, setQueryString] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const anchorNodeKeyRef = useRef<string | null>(null);

  const options: SlashOption[] = useMemo(
    () => [
      {
        title: "Heading 1",
        description: "Large section heading",
        keywords: ["h1", "heading1", "title", "#"],
        icon: Heading1,
        badge: "#",
        action: (ed) => {
          ed.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              const node = sel.anchor.getNode().getTopLevelElementOrThrow();
              const heading = $createHeadingNode("h1");
              node.replace(heading);
              heading.select();
            }
          });
        },
      },
      {
        title: "Heading 2",
        description: "Medium section heading",
        keywords: ["h2", "heading2", "subtitle", "##"],
        icon: Heading2,
        action: (ed) => {
          ed.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              const node = sel.anchor.getNode().getTopLevelElementOrThrow();
              const heading = $createHeadingNode("h2");
              node.replace(heading);
              heading.select();
            }
          });
        },
      },
      {
        title: "Heading 3",
        description: "Small section heading",
        keywords: ["h3", "heading3", "###"],
        icon: Heading3,
        action: (ed) => {
          ed.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              const node = sel.anchor.getNode().getTopLevelElementOrThrow();
              const heading = $createHeadingNode("h3");
              node.replace(heading);
              heading.select();
            }
          });
        },
      },
      {
        title: "To-Do List",
        description: "Track tasks with checkable items",
        keywords: ["todo", "task", "check", "checkbox", "list"],
        icon: CheckSquare,
        action: (ed) => {
          ed.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
        },
      },
      {
        title: "Bullet List",
        description: "Simple bulleted list",
        keywords: ["bullet", "unordered", "list", "-"],
        icon: List,
        action: (ed) => {
          ed.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        },
      },
      {
        title: "Numbered List",
        description: "Ordered list with numbers",
        keywords: ["number", "ordered", "list", "1."],
        icon: ListOrdered,
        action: (ed) => {
          ed.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        },
      },
      {
        title: "Quote",
        description: "Capture quotes or callouts",
        keywords: ["quote", "blockquote", ">"],
        icon: Quote,
        action: (ed) => {
          ed.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              const node = sel.anchor.getNode().getTopLevelElementOrThrow();
              const quote = $createQuoteNode();
              node.replace(quote);
              quote.select();
            }
          });
        },
      },
      {
        title: "Code Block",
        description: "Code snippet with syntax highlighting",
        keywords: ["code", "script", "js", "python", "```"],
        icon: Code,
        action: (ed) => {
          ed.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              const node = sel.anchor.getNode().getTopLevelElementOrThrow();
              const code = $createCodeNode();
              node.replace(code);
              code.select();
            }
          });
        },
      },
      {
        title: "Canvas Drawing",
        description: "Embed interactive Excalidraw canvas",
        keywords: ["canvas", "draw", "whiteboard", "excalidraw", "sketch"],
        icon: Palette,
        action: (ed) => {
          ed.dispatchCommand(INSERT_CANVAS_COMMAND, undefined);
        },
      },
      {
        title: "Image",
        description: "Upload or embed an image",
        keywords: ["image", "picture", "photo", "upload"],
        icon: ImageIcon,
        action: async (ed) => {
          const file = await pickImage();
          if (file) {
            const src = await uploadImage(file);
            ed.dispatchCommand(INSERT_IMAGE_COMMAND, { src, alt: file.name });
          } else {
            const url = prompt("Or enter image URL:");
            if (url) {
              ed.dispatchCommand(INSERT_IMAGE_COMMAND, { src: url, alt: "Embedded Image" });
            }
          }
        },
      },
      {
        title: "Kanban Database",
        description: "Embed Notion-like Kanban board view",
        keywords: ["kanban", "board", "database", "tasks", "status"],
        icon: LayoutGrid,
        badge: "Board",
        action: (ed) => {
          ed.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              const node = sel.anchor.getNode().getTopLevelElementOrThrow();
              const quote = $createQuoteNode();
              const textNode = $createTextNode("📊 KANBAN BOARD\n| To Do | In Progress | Done |\n|---|---|---|\n| Task A | Task B | Task C |");
              quote.append(textNode);
              node.replace(quote);
              quote.select();
            }
          });
        },
      },
      {
        title: "Mermaid Diagram",
        description: "Flowcharts, sequence diagrams & state charts",
        keywords: ["mermaid", "diagram", "flowchart", "sequence"],
        icon: Network,
        badge: "Diagram",
        action: (ed) => {
          ed.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              const node = sel.anchor.getNode().getTopLevelElementOrThrow();
              const code = $createCodeNode();
              const textNode = $createTextNode("graph TD\n  A[Start] --> B[Process]\n  B --> C[Done]");
              code.append(textNode);
              node.replace(code);
              code.select();
            }
          });
        },
      },
      {
        title: "LaTeX Math Block",
        description: "Render KaTeX math equations",
        keywords: ["math", "latex", "equation", "katex", "$$"],
        icon: Sigma,
        badge: "$$",
        action: (ed) => {
          ed.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              const node = sel.anchor.getNode().getTopLevelElementOrThrow();
              const quote = $createQuoteNode();
              const textNode = $createTextNode("$$\nE = mc^2\n$$");
              quote.append(textNode);
              node.replace(quote);
              quote.select();
            }
          });
        },
      },
      {
        title: "Executable Code Sandbox",
        description: "Run JavaScript code inline with output console",
        keywords: ["code", "run", "sandbox", "javascript", "exec"],
        icon: Play,
        badge: "Run",
        action: (ed) => {
          ed.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              const node = sel.anchor.getNode().getTopLevelElementOrThrow();
              const codeNode = $createCodeNode();
              const textNode = $createTextNode("// JS Code Sandbox\nconsole.log('Running code sandbox!');");
              codeNode.append(textNode);
              node.replace(codeNode);
              codeNode.select();
            }
          });
        },
      },
    ],
    [],
  );

  const filteredOptions = useMemo(() => {
    if (!queryString) return options;
    const q = queryString.toLowerCase();
    return options.filter(
      (opt) =>
        opt.title.toLowerCase().includes(q) ||
        opt.keywords.some((kw) => kw.toLowerCase().includes(q)),
    );
  }, [options, queryString]);

  const executeOption = useCallback(
    (option: SlashOption) => {
      // Delete the slash trigger text
      editor.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) {
          const node = sel.anchor.getNode();
          const text = node.getTextContent();
          const slashPos = text.lastIndexOf("/");
          if (slashPos !== -1) {
            (node as TextNode).setTextContent(text.substring(0, slashPos));
          }
        }
      });
      option.action(editor);
      setIsOpen(false);
      setQueryString("");
    },
    [editor],
  );

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

        // Check if cursor is immediately after a '/'
        const textBeforeCursor = text.slice(0, offset);
        const lastSlash = textBeforeCursor.lastIndexOf("/");

        if (lastSlash !== -1 && (lastSlash === 0 || /\s/.test(textBeforeCursor[lastSlash - 1]))) {
          const query = textBeforeCursor.slice(lastSlash + 1);
          setQueryString(query);
          setSelectedIndex(0);
          anchorNodeKeyRef.current = node.getKey();

          const domSelection = window.getSelection();
          if (domSelection && domSelection.rangeCount > 0) {
            const range = domSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setMenuPosition({
              top: rect.bottom + window.scrollY + 6,
              left: Math.min(rect.left + window.scrollX, window.innerWidth - 280),
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
          setSelectedIndex((prev) => (prev + 1) % filteredOptions.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          if (filteredOptions[selectedIndex]) {
            executeOption(filteredOptions[selectedIndex]);
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
  }, [editor, isOpen, filteredOptions, selectedIndex, executeOption]);

  if (!isOpen || filteredOptions.length === 0) return null;

  return (
    <div
      className="graphite-slash-menu"
      style={{
        position: "absolute",
        top: menuPosition.top,
        left: menuPosition.left,
        zIndex: 1000,
      }}
    >
      <div className="slash-menu-header">Insert Block</div>
      <div className="slash-menu-list">
        {filteredOptions.map((opt, idx) => {
          const Icon = opt.icon;
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={opt.title}
              type="button"
              className={`slash-menu-item${isSelected ? " selected" : ""}`}
              onClick={() => executeOption(opt)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div className="slash-menu-icon">
                <Icon size={16} />
              </div>
              <div className="slash-menu-content" style={{ flex: 1 }}>
                <span className="slash-menu-title">{opt.title}</span>
                <span className="slash-menu-desc">{opt.description}</span>
              </div>
              {opt.badge && (
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", padding: "2px 6px", background: "var(--bg-secondary)", borderRadius: "4px" }}>
                  {opt.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
