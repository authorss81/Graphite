/**
 * Graphite E2E Encryption — AES-256-GCM via Web Crypto API
 * Keys are derived from a user passphrase using PBKDF2 (SHA-256, 600k iterations).
 * Supabase / localStorage only ever receives the encrypted ciphertext.
 */

const PBKDF2_ITERATIONS = 600_000;
const KEY_STORAGE_KEY = "graphite_enc_salt_v1";
const LOCK_STORAGE_KEY = "graphite_enc_locked_docs_v1";
const STORAGE_VERSION_KEY = "graphite_enc_storage_version";
const CURRENT_ENC_VERSION = 1;

// ─── Utility: isomorphic base64 ──────────────────────────────────────────────

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bufToBase64(buf: ArrayBuffer): string {
  // Handle both ArrayBuffer and SharedArrayBuffer
  const bytes = new Uint8Array(buf);
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += BASE64_CHARS[b0 >> 2];
    result += BASE64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < bytes.length ? BASE64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    result += i + 2 < bytes.length ? BASE64_CHARS[b2 & 63] : "=";
  }
  return result;
}

export function base64ToBuf(b64: string): ArrayBuffer {
  const sanitized = b64.replace(/=+$/, "");
  const bytes: number[] = [];
  for (let i = 0; i < sanitized.length; i += 4) {
    const c0 = BASE64_CHARS.indexOf(sanitized[i]);
    const c1 = BASE64_CHARS.indexOf(sanitized[i + 1]);
    const c2 = i + 2 < sanitized.length ? BASE64_CHARS.indexOf(sanitized[i + 2]) : -1;
    const c3 = i + 3 < sanitized.length ? BASE64_CHARS.indexOf(sanitized[i + 3]) : -1;
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 !== -1) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    if (c3 !== -1) bytes.push(((c2 & 3) << 6) | c3);
  }
  return new Uint8Array(bytes).buffer;
}

// ─── Salt management ─────────────────────────────────────────────────────────

export function getOrCreateSalt(): Uint8Array {
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  if (stored) return new Uint8Array(base64ToBuf(stored));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(KEY_STORAGE_KEY, bufToBase64(salt.buffer));
  return salt;
}

// ─── Key derivation ──────────────────────────────────────────────────────────

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  // Ensure we have a plain ArrayBuffer (not SharedArrayBuffer) for Web Crypto
  const saltBuf = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ─── Encrypt ─────────────────────────────────────────────────────────────────

export async function encryptText(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  // Pack: [12-byte IV][ciphertext], base64-encoded
  const packed = new Uint8Array(12 + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), 12);
  return "enc:" + bufToBase64(packed.buffer);
}

// ─── Decrypt ─────────────────────────────────────────────────────────────────

export async function decryptText(payload: string, key: CryptoKey): Promise<string> {
  if (!payload.startsWith("enc:")) return payload; // not encrypted
  const packed = new Uint8Array(base64ToBuf(payload.slice(4)));
  const iv = packed.slice(0, 12);
  const ciphertext = packed.slice(12);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plainBuf);
}

export function isEncrypted(payload: string): boolean {
  return typeof payload === "string" && payload.startsWith("enc:");
}

// ─── Locked docs registry ────────────────────────────────────────────────────

export function getLockedDocs(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCK_STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function setDocLocked(docId: string, locked: boolean): void {
  const locked_set = getLockedDocs();
  if (locked) locked_set.add(docId);
  else locked_set.delete(docId);
  localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify([...locked_set]));
}

// ─── Recovery codes ──────────────────────────────────────────────────────────

const RECOVERY_STORAGE_KEY = "graphite_recovery_hash_v1";
const USED_RECOVERY_KEY = "graphite_used_recovery_v1";

function getUsedCodes(): Set<string> {
  try {
    const raw = localStorage.getItem(USED_RECOVERY_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markCodeUsed(code: string) {
  // Merge with existing set to avoid racy overwrite from other tabs
  const existing = getUsedCodes();
  existing.add(code);
  localStorage.setItem(USED_RECOVERY_KEY, JSON.stringify([...existing]));
}

export async function generateRecoveryCodes(): Promise<string[]> {
  const codes = Array.from({ length: 8 }, () =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
  const enc = new TextEncoder();
  const hashBuf = await crypto.subtle.digest("SHA-256", enc.encode(codes.join(",")));
  localStorage.setItem(RECOVERY_STORAGE_KEY, bufToBase64(hashBuf));
  localStorage.removeItem(USED_RECOVERY_KEY);
  return codes;
}

export async function verifyRecoveryCode(code: string, storedCodes: string[]): Promise<boolean> {
  const normalized = code.toUpperCase();
  if (getUsedCodes().has(normalized)) return false;
  const enc = new TextEncoder();
  const testHash = await crypto.subtle.digest("SHA-256", enc.encode(storedCodes.join(",")));
  const stored = localStorage.getItem(RECOVERY_STORAGE_KEY);
  const valid = stored === bufToBase64(testHash) && storedCodes.includes(normalized);
  if (valid) markCodeUsed(normalized);
  return valid;
}

export function hasEncryptionSetup(): boolean {
  return localStorage.getItem(KEY_STORAGE_KEY) !== null;
}

export function getStorageVersion(): number {
  try {
    const raw = localStorage.getItem(STORAGE_VERSION_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export function migrateStorageIfNeeded(): void {
  const version = getStorageVersion();
  if (version >= CURRENT_ENC_VERSION) return;
  localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_ENC_VERSION));
}

// ─── WebAuthn Hardware Key Support ───────────────────────────────────────────

const WEBAUTHN_KEY_STORAGE = "graphite_webauthn_credential_v1";
const WEBAUTHN_ENABLED_KEY = "graphite_webauthn_enabled_v1";

export interface WebAuthnCredential {
  id: string;
  rawId: string; // base64
  type: "public-key";
}

export function isWebAuthnAvailable(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined" && "credentials" in navigator;
}

export async function registerHardwareKey(): Promise<WebAuthnCredential | null> {
  if (!isWebAuthnAvailable()) return null;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Graphite Studio" },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: "graphite-user",
          displayName: "Graphite User",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "cross-platform",
          userVerification: "discouraged",
        },
        timeout: 60000,
      },
    });
    if (!credential) return null;
    const cred = {
      id: credential.id,
      rawId: bufToBase64(credential.rawId),
      type: credential.type as "public-key",
    };
    localStorage.setItem(WEBAUTHN_KEY_STORAGE, JSON.stringify(cred));
    return cred;
  } catch (err) {
    console.error("[WebAuthn] Registration failed:", err);
    return null;
  }
}

export async function verifyHardwareKey(): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  const stored = localStorage.getItem(WEBAUTHN_KEY_STORAGE);
  if (!stored) return false;
  try {
    const cred: WebAuthnCredential = JSON.parse(stored);
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{
          id: base64ToBuf(cred.rawId),
          type: "public-key",
          transports: ["usb", "nfc", "ble", "internal"],
        }],
        userVerification: "discouraged",
        timeout: 60000,
      },
    });
    return assertion !== null;
  } catch (err) {
    console.error("[WebAuthn] Verification failed:", err);
    return false;
  }
}

export function isHardwareKeyEnabled(): boolean {
  return localStorage.getItem(WEBAUTHN_ENABLED_KEY) === "true";
}

export function setHardwareKeyEnabled(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(WEBAUTHN_ENABLED_KEY, "true");
  } else {
    localStorage.removeItem(WEBAUTHN_ENABLED_KEY);
    localStorage.removeItem(WEBAUTHN_KEY_STORAGE);
  }
}

export function hasRegisteredHardwareKey(): boolean {
  return localStorage.getItem(WEBAUTHN_KEY_STORAGE) !== null;
}

export async function deriveKeyWithHardware(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  let keyMaterial = passphrase;

  if (isHardwareKeyEnabled()) {
    const stored = localStorage.getItem(WEBAUTHN_KEY_STORAGE);
    if (stored) {
      try {
        const cred: WebAuthnCredential = JSON.parse(stored);
        keyMaterial = passphrase + cred.id + cred.rawId;
      } catch {}
    }
  }

  const keyBytes = enc.encode(keyMaterial);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const saltBuf = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    cryptoKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
