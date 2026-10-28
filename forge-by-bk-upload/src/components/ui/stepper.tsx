"use client";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, label, suffix, className }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string; suffix?: string; className?: string }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v * 100) / 100)));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => set(value - step)} className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2 active:scale-95 disabled:opacity-40" disabled={value <= min}>
        <Minus className="h-4 w-4" />
      </button>
      <div className="min-w-[72px] text-center font-display text-3xl font-bold tabular" aria-live="polite" aria-label={label}>
        {value}
        {suffix && <span className="ml-1 text-base font-medium text-muted">{suffix}</span>}
      </div>
      <button type="button" aria-label={`Increase ${label}`} onClick={() => set(value + step)} className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2 active:scale-95 disabled:opacity-40" disabled={value >= max}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
