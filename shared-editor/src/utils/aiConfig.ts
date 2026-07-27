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

// ─── Device-local key for encrypting API keys ────────────────────────────

const DEVICE_KEY_SEED_KEY = "graphite_device_key_seed";

async function getDeviceKey(): Promise<CryptoKey> {
  let seed = localStorage.getItem(DEVICE_KEY_SEED_KEY);
  if (!seed) {
    const randomSeed = crypto.getRandomValues(new Uint8Array(32));
    const b64 = btoa(String.fromCharCode(...randomSeed));
    seed = b64;
    try { localStorage.setItem(DEVICE_KEY_SEED_KEY, seed); } catch {}
  }
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(seed), "PBKDF2", false, ["deriveKey"]);
  const salt = enc.encode("ai-config-key-v1");
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptField(plaintext: string, key: CryptoKey): Promise<string> {
  if (!plaintext) return "";
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  const packed = new Uint8Array(12 + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), 12);
  const b64 = btoa(String.fromCharCode(...packed));
  return "enc:" + b64;
}

async function decryptField(payload: string, key: CryptoKey): Promise<string> {
  if (!payload || !payload.startsWith("enc:")) return payload;
  const raw = payload.slice(4);
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuf);
}

export async function encryptConfig(config: AIConfig): Promise<AIConfig> {
  const key = await getDeviceKey();
  return {
    ...config,
    openaiKey: await encryptField(config.openaiKey, key),
    anthropicKey: await encryptField(config.anthropicKey, key),
  };
}

export async function decryptConfig(config: AIConfig): Promise<AIConfig> {
  const key = await getDeviceKey();
  return {
    ...config,
    openaiKey: await decryptField(config.openaiKey, key),
    anthropicKey: await decryptField(config.anthropicKey, key),
  };
}

export async function loadAIConfig(): Promise<AIConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      return await decryptConfig(parsed);
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  try {
    const encrypted = await encryptConfig(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
  } catch {}
}
