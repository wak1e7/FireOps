"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

type Toast = {
  id: string;
  message: string;
};

type ToastContextValue = {
  showToast: (message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message = "Tus cambios se guardaron con éxito.") => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, message }].slice(-3));
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-[min(92vw,420px)] flex-col gap-3 sm:right-6 sm:top-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-[#07102a] px-4 py-3 pr-12 text-sm font-semibold text-white shadow-panel"
            role="status"
          >
            <span className="absolute inset-y-0 left-0 w-2 bg-emerald-500" />
            <span className="flex items-center gap-2 pl-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
              {toast.message}
            </span>
            <button
              type="button"
              className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-white/74 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar mensaje"
              onClick={() => dismiss(toast.id)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider.");
  }
  return context;
}
