import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-surface p-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-[15px] font-semibold tracking-tight", className)} {...props} />;
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-end justify-between", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, unit, className }: { label: string; value: React.ReactNode; unit?: string; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-3", className)}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 font-display text-3xl font-bold leading-none tabular">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-muted">{unit}</span>}
      </div>
    </div>
  );
}
