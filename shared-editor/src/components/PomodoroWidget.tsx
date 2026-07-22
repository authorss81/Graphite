import { useState, useEffect } from "react";
import { Clock, Play, Pause, RotateCcw } from "lucide-react";

export function PomodoroWidget() {
  const [seconds, setSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isActive && seconds > 0) {
      const targetTime = Date.now() + seconds * 1000;
      timer = setInterval(() => {
        const remaining = Math.max(0, Math.round((targetTime - Date.now()) / 1000));
        setSeconds(remaining);
        if (remaining === 0) setIsActive(false);
      }, 500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setSeconds(25 * 60);
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div
      className="graphite-pomodoro-widget"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: "rgba(99, 102, 241, 0.12)",
        border: "1px solid var(--border-color-glow)",
        borderRadius: "8px",
        padding: "3px 8px",
        fontSize: "12px",
        fontFamily: "var(--font-mono)",
        color: "var(--accent-color)",
        marginLeft: "auto",
      }}
    >
      <Clock size={13} />
      <span>{timeFormatted}</span>
      <button
        type="button"
        onClick={toggleTimer}
        style={{ background: "transparent", border: "none", color: "var(--accent-color)", cursor: "pointer", padding: "0 2px" }}
        title={isActive ? "Pause Focus Session" : "Start 25m Focus Session"}
      >
        {isActive ? <Pause size={12} /> : <Play size={12} fill="var(--accent-color)" />}
      </button>
      <button
        type="button"
        onClick={resetTimer}
        style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0 2px" }}
        title="Reset Timer"
      >
        <RotateCcw size={11} />
      </button>
    </div>
  );
}
