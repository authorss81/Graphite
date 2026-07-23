import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Square } from "lucide-react";

export function AudioRecording() {
  const [permission, setPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setPermission("denied");
      setError("Audio recording not supported in this browser");
    }
  }, []);

  const requestPermission = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermission("granted");
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermission("denied");
        setError("Microphone access denied. Allow microphone access in your browser settings.");
      } else {
        setError("Could not access microphone: " + err.message);
      }
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    try {
      const recorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err: any) {
      setError("Failed to start recording: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setDuration(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 8px", borderRadius: "8px", background: recording ? "rgba(239,68,68,0.12)" : "var(--bg-tertiary)", border: "1px solid var(--border-color)" }}>
      {permission === "prompt" && (
        <button onClick={requestPermission} title="Allow microphone access" style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px" }}>
          <Mic size={14} /> Enable Mic
        </button>
      )}
      {permission === "denied" && (
        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f87171", fontSize: "11px" }}>
          <MicOff size={14} /> {error || "Mic blocked"}
        </span>
      )}
      {permission === "granted" && !recording && (
        <button onClick={startRecording} title="Start recording" style={{ display: "flex", alignItems: "center", gap: "4px", background: "transparent", border: "none", color: "var(--accent-color)", cursor: "pointer", fontSize: "11px" }}>
          <Mic size={14} /> Record
        </button>
      )}
      {recording && (
        <>
          <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#ef4444", fontSize: "11px", fontWeight: 600 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
            REC {formatDuration(duration)}
          </span>
          <button onClick={stopRecording} title="Stop recording" style={{ display: "flex", alignItems: "center", background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}>
            <Square size={12} />
          </button>
        </>
      )}
      {error && !recording && permission === "granted" && (
        <span style={{ color: "#f87171", fontSize: "10px" }}>{error}</span>
      )}
    </div>
  );
}
