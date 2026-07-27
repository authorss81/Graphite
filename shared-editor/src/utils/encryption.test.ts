import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  bufToBase64, base64ToBuf,
  getOrCreateSalt, deriveKey, encryptText, decryptText, isEncrypted,
  getLockedDocs, setDocLocked,
  generateRecoveryCodes, verifyRecoveryCode,
  hasEncryptionSetup, getStorageVersion, migrateStorageIfNeeded,
  isWebAuthnAvailable, registerHardwareKey, verifyHardwareKey,
  isHardwareKeyEnabled, setHardwareKeyEnabled, hasRegisteredHardwareKey,
  deriveKeyWithHardware,
} from "./encryption";

beforeEach(() => {
  localStorage.clear();
});

describe("bufToBase64 / base64ToBuf", () => {
  it("round-trips a simple buffer", () => {
    const input = new TextEncoder().encode("hello world").buffer;
    const b64 = bufToBase64(input);
    const out = base64ToBuf(b64);
    expect(new TextDecoder().decode(out)).toBe("hello world");
  });

  it("round-trips empty buffer", () => {
    const b64 = bufToBase64(new ArrayBuffer(0));
    expect(b64).toBe("");
    const out = base64ToBuf(b64);
    expect(out.byteLength).toBe(0);
  });

  it("round-trips binary with all byte values", () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    const b64 = bufToBase64(bytes.buffer);
    const out = new Uint8Array(base64ToBuf(b64));
    expect(out.length).toBe(256);
    for (let i = 0; i < 256; i++) expect(out[i]).toBe(i);
  });

  it("handles padding correctly for non-multiple-of-3 lengths", () => {
    for (const len of [1, 2, 3, 4, 5, 7, 10, 15, 16]) {
      const buf = new Uint8Array(len).fill(0x42).buffer;
      const b64 = bufToBase64(buf);
      const out = base64ToBuf(b64);
      expect(out.byteLength).toBe(len);
    }
  });
});

describe("salt management", () => {
  it("creates a salt on first call", () => {
    const salt = getOrCreateSalt();
    expect(salt.length).toBe(16);
    expect(localStorage.getItem("graphite_enc_salt_v1")).toBeTruthy();
  });

  it("returns the same salt on subsequent calls", () => {
    const a = getOrCreateSalt();
    const b = getOrCreateSalt();
    expect(a).toEqual(b);
  });
});

describe("key derivation", () => {
  it("derives a CryptoKey from passphrase + salt", async () => {
    const salt = getOrCreateSalt();
    const key = await deriveKey("test-passphrase", salt);
    expect(key).toBeTruthy();
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");
  });

  it("derives different keys for different passphrases", async () => {
    const salt = getOrCreateSalt();
    const k1 = await deriveKey("pass-1", salt);
    const k2 = await deriveKey("pass-2", salt);
    const c1 = await encryptText("test", k1);
    await expect(decryptText(c1, k2)).rejects.toThrow();
  });
});

describe("encrypt / decrypt", () => {
  it("encrypts and decrypts a message", async () => {
    const salt = getOrCreateSalt();
    const key = await deriveKey("test-pass", salt);
    const cipher = await encryptText("Hello, world!", key);
    expect(cipher.startsWith("enc:")).toBe(true);
    const plain = await decryptText(cipher, key);
    expect(plain).toBe("Hello, world!");
  });

  it("produces different ciphertexts each time (IV randomization)", async () => {
    const salt = getOrCreateSalt();
    const key = await deriveKey("test-pass", salt);
    const c1 = await encryptText("same data", key);
    const c2 = await encryptText("same data", key);
    expect(c1).not.toBe(c2);
  });

  it("decrypt returns plaintext unchanged if not encrypted", async () => {
    const salt = getOrCreateSalt();
    const key = await deriveKey("test-pass", salt);
    const result = await decryptText("not encrypted", key);
    expect(result).toBe("not encrypted");
  });

  it("fails decryption with wrong key", async () => {
    const salt = getOrCreateSalt();
    const key1 = await deriveKey("correct-key", salt);
    const key2 = await deriveKey("wrong-key", salt);
    const cipher = await encryptText("secret message", key1);
    await expect(decryptText(cipher, key2)).rejects.toThrow();
  });

  it("handles empty string", async () => {
    const salt = getOrCreateSalt();
    const key = await deriveKey("test-pass", salt);
    const cipher = await encryptText("", key);
    const plain = await decryptText(cipher, key);
    expect(plain).toBe("");
  });

  it("handles Unicode characters (emoji, CJK)", async () => {
    const salt = getOrCreateSalt();
    const key = await deriveKey("test-pass", salt);
    const msg = "Hello 世界! 🎉🌟測試";
    const cipher = await encryptText(msg, key);
    const plain = await decryptText(cipher, key);
    expect(plain).toBe(msg);
  });

  it("handles large payload (100KB)", async () => {
    const salt = getOrCreateSalt();
    const key = await deriveKey("test-pass", salt);
    const msg = "x".repeat(100_000);
    const cipher = await encryptText(msg, key);
    const plain = await decryptText(cipher, key);
    expect(plain).toBe(msg);
  });
});

describe("isEncrypted", () => {
  it("detects encrypted payloads", () => {
    expect(isEncrypted("enc:abc123")).toBe(true);
    expect(isEncrypted("plain text")).toBe(false);
    expect(isEncrypted("")).toBe(false);
  });
});

describe("locked docs registry", () => {
  it("starts empty", () => {
    expect([...getLockedDocs()]).toEqual([]);
  });

  it("tracks locked documents", () => {
    setDocLocked("doc-1", true);
    expect(getLockedDocs().has("doc-1")).toBe(true);
    setDocLocked("doc-1", false);
    expect(getLockedDocs().has("doc-1")).toBe(false);
  });

  it("supports multiple locked docs", () => {
    setDocLocked("a", true);
    setDocLocked("b", true);
    const locked = getLockedDocs();
    expect(locked.has("a")).toBe(true);
    expect(locked.has("b")).toBe(true);
    expect(locked.size).toBe(2);
  });
});

describe("recovery codes", () => {
  it("generates 8 codes", async () => {
    const codes = await generateRecoveryCodes();
    expect(codes.length).toBe(8);
    codes.forEach((c) => expect(c.length).toBeGreaterThanOrEqual(6));
  });

  it("verifies a valid code", async () => {
    const codes = await generateRecoveryCodes();
    const valid = await verifyRecoveryCode(codes[0]);
    expect(valid).toBe(true);
  });

  it("rejects replayed code", async () => {
    const codes = await generateRecoveryCodes();
    await verifyRecoveryCode(codes[0]);
    const replayed = await verifyRecoveryCode(codes[0]);
    expect(replayed).toBe(false);
  });

  it("allows replay after localStorage.clear (used-codes reset)", async () => {
    const codes = await generateRecoveryCodes();
    const hash = localStorage.getItem("graphite_recovery_hash_v1");
    await verifyRecoveryCode(codes[0]);
    localStorage.clear();
    localStorage.setItem("graphite_recovery_hash_v1", hash!);
    const afterReset = await verifyRecoveryCode(codes[0]);
    expect(afterReset).toBe(true);
  });
});

describe("WebAuthn hardware key", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("isWebAuthnAvailable returns false when credentials API is absent", () => {
    expect(isWebAuthnAvailable()).toBe(false);
  });

  it("isWebAuthnAvailable returns true when credentials API is present", () => {
    Object.defineProperty(navigator, "credentials", {
      value: { create: vi.fn(), get: vi.fn() },
      configurable: true,
    });
    expect(isWebAuthnAvailable()).toBe(true);
    delete (navigator as any).credentials;
  });

  it("registerHardwareKey returns null when credentials API is absent", async () => {
    const result = await registerHardwareKey();
    expect(result).toBeNull();
  });

  it("registerHardwareKey returns credential when API succeeds", async () => {
    const mockCredential = { id: "cred-1", rawId: new Uint8Array([1, 2, 3]).buffer, type: "public-key" };
    Object.defineProperty(navigator, "credentials", {
      value: { create: vi.fn().mockResolvedValue(mockCredential), get: vi.fn() },
      configurable: true,
    });
    const result = await registerHardwareKey();
    expect(result).not.toBeNull();
    expect(result!.id).toBe("cred-1");
    delete (navigator as any).credentials;
  });

  it("verifyHardwareKey returns false when credentials API is absent", async () => {
    expect(await verifyHardwareKey()).toBe(false);
  });

  it("verifyHardwareKey returns false when no credential stored", async () => {
    Object.defineProperty(navigator, "credentials", {
      value: { create: vi.fn(), get: vi.fn() },
      configurable: true,
    });
    expect(await verifyHardwareKey()).toBe(false);
    delete (navigator as any).credentials;
  });

  it("isHardwareKeyEnabled returns false by default", () => {
    expect(isHardwareKeyEnabled()).toBe(false);
  });

  it("setHardwareKeyEnabled stores the enabled flag", () => {
    setHardwareKeyEnabled(true);
    expect(isHardwareKeyEnabled()).toBe(true);
    setHardwareKeyEnabled(false);
    expect(isHardwareKeyEnabled()).toBe(false);
  });

  it("hasRegisteredHardwareKey returns false when no credential stored", () => {
    expect(hasRegisteredHardwareKey()).toBe(false);
  });

  it("hasRegisteredHardwareKey returns true after registerHardwareKey", async () => {
    const mockCredential = { id: "cred-2", rawId: new Uint8Array([4, 5, 6]).buffer, type: "public-key" };
    Object.defineProperty(navigator, "credentials", {
      value: { create: vi.fn().mockResolvedValue(mockCredential), get: vi.fn() },
      configurable: true,
    });
    await registerHardwareKey();
    expect(hasRegisteredHardwareKey()).toBe(true);
    delete (navigator as any).credentials;
  });

  it("deriveKeyWithHardware falls back to passphrase when hardware disabled", async () => {
    const salt = getOrCreateSalt();
    const key = await deriveKeyWithHardware("test-pass", salt);
    expect(key).toBeTruthy();
  });

  it("deriveKeyWithHardware warns when hardware enabled but no credential", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    setHardwareKeyEnabled(true);
    const salt = getOrCreateSalt();
    const key = await deriveKeyWithHardware("test-pass", salt);
    expect(key).toBeTruthy();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    setHardwareKeyEnabled(false);
  });
});

describe("storage version", () => {
  it("returns 0 when not set", () => {
    expect(getStorageVersion()).toBe(0);
  });

  it("migrates storage version", () => {
    migrateStorageIfNeeded();
    expect(getStorageVersion()).toBe(1);
  });

  it("has encryption setup after salt created", () => {
    expect(hasEncryptionSetup()).toBe(false);
    getOrCreateSalt();
    expect(hasEncryptionSetup()).toBe(true);
  });
});
