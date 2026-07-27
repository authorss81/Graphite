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

let cachedCurrentUser: { id: string; name: string; color: string } | null = null;

export function getCurrentUser(): { id: string; name: string; color: string } {
  if (cachedCurrentUser) return cachedCurrentUser;
  try {
    // Try to bind to Supabase auth session if available
    const supabaseSession = localStorage.getItem("supabase.auth.token");
    if (supabaseSession) {
      try {
        const parsed = JSON.parse(supabaseSession);
        const userId = parsed?.currentSession?.user?.id;
        if (userId) {
          const existing = localStorage.getItem("graphite_current_user");
          if (existing) {
            const parsedExisting = JSON.parse(existing);
            // If the stored user id matches the supabase user, use cache
            if (parsedExisting.id === userId) {
              cachedCurrentUser = parsedExisting;
              return parsedExisting;
            }
          }
          // Create new user bound to supabase ID
          const name = `User-${userId.slice(0, 4)}`;
          const colors = ["#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
          const color = colors[Math.abs(name.charCodeAt(0)) % colors.length];
          const newUser = { id: userId, name, color };
          cachedCurrentUser = newUser;
          try {
            localStorage.setItem("graphite_current_user", JSON.stringify(newUser));
          } catch (e) {
            console.warn("Failed to set user in localStorage", e);
          }
          return newUser;
        }
      } catch {}
    }

    let user = localStorage.getItem("graphite_current_user");
    if (!user) {
      const id = crypto.randomUUID();
      const name = `User-${id.slice(0, 4)}`;
      const colors = ["#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
      const color = colors[Math.abs(name.charCodeAt(0)) % colors.length];
      const newUser = { id, name, color };
      cachedCurrentUser = newUser;
      try {
        localStorage.setItem("graphite_current_user", JSON.stringify(newUser));
      } catch (e) {
        console.warn("Failed to set user in localStorage", e);
      }
      return newUser;
    }
    cachedCurrentUser = JSON.parse(user);
    return cachedCurrentUser!;
  } catch {
    const fallbackUser = { id: crypto.randomUUID(), name: "Guest", color: "#a855f7" };
    cachedCurrentUser = fallbackUser;
    return fallbackUser;
  }
}
