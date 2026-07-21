import { useCallback } from "react";
import { useNoteStore } from "../store/useNoteStore";

interface Toast {
  id: number;
  message: string;
  type: "info" | "error" | "success";
}

let nextId = 0;

export function toast(message: string, type: Toast["type"] = "info") {
  useNoteStore.getState().addToast({ id: ++nextId, message, type });
  setTimeout(() => {
    useNoteStore.getState().removeToast(nextId);
  }, 4000);
}

export function ToastContainer() {
  const toasts = useNoteStore((s) => s.toasts);
  const removeToast = useNoteStore((s) => s.removeToast);

  const dismiss = useCallback(
    (id: number) => removeToast(id),
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
          role="alert"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
