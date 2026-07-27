/**
 * Graphite Audit Log — tamper-evident event trail stored in localStorage.
 * Each event has: timestamp, category, action, docId (optional), userId (optional), metadata.
 */

export type AuditCategory = "access" | "export" | "share" | "encryption" | "auth" | "workspace";

export interface AuditEvent {
  id: string;
  ts: number; // unix ms
  category: AuditCategory;
  action: string;
  docId?: string;
  docTitle?: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, string | number | boolean>;
}

const AUDIT_KEY = "graphite_audit_log_v1";
const HMAC_KEY_STORAGE = "graphite_audit_hmac_key";
const MAX_EVENTS = 500; // cap to prevent unbounded growth

// ─── Constant-time string comparison ─────────────────────────────────────
function timingSafeEqual(a: string, b: string): boolean {
  let result = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    result |= ca ^ cb;
  }
  return result === 0;
}

// ─── HMAC key from passphrase ────────────────────────────────────────────
export async function deriveAuditKey(passphrase: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(passphrase), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer, iterations: 600000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// HMAC chain initialization — generates a key once, stored separately
function getHmacKey(): string {
  let key = localStorage.getItem(HMAC_KEY_STORAGE);
  if (!key) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    key = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    try {
      localStorage.setItem(HMAC_KEY_STORAGE, key);
    } catch {}
  }
  return key;
}

async function computeHmac(data: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loadRaw(): AuditEvent[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRaw(events: AuditEvent[]): void {
  try {
    // Keep only the newest MAX_EVENTS
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed));
  } catch {
    // silently ignore quota issues for audit log
  }
}

// Verify HMAC chain integrity — returns true if chain is intact
export async function verifyAuditChain(): Promise<boolean> {
  const events = loadRaw();
  if (events.length === 0) return true;
  const key = getHmacKey();
  for (let i = 0; i < events.length; i++) {
    const expectedHmac = (events[i] as any).hmac;
    if (!expectedHmac) return false;
    const prevHmac = i === 0 ? "" : (events[i - 1] as any).hmac || "";
    const payload = prevHmac + JSON.stringify({ ...events[i], hmac: undefined });
    const actualHmac = await computeHmac(payload, key);
    if (!timingSafeEqual(expectedHmac, actualHmac)) return false;
  }
  return true;
}

export async function logAuditEvent(
  category: AuditCategory,
  action: string,
  opts: {
    docId?: string;
    docTitle?: string;
    userId?: string;
    userName?: string;
    metadata?: Record<string, string | number | boolean>;
  } = {}
): Promise<void> {
  const key = getHmacKey();
  const events = loadRaw();
  const prevHmac = events.length > 0 ? (events[events.length - 1] as any).hmac || "" : "";
  const event: any = {
    id: crypto.randomUUID().replace(/-/g, "").substring(0, 16),
    ts: Date.now(),
    category,
    action,
    ...opts,
  };
  const payload = prevHmac + JSON.stringify({ ...event, hmac: undefined });
  event.hmac = await computeHmac(payload, key);
  events.push(event);
  saveRaw(events);
}

export function getAuditLog(filter?: { category?: AuditCategory; docId?: string }): AuditEvent[] {
  let events = loadRaw();
  if (filter?.category) events = events.filter((e) => e.category === filter.category);
  if (filter?.docId) events = events.filter((e) => e.docId === filter.docId);
  return events.sort((a, b) => b.ts - a.ts); // newest first
}

export function clearAuditLog(): void {
  localStorage.removeItem(AUDIT_KEY);
}

export function exportAuditLogCSV(): string {
  const events = getAuditLog();
  const header = "ID,Timestamp,Category,Action,DocId,DocTitle,UserId,UserName";
  const escapeCsv = (str?: string) => {
    const val = str ?? "";
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  const rows = events.map((e) =>
    [
      e.id,
      new Date(e.ts).toISOString(),
      e.category,
      escapeCsv(e.action),
      e.docId ?? "",
      escapeCsv(e.docTitle),
      e.userId ?? "",
      escapeCsv(e.userName),
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

export function formatAuditTimestamp(ts: number): string {
  const d = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  return d.toLocaleString();
}
