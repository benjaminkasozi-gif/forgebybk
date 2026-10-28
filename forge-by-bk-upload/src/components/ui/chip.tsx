"use client";
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Chip({ selected, onClick, children, className, disabled }: { selected?: boolean; onClick?: () => void; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-all active:scale-95 disabled:opacity-40",
        selected ? "border-accent bg-accent/15 text-accent" : "border-border bg-surface-2 text-fg/85 hover:border-muted/50",
        className,
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      {children}
    </button>
  );
}

export function Badge({ children, tone = "default", className }: { children: React.ReactNode; tone?: "default" | "accent" | "volt" | "warn" | "danger"; className?: string }) {
  const tones = {
    default: "bg-surface-2 text-muted border-border",
    accent: "bg-accent/12 text-accent border-accent/30",
    volt: "bg-volt/12 text-volt border-volt/30",
    warn: "bg-warn/12 text-warn border-warn/30",
    danger: "bg-danger/12 text-danger border-danger/30",
  };
  return <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", tones[tone], className)}>{children}</span>;
}

/** Segmented single-choice control. */
export function Segmented<T extends string | number>({ value, options, onChange, className, ariaLabel }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void; className?: string; ariaLabel?: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex rounded-xl border border-border bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition-all", value === o.value ? "bg-accent text-accent-fg shadow" : "text-muted hover:text-fg")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Large tappable option card for wizards. */
export function OptionCard({ selected, onClick, title, desc, icon }: { selected: boolean; onClick: () => void; title: string; desc?: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.99]",
        selected ? "border-accent bg-accent/10 glow" : "border-border bg-surface hover:border-muted/40",
      )}
    >
      {icon && <div className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl", selected ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")}>{icon}</div>}
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        {desc && <div className="mt-0.5 text-sm text-muted">{desc}</div>}
      </div>
    </button>
  );
}
