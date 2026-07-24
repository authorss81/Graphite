import { useMemo, useCallback } from "react";
import { getActiveSandboxPlugins, registerPluginCommand, unregisterPluginCommands } from "../utils/pluginSystem";
import { PluginSandbox } from "./PluginSandbox";
import type { PluginDefinition } from "../utils/pluginAPI";
import { toast } from "./Toast";

export function PluginContainer() {
  const activePlugins = useMemo(() => getActiveSandboxPlugins(), []);

  const handleCommand = useCallback((pluginId: string, command: string, payload?: any) => {
    console.log(`[Plugin ${pluginId}] Command: ${command}`, payload);
  }, []);

  const handleInsertText = useCallback((pluginId: string, text: string) => {
    toast(`Plugin "${pluginId}" inserted text: ${text.slice(0, 50)}...`, "info");
  }, []);

  const handleOpenUrl = useCallback((pluginId: string, url: string) => {
    window.open(url, "_blank", "noopener");
  }, []);

  const pluginsAsDefs: PluginDefinition[] = useMemo(() => {
    return activePlugins.map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
      author: p.author,
      description: p.description,
      icon: p.icon,
      source: p.source || "",
    }));
  }, [activePlugins]);

  return (
    <>
      {pluginsAsDefs.map((def) => (
        <PluginSandbox
          key={def.id}
          plugin={def}
          onCommand={handleCommand}
          onInsertText={handleInsertText}
          onOpenUrl={handleOpenUrl}
        />
      ))}
    </>
  );
}
