import { useEffect, useRef, useCallback } from "react";
import { createPluginSandboxHTML, type PluginDefinition, type PluginMessage } from "../utils/pluginAPI";

interface PluginSandboxProps {
  plugin: PluginDefinition;
  onCommand?: (pluginId: string, command: string, payload?: any) => void;
  onInsertText?: (pluginId: string, text: string) => void;
  onOpenUrl?: (pluginId: string, url: string) => void;
  visible?: boolean;
}

export function PluginSandbox({ plugin, onCommand, onInsertText, onOpenUrl, visible = true }: PluginSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleMessage = useCallback((event: MessageEvent<PluginMessage>) => {
    // Only accept messages from the sandbox iframe (origin is null for sandboxed iframes without allow-same-origin)
    const iframeWin = iframeRef.current?.contentWindow;
    if (event.source !== iframeWin) return;
    if (event.origin !== null) return;

    const msg = event.data;
    if (!msg || !msg.type || msg.pluginId !== plugin.id) return;

    switch (msg.type) {
      case "plugin:log":
        console.log(`[Plugin ${plugin.id}]`, msg.payload);
        break;
      case "plugin:error":
        console.error(`[Plugin ${plugin.id}]`, msg.payload);
        break;
      case "plugin:insert-text":
        onInsertText?.(plugin.id, msg.payload || "");
        break;
      case "plugin:open-url":
        onOpenUrl?.(plugin.id, msg.payload || "");
        break;
      case "plugin:get-state":
        if (iframeWin) {
          iframeWin.postMessage({
            type: "host:command-result",
            _channel: (msg as any)._channel,
            payload: { online: navigator.onLine, language: navigator.language },
          }, event.origin);
        }
        break;
      case "plugin:command":
        onCommand?.(plugin.id, msg.payload?.command, msg.payload?.data);
        break;
    }
  }, [plugin.id, onCommand, onInsertText, onOpenUrl]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const html = createPluginSandboxHTML(plugin);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  if (!visible) return null;

  return (
    <iframe
      ref={iframeRef}
      src={url}
      // Minimal sandbox: allow-scripts only. Do NOT add allow-same-origin (defeats sandbox).
      // Do NOT add allow-popups, allow-forms, or allow-top-navigation — these would let
      // untrusted plugin code escape the sandbox or phish the user.
      sandbox="allow-scripts"
      style={{
        width: "100%",
        height: "0",
        border: "none",
        overflow: "hidden",
        display: "none",
      }}
      title={`Plugin: ${plugin.name}`}
    />
  );
}
