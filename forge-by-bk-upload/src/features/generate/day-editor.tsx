"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { FOCUS_GROUPS, FOCUS_LABEL, OBJECTIVE_LABEL, defaultDayLabel, type DayPlan, type FocusId, type SessionObjective, type Weekday } from "@/lib/engine";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { cn, WEEKDAY_SHORT } from "@/lib/utils";

export const OBJECTIVES: { id: SessionObjective; desc: string }[] = [
  { id: "hypertrophy", desc: "6–15 reps near failure, moderate rest" },
  { id: "strength", desc: "Heavy 3–6 reps, long rest" },
  { id: "power", desc: "Explosive low reps, full recovery" },
  { id: "endurance", desc: "15+ reps, short rest" },
  { id: "conditioning", desc: "Intervals and density work" },
  { id: "mixed", desc: "Heavy main lift, hypertrophy accessories" },
];

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Focus picker: any combination of splits, muscles and qualities. */
export function FocusPicker({ value, onChange }: { value: FocusId[]; onChange: (v: FocusId[]) => void }) {
  return (
    <div className="space-y-3">
      {FOCUS_GROUPS.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.title}</div>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map((f) => (
              <Chip key={f} selected={value.includes(f)} onClick={() => onChange(toggle(value, f))} className="h-8 px-3 text-[13px]">
                {FOCUS_LABEL[f]}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WeekdayPicker({ value, onChange, taken = [] }: { value: Weekday | null; onChange: (v: Weekday | null) => void; taken?: (Weekday | null)[] }) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {WEEKDAY_SHORT.map((d, i) => {
        const on = value === i;
        const used = !on && taken.includes(i as Weekday);
        return (
          <button key={d} type="button" aria-pressed={on} onClick={() => onChange(i as Weekday)} className={cn("h-9 rounded-lg border text-xs font-semibold transition-all", on ? "border-accent bg-accent text-accent-fg" : used ? "border-border/50 text-muted/40" : "border-border bg-surface-2 text-muted")}>
            {d}
          </button>
        );
      })}
      <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={cn("h-9 rounded-lg border text-xs font-semibold", value === null ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface-2 text-muted")}>
        Any
      </button>
    </div>
  );
}

export function ObjectivePicker({ value, onChange, compact }: { value: SessionObjective; onChange: (v: SessionObjective) => void; compact?: boolean }) {
  return (
    <div className={cn("grid gap-1.5", compact ? "grid-cols-3" : "grid-cols-2")}>
      {OBJECTIVES.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn("rounded-xl border px-3 py-2 text-left transition-all", value === o.id ? "border-accent bg-accent/10" : "border-border bg-surface-2")}
        >
          <div className={cn("text-sm font-semibold", value === o.id && "text-accent")}>{OBJECTIVE_LABEL[o.id]}</div>
          {!compact && <div className="text-[11px] leading-tight text-muted">{o.desc}</div>}
        </button>
      ))}
    </div>
  );
}

export function DayCard({
  day, index, count, onChange, onMove, onRemove, takenWeekdays, error, showObjective,
}: {
  day: DayPlan;
  index: number;
  count: number;
  onChange: (d: DayPlan) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  takenWeekdays: (Weekday | null)[];
  error?: string;
  showObjective?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border bg-surface p-4", error ? "border-danger/60" : "border-border")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">Day {index + 1}</div>
          <div className="truncate font-semibold">{day.label || (day.focuses.length ? defaultDayLabel(day.focuses, day.objective) : "Choose a focus")}</div>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconBtn label="Move day up" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="h-4 w-4" /></IconBtn>
          <IconBtn label="Move day down" disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown className="h-4 w-4" /></IconBtn>
          <IconBtn label="Remove day" disabled={count <= 1} onClick={onRemove}><Trash2 className="h-4 w-4" /></IconBtn>
        </div>
      </div>
      <div className="space-y-4">
        <WeekdayPicker value={day.weekday} onChange={(weekday) => onChange({ ...day, weekday })} taken={takenWeekdays} />
        <FocusPicker value={day.focuses} onChange={(focuses) => onChange({ ...day, focuses })} />
        {day.focuses.includes("sport") && (
          <Input value={day.sport ?? ""} onChange={(e) => onChange({ ...day, sport: e.target.value })} placeholder="Which sport? e.g. soccer, tennis, basketball" aria-label="Sport" />
        )}
        {showObjective && <ObjectivePicker value={day.objective} onChange={(objective) => onChange({ ...day, objective })} compact />}
        <Input value={day.label} onChange={(e) => onChange({ ...day, label: e.target.value })} placeholder="Custom name (optional)" aria-label="Session name" maxLength={40} />
        {error && <p className="text-xs text-danger" role="alert">{error}</p>}
      </div>
    </div>
  );
}

function IconBtn({ label, children, onClick, disabled }: { label: string; children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-2 text-muted hover:text-fg disabled:opacity-30">
      {children}
    </button>
  );
}
