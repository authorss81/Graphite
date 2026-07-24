export interface PluginSlashCommand {
  title: string;
  description: string;
  icon?: string;
  pluginId: string;
  action: () => void;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon: string;
  category: "utility" | "editor" | "theme" | "export";
  isInstalled: boolean;
  isEnabled: boolean;
  source?: string; // URL to plugin script for sandboxed execution
  hasSandbox?: boolean; // Whether this plugin runs in a sandboxed iframe
}

const PLUGIN_STORAGE_KEY = "graphite_installed_plugins_v1";

export const BUILTIN_MARKETPLACE_PLUGINS: PluginManifest[] = [
  {
    id: "word-counter-pro",
    name: "Live Reading Time & Word Stats",
    version: "1.4.0",
    author: "WriteStat Pro",
    description: "Displays live word count, character count, and estimated reading time status bar at the bottom of notes.",
    icon: "BarChart3",
    category: "utility",
    isInstalled: true,
    isEnabled: true,
  },
  {
    id: "pomodoro-timer",
    name: "Pomodoro Focus Timer Widget",
    version: "1.3.0",
    author: "Focus Craft",
    description: "Embeds a 25-minute Pomodoro focus timer widget in your editor toolbar for deep work sessions.",
    icon: "Clock",
    category: "utility",
    isInstalled: true,
    isEnabled: true,
  },
  {
    id: "solarized-theme",
    name: "Solarized Dark Accent Palette",
    version: "1.2.0",
    author: "ThemeCraft",
    description: "Switches application accent colors to Solarized Cyan & Deep Ocean palette.",
    icon: "Palette",
    category: "theme",
    isInstalled: false,
    isEnabled: false,
  },
  {
    id: "zen-focus-mode",
    name: "Zen Mode Distraction Free",
    version: "1.1.0",
    author: "Minimalist Studio",
    description: "Adds a Zen Focus mode toggle button to hide sidebars and toolbars for immersive writing.",
    icon: "Maximize",
    category: "editor",
    isInstalled: true,
    isEnabled: true,
  },
  {
    id: "auto-save-badge",
    name: "Live Auto-Save Status Badge",
    version: "1.0.8",
    author: "SyncLabs",
    description: "Shows a live pulsing 'Saved to Disk' badge in the header upon document modifications.",
    icon: "CheckCircle",
    category: "utility",
    isInstalled: true,
    isEnabled: true,
  },
];

// Community plugins that can be loaded into sandbox
export const COMMUNITY_PLUGINS: PluginManifest[] = [
  {
    id: "markdown-preview",
    name: "Live Markdown Preview",
    version: "1.0.0",
    author: "Community",
    description: "Adds a split-pane live Markdown preview toggle to the editor toolbar.",
    icon: "FileText",
    category: "editor",
    isInstalled: false,
    isEnabled: false,
    hasSandbox: true,
    source: "https://unpkg.com/graphite-plugin-markdown-preview@1.0.0/dist/plugin.js",
  },
  {
    id: "emoji-picker",
    name: "Emoji Picker",
    version: "1.0.0",
    author: "Community",
    description: "Adds an emoji picker slash command and toolbar button for quick emoji insertion.",
    icon: "Smile",
    category: "utility",
    isInstalled: false,
    isEnabled: false,
    hasSandbox: true,
    source: "https://unpkg.com/graphite-plugin-emoji-picker@1.0.0/dist/plugin.js",
  },
  {
    id: "table-generator",
    name: "Table Generator",
    version: "1.0.0",
    author: "Community",
    description: "Generates formatted markdown tables from CSV or natural language description.",
    icon: "Table",
    category: "utility",
    isInstalled: false,
    isEnabled: false,
    hasSandbox: true,
    source: "https://unpkg.com/graphite-plugin-table-generator@1.0.0/dist/plugin.js",
  },
];

let cachedPlugins: PluginManifest[] | null = null;
const pluginCommandRegistry = new Map<string, PluginSlashCommand[]>();

export function registerPluginCommand(pluginId: string, command: PluginSlashCommand): void {
  const existing = pluginCommandRegistry.get(pluginId) || [];
  existing.push(command);
  pluginCommandRegistry.set(pluginId, existing);
}

export function unregisterPluginCommands(pluginId: string): void {
  pluginCommandRegistry.delete(pluginId);
}

export function getPluginCommands(): PluginSlashCommand[] {
  const all: PluginSlashCommand[] = [];
  pluginCommandRegistry.forEach((commands) => {
    all.push(...commands);
  });
  return all;
}

export function getPlugins(): PluginManifest[] {
  if (cachedPlugins) return cachedPlugins;
  try {
    const raw = localStorage.getItem(PLUGIN_STORAGE_KEY);
    const allBuiltins = [...BUILTIN_MARKETPLACE_PLUGINS, ...COMMUNITY_PLUGINS];
    if (!raw) {
      cachedPlugins = allBuiltins;
      return cachedPlugins;
    }
    const installedMap: Record<string, { isInstalled: boolean; isEnabled: boolean }> = JSON.parse(raw);
    cachedPlugins = allBuiltins.map((p) => {
      const state = installedMap[p.id];
      if (state) {
        return { ...p, isInstalled: state.isInstalled, isEnabled: state.isEnabled };
      }
      return p;
    });
    return cachedPlugins;
  } catch {
    cachedPlugins = [...BUILTIN_MARKETPLACE_PLUGINS, ...COMMUNITY_PLUGINS];
    return cachedPlugins;
  }
}

export function savePlugins(plugins: PluginManifest[]): void {
  try {
    cachedPlugins = plugins;
    const stateMap: Record<string, { isInstalled: boolean; isEnabled: boolean }> = {};
    plugins.forEach((p) => {
      stateMap[p.id] = { isInstalled: p.isInstalled, isEnabled: p.isEnabled };
    });
    localStorage.setItem(PLUGIN_STORAGE_KEY, JSON.stringify(stateMap));
    applyPluginEffects(plugins);
  } catch {
    // fallback
  }
}

export function isPluginActive(pluginId: string): boolean {
  const plugins = getPlugins();
  const p = plugins.find((item) => item.id === pluginId);
  return Boolean(p?.isInstalled && p?.isEnabled);
}

export function getActiveSandboxPlugins(): PluginManifest[] {
  const plugins = getPlugins();
  return plugins.filter((p) => p.isInstalled && p.isEnabled && p.hasSandbox);
}

export function applyPluginEffects(pluginsList?: PluginManifest[]): void {
  const plugins = pluginsList || getPlugins();
  const solarized = plugins.find((p) => p.id === "solarized-theme");

  if (solarized?.isInstalled && solarized?.isEnabled) {
    document.documentElement.style.setProperty("--accent-color", "hsl(180, 80%, 45%)");
    document.documentElement.style.setProperty("--accent-color-glow", "hsla(180, 80%, 45%, 0.4)");
  } else {
    document.documentElement.style.removeProperty("--accent-color");
    document.documentElement.style.removeProperty("--accent-color-glow");
  }

  const zen = plugins.find((p) => p.id === "zen-focus-mode");
  if (zen?.isInstalled && zen?.isEnabled) {
    document.documentElement.setAttribute("data-zen-mode", "true");
  } else {
    document.documentElement.removeAttribute("data-zen-mode");
  }
}
