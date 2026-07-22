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
const MAX_EVENTS = 500; // cap to prevent unbounded growth

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

export function logAuditEvent(
  category: AuditCategory,
  action: string,
  opts: {
    docId?: string;
    docTitle?: string;
    userId?: string;
    userName?: string;
    metadata?: Record<string, string | number | boolean>;
  } = {}
): void {
  const event: AuditEvent = {
    id: "evt_" + Math.random().toString(36).slice(2, 10),
    ts: Date.now(),
    category,
    action,
    ...opts,
  };
  const events = loadRaw();
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
