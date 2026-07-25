import { useCallback, useEffect, useRef } from "react";
import { useToastStore, type Toast } from "../store/useToastStore";

let nextId = 0;
const toastTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

export function toast(message: string, type: Toast["type"] = "info") {
  const currentId = ++nextId;
  useToastStore.getState().addToast({ id: currentId, message, type });
  const id = setTimeout(() => {
    toastTimeouts.delete(currentId);
    useToastStore.getState().removeToast(currentId);
  }, 4000);
  toastTimeouts.set(currentId, id);
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      for (const [id, timeout] of toastTimeouts) {
        clearTimeout(timeout);
        toastTimeouts.delete(id);
      }
    };
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      const timeout = toastTimeouts.get(id);
      if (timeout) { clearTimeout(timeout); toastTimeouts.delete(id); }
      removeToast(id);
    },
    [removeToast],
  );

  if (toasts.length === 0) return null;

  return (
    <div className="graphite-toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`graphite-toast graphite-toast--${t.type}`}
          onClick={() => dismiss(t.id)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") dismiss(t.id); }}
          tabIndex={0}
          role="alert"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
