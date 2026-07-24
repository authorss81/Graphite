export type AIProvider = "openai" | "anthropic" | "ollama";

export interface AIConfig {
  provider: AIProvider;
  openaiKey: string;
  openaiModel: string;
  anthropicKey: string;
  anthropicModel: string;
  ollamaEndpoint: string;
  ollamaModel: string;
}

const STORAGE_KEY = "graphite_ai_config";

const DEFAULT_CONFIG: AIConfig = {
  provider: "ollama",
  openaiKey: "",
  openaiModel: "gpt-4o-mini",
  anthropicKey: "",
  anthropicModel: "claude-3-haiku-20240307",
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "llama3",
};

export function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function saveAIConfig(config: AIConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}
