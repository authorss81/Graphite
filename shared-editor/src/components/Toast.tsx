import { useCallback } from "react";
import { useToastStore } from "../store/useToastStore";

interface Toast {
  id: number;
  message: string;
  type: "info" | "error" | "success";
}

let nextId = 0;

export function toast(message: string, type: Toast["type"] = "info") {
  const currentId = ++nextId;
  useToastStore.getState().addToast({ id: currentId, message, type });
  setTimeout(() => {
    useToastStore.getState().removeToast(currentId);
  }, 4000);
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

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
