import { create } from "zustand";

interface Toast {
  id: number;
  message: string;
  type: "info" | "error" | "success";
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Toast) => void;
  removeToast: (id: number) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
