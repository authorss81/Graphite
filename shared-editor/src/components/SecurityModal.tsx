import { useState, useEffect, useCallback } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { X, Shield, Lock, Unlock, Key, Eye, EyeOff, Download, Trash2, CheckCircle, AlertTriangle, FileText, RefreshCw } from "lucide-react";
import {
  deriveKey,
  getOrCreateSalt,
  encryptText,
  decryptText,
  isEncrypted,
  setDocLocked,
  generateRecoveryCodes,
  verifyRecoveryCode,
  hasEncryptionSetup,
} from "../utils/encryption";
import {
  getAuditLog,
  clearAuditLog,
  exportAuditLogCSV,
  formatAuditTimestamp,
  logAuditEvent,
} from "../utils/auditLog";
import type { AuditCategory } from "../utils/auditLog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentDocId: string;
  currentDocTitle: string;
  currentDocContent: string;
  onEncryptDoc: (encryptedContent: string) => void;
  onDecryptDoc: (decryptedContent: string) => void;
}

const CATEGORY_COLORS: Record<AuditCategory, string> = {
  access: "#6366f1",
  export: "#f59e0b",
  share: "#3b82f6",
  encryption: "#10b981",
  auth: "#ec4899",
  workspace: "#8b5cf6",
};

const CATEGORY_ICONS: Record<AuditCategory, string> = {
  access: "👁️",
  export: "📤",
  share: "🔗",
  encryption: "🔐",
  auth: "🔑",
  workspace: "👥",
};

export function SecurityModal({
  isOpen,
  onClose,
  currentDocId,
  currentDocTitle,
  currentDocContent,
  onEncryptDoc,
  onDecryptDoc,
}: Props) {
  const [tab, setTab] = useState<"encryption" | "audit">("encryption");

  // Encryption state
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);


  // Audit state
  const [auditLog, setAuditLog] = useState(getAuditLog());
  const [auditFilter, setAuditFilter] = useState<AuditCategory | "all">("all");

  const isDocEncrypted = isEncrypted(currentDocContent);

  useEffect(() => {
    if (isOpen) {
      setAuditLog(getAuditLog());
      setError("");
      setSuccess("");
    }
  }, [isOpen]);

  const handleSetupEncryption = useCallback(async () => {
    if (passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters.");
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError("Passphrases do not match.");
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      const salt = getOrCreateSalt();
      const key = await deriveKey(passphrase, salt);
      setCryptoKey(key);
      const codes = await generateRecoveryCodes();
      setRecoveryCodes(codes);
      setShowRecovery(true);
      setIsSetupMode(false);
      setRecoveryCodeInput("");
      setSuccess("Encryption key created! Save your recovery codes.");
      logAuditEvent("encryption", "Encryption passphrase configured", { userId: "local" });
    } catch {
      setError("Failed to set up encryption. Your browser may not support Web Crypto.");
    }
    setIsProcessing(false);
  }, [passphrase, confirmPassphrase]);

  const handleUnlock = useCallback(async () => {
    if (!unlockPassphrase) return;
    setIsProcessing(true);
    setError("");
    try {
      const salt = getOrCreateSalt();
      const key = await deriveKey(unlockPassphrase, salt);
      const liveDoc = useNoteStore.getState().documents[currentDocId];
      const liveContent = liveDoc?.editorState || currentDocContent;
      if (!isEncrypted(liveContent)) {
        setError("Document is not encrypted. Nothing to unlock.");
        setIsProcessing(false);
        return;
      }
      const plaintext = await decryptText(liveContent, key);
      onDecryptDoc(plaintext);
      setCryptoKey(key);
      setUnlockPassphrase("");
      setSuccess("Unlocked successfully.");
      logAuditEvent("encryption", "Document decrypted", { docId: currentDocId, docTitle: currentDocTitle });
    } catch {
      setError("Wrong passphrase or corrupted data.");
    }
    setIsProcessing(false);
  }, [unlockPassphrase, currentDocContent, currentDocId, currentDocTitle, onDecryptDoc]);

  const handleRecoveryUnlock = useCallback(async () => {
    if (!recoveryCodeInput.trim()) return;
    setIsProcessing(true);
    setError("");
    try {
      // Recovery codes were stored during setup; verify the entered code
      // relies on in-memory recoveryCodes array (still populated from setup)
      const valid = await verifyRecoveryCode(recoveryCodeInput.trim(), recoveryCodes);
      if (!valid) {
        setError("Invalid or already-used recovery code.");
        setIsProcessing(false);
        return;
      }
      // Recovery code verified — derive key and unlock
      const salt = getOrCreateSalt();
      const key = await deriveKey(recoveryCodeInput.trim(), salt);
      const liveDoc = useNoteStore.getState().documents[currentDocId];
      const liveContent = liveDoc?.editorState || currentDocContent;
      if (isEncrypted(liveContent)) {
        const plaintext = await decryptText(liveContent, key);
        onDecryptDoc(plaintext);
      }
      setCryptoKey(key);
      setRecoveryCodeInput("");
      setSuccess("Recovery code accepted. Document unlocked.");
      logAuditEvent("encryption", "Document unlocked via recovery code", { docId: currentDocId });
    } catch {
      setError("Recovery unlock failed.");
    }
    setIsProcessing(false);
  }, [recoveryCodeInput, recoveryCodes, currentDocContent, currentDocId, onDecryptDoc]);

  const handleEncryptDoc = useCallback(async () => {
    if (!cryptoKey) { setError("Set up or unlock encryption first."); return; }
    const liveDoc = useNoteStore.getState().documents[currentDocId];
    const liveContent = liveDoc?.editorState || currentDocContent;
    if (isEncrypted(liveContent)) { setError("Document is already encrypted."); return; }
    setIsProcessing(true);
    setError("");
    try {
      const encrypted = await encryptText(liveContent, cryptoKey);
      onEncryptDoc(encrypted);
      setDocLocked(currentDocId, true);
      setSuccess("Document encrypted with AES-256-GCM.");
      logAuditEvent("encryption", "Document encrypted", { docId: currentDocId, docTitle: currentDocTitle });
    } catch {
      setError("Encryption failed.");
    }
    setIsProcessing(false);
  }, [cryptoKey, currentDocContent, currentDocId, currentDocTitle, onEncryptDoc]);

  const handleDownloadAuditCSV = () => {
    const csv = exportAuditLogCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `graphite-audit-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logAuditEvent("export", "Audit log exported as CSV");
  };

  const filteredLog = auditFilter === "all"
    ? auditLog
    : auditLog.filter((e) => e.category === auditFilter);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "min(800px, 98vw)",
          height: "min(660px, 95vh)",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 0", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Shield size={18} color="#fff" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Security & Privacy
                </h2>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
                  E2E encryption, key management & audit trail
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "6px", borderRadius: "8px" }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: "flex", gap: "0" }}>
            {(["encryption", "audit"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: tab === t ? "2px solid #10b981" : "2px solid transparent",
                  color: tab === t ? "#10b981" : "var(--text-muted)",
                  fontWeight: tab === t ? 600 : 400,
                  fontSize: "13px",
                  padding: "8px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  textTransform: "capitalize",
                }}
              >
                {t === "encryption" ? <Lock size={14} /> : <FileText size={14} />}
                {t === "encryption" ? "Encryption & Keys" : "Audit Log"}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── Encryption Tab ── */}
          {tab === "encryption" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Status banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 16px",
                  background: cryptoKey
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(99, 102, 241, 0.08)",
                  border: `1px solid ${cryptoKey ? "rgba(16, 185, 129, 0.3)" : "rgba(99, 102, 241, 0.2)"}`,
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: cryptoKey ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {cryptoKey ? <Unlock size={18} color="#10b981" /> : <Lock size={18} color="#6366f1" />}
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {cryptoKey ? "Encryption Active — Key Loaded" : "Encryption Locked"}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {cryptoKey
                      ? "AES-256-GCM · PBKDF2 key derivation (600k iterations)"
                      : hasEncryptionSetup()
                      ? "Enter your passphrase to unlock encrypted documents"
                      : "Set up a passphrase to enable client-side encryption"}
                  </div>
                </div>
                <div style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 600 }}>
                  {isDocEncrypted ? (
                    <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Lock size={12} /> Encrypted
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Unlock size={12} /> Plain text
                    </span>
                  )}
                </div>
              </div>

              {/* Feedback messages */}
              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f87171", fontSize: "13px", padding: "10px 14px", background: "rgba(239,68,68,0.1)", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
              {success && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontSize: "13px", padding: "10px 14px", background: "rgba(16,185,129,0.1)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <CheckCircle size={14} /> {success}
                </div>
              )}

              {/* Setup form */}
              {(!hasEncryptionSetup() || isSetupMode) && !cryptoKey && (
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Set Up Encryption Passphrase
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Your passphrase never leaves your device. Use a strong, memorable phrase (min. 8 chars).
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Enter strong passphrase..."
                      value={passphrase}
                      onChange={(e) => { setPassphrase(e.target.value); setError(""); }}
                      style={{
                        width: "100%",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "9px 40px 9px 12px",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((p) => !p)}
                      style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Confirm passphrase..."
                    value={confirmPassphrase}
                    onChange={(e) => { setConfirmPassphrase(e.target.value); setError(""); }}
                    style={{
                      width: "100%",
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "9px 12px",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={handleSetupEncryption}
                    disabled={isProcessing}
                    style={{
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "9px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      opacity: isProcessing ? 0.7 : 1,
                    }}
                  >
                    {isProcessing ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Key size={14} />}
                    {isProcessing ? "Deriving Key..." : "Create Encryption Key"}
                  </button>
                </div>
              )}

              {/* Unlock form */}
              {hasEncryptionSetup() && !cryptoKey && !isSetupMode && (
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Unlock Encryption
                  </div>

                  {useRecoveryCode ? (
                    <input
                      type="text"
                      placeholder="Enter recovery code..."
                      value={recoveryCodeInput}
                      onChange={(e) => { setRecoveryCodeInput(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleRecoveryUnlock()}
                      style={{
                        width: "100%",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "9px 12px",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        fontFamily: "monospace",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPass ? "text" : "password"}
                        placeholder="Enter your passphrase..."
                        value={unlockPassphrase}
                        onChange={(e) => { setUnlockPassphrase(e.target.value); setError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                        style={{
                          width: "100%",
                          background: "var(--bg-tertiary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px",
                          padding: "9px 40px 9px 12px",
                          color: "var(--text-primary)",
                          fontSize: "13px",
                          boxSizing: "border-box",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((p) => !p)}
                        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={useRecoveryCode ? handleRecoveryUnlock : handleUnlock}
                      disabled={isProcessing}
                      style={{
                        flex: 1,
                        background: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "9px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        opacity: isProcessing ? 0.7 : 1,
                      }}
                    >
                      {isProcessing ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Unlock size={14} />}
                      {isProcessing ? "Deriving Key..." : "Unlock"}
                    </button>
                    <button
                      onClick={() => {
                        setUseRecoveryCode((p) => !p);
                        setError("");
                      }}
                      style={{
                        background: "transparent",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "9px 14px",
                        fontSize: "12px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {useRecoveryCode ? "Use Passphrase" : "Use Code"}
                    </button>
                    <button
                      onClick={() => setIsSetupMode(true)}
                      style={{
                        background: "transparent",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "9px 14px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Reset Key
                    </button>
                  </div>
                </div>
              )}

              {/* Recovery codes */}
              {showRecovery && recoveryCodes.length > 0 && (
                <div
                  style={{
                    background: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: "10px",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#f59e0b", marginBottom: "8px" }}>
                    <Key size={15} /> Save Your Recovery Codes
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                    Store these securely. Each code can be used once if you forget your passphrase.
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "6px",
                      marginBottom: "12px",
                    }}
                  >
                    {recoveryCodes.map((code, i) => (
                      <div
                        key={i}
                        style={{
                          background: "var(--bg-tertiary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "6px",
                          padding: "6px 8px",
                          fontFamily: "monospace",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          textAlign: "center",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowRecovery(false)}
                    style={{
                      width: "100%",
                      background: "#f59e0b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    I've saved my recovery codes
                  </button>
                </div>
              )}

              {/* Encrypt current doc */}
              {cryptoKey && (
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Current Document: "{currentDocTitle}"
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={handleEncryptDoc}
                      disabled={isDocEncrypted || isProcessing}
                      style={{
                        flex: 1,
                        background: isDocEncrypted ? "var(--bg-tertiary)" : "#10b981",
                        color: isDocEncrypted ? "var(--text-muted)" : "#fff",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "9px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: isDocEncrypted ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <Lock size={14} />
                      {isDocEncrypted ? "Already Encrypted" : "Encrypt This Document"}
                    </button>
                    {isDocEncrypted && (
                      <button
                        onClick={async () => {
                          if (!cryptoKey) return;
                          setIsProcessing(true);
                          try {
                            const decrypted = await decryptText(currentDocContent, cryptoKey);
                            onDecryptDoc(decrypted);
                            setDocLocked(currentDocId, false);
                            setSuccess("Document decrypted.");
                            logAuditEvent("encryption", "Document decrypted", { docId: currentDocId, docTitle: currentDocTitle });
                          } catch {
                            setError("Decryption failed — wrong key?");
                          }
                          setIsProcessing(false);
                        }}
                        style={{
                          flex: 1,
                          background: "rgba(99,102,241,0.1)",
                          color: "#6366f1",
                          border: "1px solid rgba(99,102,241,0.3)",
                          borderRadius: "8px",
                          padding: "9px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <Unlock size={14} /> Decrypt Document
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    🔐 AES-256-GCM · Encryption happens entirely in your browser. Server never sees plaintext.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Audit Log Tab ── */}
          {tab === "audit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {(["all", "access", "export", "share", "encryption", "auth", "workspace"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setAuditFilter(cat)}
                      style={{
                        background: auditFilter === cat ? (cat === "all" ? "var(--accent-color)" : CATEGORY_COLORS[cat as AuditCategory]) : "var(--bg-secondary)",
                        color: auditFilter === cat ? "#fff" : "var(--text-muted)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {cat !== "all" && CATEGORY_ICONS[cat as AuditCategory]} {cat}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={handleDownloadAuditCSV}
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Download size={12} /> Export CSV
                  </button>
                  <button
                    onClick={() => { clearAuditLog(); setAuditLog([]); }}
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                </div>
              </div>

              {filteredLog.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "14px" }}>
                  <FileText size={40} strokeWidth={1.2} style={{ marginBottom: "8px", display: "block", margin: "0 auto 8px" }} />
                  No audit events yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {filteredLog.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        borderLeft: `3px solid ${CATEGORY_COLORS[evt.category]}`,
                      }}
                    >
                      <span style={{ fontSize: "16px", flexShrink: 0 }}>{CATEGORY_ICONS[evt.category]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{evt.action}</div>
                        {evt.docTitle && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>📄 {evt.docTitle}</div>
                        )}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0, textAlign: "right" }}>
                        <div
                          style={{
                            display: "inline-block",
                            padding: "1px 6px",
                            background: CATEGORY_COLORS[evt.category] + "22",
                            color: CATEGORY_COLORS[evt.category],
                            borderRadius: "4px",
                            fontWeight: 600,
                            fontSize: "10px",
                            marginBottom: "3px",
                          }}
                        >
                          {evt.category}
                        </div>
                        <div>{formatAuditTimestamp(evt.ts)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
