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

let cachedPlugins: PluginManifest[] | null = null;

export function getPlugins(): PluginManifest[] {
  if (cachedPlugins) return cachedPlugins;
  try {
    const raw = localStorage.getItem(PLUGIN_STORAGE_KEY);
    if (!raw) {
      cachedPlugins = BUILTIN_MARKETPLACE_PLUGINS;
      return cachedPlugins;
    }
    const installedMap: Record<string, { isInstalled: boolean; isEnabled: boolean }> = JSON.parse(raw);

    cachedPlugins = BUILTIN_MARKETPLACE_PLUGINS.map((p) => {
      const state = installedMap[p.id];
      if (state) {
        return { ...p, isInstalled: state.isInstalled, isEnabled: state.isEnabled };
      }
      return p;
    });
    return cachedPlugins;
  } catch {
    cachedPlugins = BUILTIN_MARKETPLACE_PLUGINS;
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
}
