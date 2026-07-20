import { useState, useEffect, useCallback, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { INSERT_CANVAS_COMMAND } from "./CanvasNode";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import { $isHeadingNode, $createHeadingNode } from "@lexical/rich-text";
import { $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListNode } from "@lexical/list";
import { $createQuoteNode } from "@lexical/rich-text";
import { $createCodeNode } from "@lexical/code";

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Undo2,
  Redo2,
  Shapes,
} from "lucide-react";

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`graphite-toolbar-btn${active ? " active" : ""}${disabled ? " disabled" : ""}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="graphite-toolbar-divider" />;
}

type BlockType = "p" | "h1" | "h2" | "h3" | "ul" | "ol" | "quote" | "code";

export function EditorToolbar() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>("p");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
      setIsStrikethrough(false);
      setBlockType("p");
      return;
    }

    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));
    setIsUnderline(selection.hasFormat("underline"));
    setIsStrikethrough(selection.hasFormat("strikethrough"));

    const anchorNode = selection.anchor.getNode();
    let element =
      anchorNode.getKey() === "root"
        ? anchorNode
        : $findMatchingParent(anchorNode, (e) => {
            const parent = e.getParent();
            return parent !== null && $isRootOrShadowRoot(parent);
          });

    if (element === null) {
      element = anchorNode.getTopLevelElementOrThrow();
    }

    if ($isHeadingNode(element)) {
      setBlockType(element.getTag() as "h1" | "h2" | "h3");
    } else if ($isListNode(element)) {
      setBlockType((element as ListNode).getListType() === "bullet" ? "ul" : "ol");
    } else {
      setBlockType("p");
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(SELECTION_CHANGE_COMMAND, () => {
        updateToolbar();
        return false;
      }, 1),
      editor.registerCommand(CAN_UNDO_COMMAND, (payload) => {
        setCanUndo(payload);
        return false;
      }, 1),
      editor.registerCommand(CAN_REDO_COMMAND, (payload) => {
        setCanRedo(payload);
        return false;
      }, 1),
    );
  }, [editor, updateToolbar]);

  const formatHeading = useCallback(
    (tag: "h1" | "h2" | "h3") => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        selection.insertNodes([$createHeadingNode(tag)]);
      });
    },
    [editor],
  );

  const insertQuote = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      selection.insertNodes([$createQuoteNode()]);
    });
  }, [editor]);

  const insertCodeBlock = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      selection.insertNodes([$createCodeNode()]);
    });
  }, [editor]);

  return (
    <div className="graphite-toolbar" ref={toolbarRef}>
      <ToolbarButton onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} disabled={!canUndo} title="Undo">
        <Undo2 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} disabled={!canRedo} title="Redo">
        <Redo2 size={16} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")} active={isBold} title="Bold Ctrl+B">
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")} active={isItalic} title="Italic Ctrl+I">
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")} active={isUnderline} title="Underline Ctrl+U">
        <Underline size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")} active={isStrikethrough} title="Strikethrough">
        <Strikethrough size={16} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton onClick={() => formatHeading("h1")} active={blockType === "h1"} title="Heading 1">
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatHeading("h2")} active={blockType === "h2"} title="Heading 2">
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => formatHeading("h3")} active={blockType === "h3"} title="Heading 3">
        <Heading3 size={16} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} active={blockType === "ul"} title="Bullet List">
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} active={blockType === "ol"} title="Ordered List">
        <ListOrdered size={16} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton onClick={() => editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://")} title="Insert Link">
        <Link size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={insertCodeBlock} title="Code Block">
        <Code size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={insertQuote} title="Blockquote">
        <Quote size={16} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton onClick={() => editor.dispatchCommand(INSERT_CANVAS_COMMAND, undefined)} title="Insert Drawing Canvas">
        <Shapes size={16} />
      </ToolbarButton>
    </div>
  );
}
