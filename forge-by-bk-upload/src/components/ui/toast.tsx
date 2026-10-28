"use client";
import * as React from "react";
import { create } from "zustand";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface Toast { id: number; message: string; tone: "ok" | "error" }
const useToasts = create<{ toasts: Toast[]; push: (m: string, tone?: Toast["tone"]) => void }>((set) => ({
  toasts: [],
  push: (message, tone = "ok") => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600);
  },
}));

export const toast = (m: string, tone?: Toast["tone"]) => useToasts.getState().push(m, tone);

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 pt-safe">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-border bg-surface-2/95 px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur animate-fade-up">
          {t.tone === "ok" ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <AlertTriangle className="h-4 w-4 text-danger" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
