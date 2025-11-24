import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; kind: ToastKind; message: string };

const ToastCtx = createContext<{ push: (kind: ToastKind, msg: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, kind, message }]);
    // auto-dismiss
    setTimeout(() => remove(id), 3000);
  }, [remove]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {/* viewport */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`alert shadow-lg max-w-sm border-2 rounded-xl bg-gradient-to-r ${
              t.kind === "success"
                ? "from-green-700/90 to-emerald-600/90 border-green-300"
                : t.kind === "error"
                ? "from-red-800/90 to-rose-700/90 border-red-300"
                : "from-sky-700/90 to-cyan-600/90 border-sky-300"
            } text-white`}
          >
            <div className="flex items-center">
              <span className="text-lg mr-2">
                {t.kind === "success" ? "🎄" : t.kind === "error" ? "🎁" : "❄️"}
              </span>
              <span className="ml-1">{t.message}</span>
            </div>
            <button
              className="btn btn-ghost btn-xs text-white/80 hover:text-white"
              onClick={() => remove(t.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return {
    success: (m: string) => ctx.push("success", m),
    error: (m: string) => ctx.push("error", m),
    info: (m: string) => ctx.push("info", m),
  };
}
