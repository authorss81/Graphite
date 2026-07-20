import { Suspense, lazy, useCallback, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey } from "lexical";
import { $isCanvasNode, type CanvasData } from "./CanvasNode";

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
);

interface Props {
  nodeKey: string;
  data: CanvasData;
}

export function ExcalidrawCanvasComponent({ nodeKey, data }: Props) {
  const [editor] = useLexicalComposerContext();
  const [initialData] = useState<CanvasData>(data);
  const saveTimer = useCallback(() => {
    let handle: ReturnType<typeof setTimeout> | undefined;
    return {
      schedule(cb: () => void) {
        if (handle) clearTimeout(handle);
        handle = setTimeout(cb, 500);
      },
    };
  }, []);
  const timer = saveTimer();

  const onChange = useCallback(
    (elements: any, appState: any, files: any) => {
      timer.schedule(() => {
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isCanvasNode(node)) {
            node.setData({ elements, appState, files });
          }
        });
      });
    },
    [editor, nodeKey, timer],
  );

  return (
    <div
      className="graphite-canvas-block"
      style={{
        height: 400,
        margin: "12px 0",
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--bg-secondary)",
      }}
    >
      <Suspense
        fallback={
          <div className="graphite-canvas-block-loading">Loading canvas…</div>
        }
      >
        <Excalidraw initialData={initialData} onChange={onChange} />
      </Suspense>
    </div>
  );
}
