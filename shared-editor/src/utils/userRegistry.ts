export interface AwarenessUser {
  id: string;
  name: string;
  color: string;
}

export interface AwarenessState {
  user: AwarenessUser;
  cursor: { x: number; y: number } | null;
  focused: boolean;
  docId: string;
  lastSeen: number;
}

export const awarenessStates = new Map<number, AwarenessState>();

export function getCurrentUser(): { id: string; name: string; color: string } {
  let user = localStorage.getItem("graphite_current_user");
  if (!user) {
    const id = crypto.randomUUID();
    const name = `User-${id.slice(0, 4)}`;
    const colors = ["#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
    const color = colors[Math.abs(name.charCodeAt(0)) % colors.length];
    user = JSON.stringify({ id, name, color });
    localStorage.setItem("graphite_current_user", user);
  }
  return JSON.parse(user);
}
