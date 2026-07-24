import { useState, useEffect, useRef } from "react";
import { useNoteStore } from "../store/useNoteStore";
import { awarenessStates, type AwarenessState } from "../utils/userRegistry";
import { Users } from "lucide-react";

export function PresenceIndicator() {
  const docId = useNoteStore((s) => s.docId);
  const [online, setOnline] = useState<AwarenessState[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const active: AwarenessState[] = [];
      awarenessStates.forEach((state: AwarenessState) => {
        if (state.docId === docId && now - state.lastSeen < 15000) {
          active.push(state);
        }
      });
      setOnline(active);
    };

    update();
    intervalRef.current = setInterval(update, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [docId]);

  if (online.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        fontSize: "11px",
        color: "var(--text-muted)",
      }}
      title={`${online.length} user${online.length > 1 ? "s" : ""} viewing`}
    >
      <Users size={12} />
      <div style={{ display: "flex", gap: "2px" }}>
        {online.slice(0, 5).map((state, i) => (
          <div
            key={state.user.id + i}
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: state.user.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "8px",
              fontWeight: 700,
              color: "#fff",
            }}
            title={state.user.name}
          >
            {state.user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {online.length > 5 && (
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "8px",
              color: "var(--text-muted)",
            }}
          >
            +{online.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}
