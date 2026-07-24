export type PluginHookType = "onActivate" | "onDeactivate" | "onEditorChange" | "onSave" | "onDocOpen";

export interface PluginSlashCommand {
  title: string;
  description: string;
  icon?: string;
  action: "insert-text" | "open-url" | "custom";
  payload?: string;
}

export interface PluginToolbarItem {
  id: string;
  label: string;
  icon?: string;
  section: "left" | "center" | "right";
  action: "dispatch-command" | "open-url" | "custom";
  payload?: string;
}

export interface PluginBlockRenderer {
  type: string;
  render: string; // URL to HTML template
}

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon: string;
  source: string; // URL to plugin script
  hooks?: Partial<Record<PluginHookType, string>>; // Function names to call
  slashCommands?: PluginSlashCommand[];
  toolbarItems?: PluginToolbarItem[];
  blockRenderers?: PluginBlockRenderer[];
}

export interface PluginMessage {
  type: "plugin:register" | "plugin:log" | "plugin:error" | "plugin:command" | "plugin:insert-text" | "plugin:open-url" | "plugin:get-state";
  pluginId: string;
  payload?: any;
}

export interface HostMessage {
  type: "host:state-change" | "host:config" | "host:execute" | "host:command-result";
  payload?: any;
}

export function createPluginSandboxHTML(plugin: PluginDefinition): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base href="${location.origin}/">
<style>
  body { margin: 0; padding: 8px; font-family: system-ui, sans-serif; font-size: 13px; color: #e0e0e0; background: transparent; }
  .plugin-error { color: #ef4444; padding: 8px; }
  .plugin-info { color: #6b7280; padding: 8px; }
</style>
</head>
<body>
<script>
  // Sandboxed Plugin API - exposed via postMessage to parent
  const pluginAPI = {
    id: ${JSON.stringify(plugin.id)},

    log: function(msg) {
      parent.postMessage({ type: 'plugin:log', pluginId: this.id, payload: msg }, '*');
    },

    error: function(msg) {
      parent.postMessage({ type: 'plugin:error', pluginId: this.id, payload: msg }, '*');
    },

    insertText: function(text) {
      parent.postMessage({ type: 'plugin:insert-text', pluginId: this.id, payload: text }, '*');
    },

    openUrl: function(url) {
      parent.postMessage({ type: 'plugin:open-url', pluginId: this.id, payload: url }, '*');
    },

    getState: function() {
      return new Promise(function(resolve) {
        var channel = 'plugin:state:' + Date.now() + Math.random();
        var handler = function(e) {
          if (e.data.type === 'host:command-result' && e.data._channel === channel) {
            window.removeEventListener('message', handler);
            resolve(e.data.payload);
          }
        };
        window.addEventListener('message', handler);
        parent.postMessage({ type: 'plugin:get-state', pluginId: this.id, _channel: channel }, '*');
      }.bind(this));
    },

    onHostMessage: function(handler) {
      window.addEventListener('message', function(e) {
        if (e.data.type && e.data.type.startsWith('host:')) {
          handler(e.data);
        }
      });
    }
  };

  // Make pluginAPI globally available
  window.pluginAPI = pluginAPI;

  // Load plugin source code
  var script = document.createElement('script');
  script.src = ${JSON.stringify(plugin.source)};
  script.onerror = function() {
    document.body.innerHTML = '<div class="plugin-error">Failed to load plugin: ' + ${JSON.stringify(plugin.name)} + '</div>';
    pluginAPI.error('Failed to load plugin script: ' + ${JSON.stringify(plugin.source)});
  };
  document.body.appendChild(script);
<\/script>
</body>
</html>`;
}

export function isPluginAPIAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.postMessage === "function";
}
