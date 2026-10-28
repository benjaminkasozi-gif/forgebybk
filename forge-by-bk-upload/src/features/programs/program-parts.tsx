"use client";

import { Clock } from "lucide-react";
import {
  EXERCISE_MAP, FOCUS_LABEL, OBJECTIVE_LABEL, PHASE_LABEL, prescriptionForWeek,
  type Prescription, type ProgramExercise, type ProgramSession, type VolumeReportRow, type WeekPlan,
} from "@/lib/engine";
import { Badge } from "@/components/ui/chip";
import { Card } from "@/components/ui/card";
import { cn, WEEKDAY_LONG } from "@/lib/utils";

const GROUP_LABEL: Record<string, string> = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Biceps", triceps: "Triceps", quads: "Quads",
  hamstrings: "Hamstrings", glutes: "Glutes", calves: "Calves", core: "Core",
};

export function rxText(rx: Prescription): string {
  const reps = rx.workSec ? `${rx.workSec}s` : rx.repsMin === rx.repsMax ? `${rx.repsMin}` : `${rx.repsMin}–${rx.repsMax}`;
  return `${rx.sets} × ${reps}`;
}

export function restText(sec: number): string {
  return sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : `${sec}s`;
}

export function ExerciseRow({ pe, week, index, actions }: { pe: ProgramExercise; week?: WeekPlan; index: number; actions?: React.ReactNode }) {
  const ex = EXERCISE_MAP[pe.exerciseId];
  const rx = prescriptionForWeek(pe.rx, pe.role, week);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold", pe.role === "primary" ? "bg-accent text-accent-fg" : pe.role === "secondary" ? "bg-volt/15 text-volt" : "bg-surface-2 text-muted")}>{index + 1}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{ex?.name ?? pe.exerciseId}</div>
        <div className="text-xs text-muted tabular">
          {rxText(rx)} · {rx.workSec ? "" : `RIR ${rx.rir} · `}rest {restText(rx.restSec)}
          {rx.tempo ? ` · tempo ${rx.tempo}` : ""}
        </div>
      </div>
      {actions}
    </li>
  );
}

export function SessionCard({ session, week, index, header, renderActions, footer }: { session: ProgramSession; week?: WeekPlan; index: number; header?: React.ReactNode; renderActions?: (pe: ProgramExercise, i: number) => React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Card className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Day {index + 1}{session.weekday != null ? ` · ${WEEKDAY_LONG[session.weekday]}` : ""}
          </div>
          <h3 className="mt-0.5 text-lg font-bold leading-tight">{session.label}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {session.focuses.map((f) => <Badge key={f}>{FOCUS_LABEL[f]}</Badge>)}
            <Badge tone="accent">{OBJECTIVE_LABEL[session.objective]}</Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs text-muted"><Clock className="h-3.5 w-3.5" /> {session.estMinutes}m</div>
      </div>
      {header}
      <ul className="mt-2 divide-y divide-border/60">
        {session.exercises.map((pe, i) => <ExerciseRow key={pe.id} pe={pe} week={week} index={i} actions={renderActions?.(pe, i)} />)}
      </ul>
      {footer}
    </Card>
  );
}

export function VolumeReport({ rows }: { rows: VolumeReportRow[] }) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => Math.max(r.max, r.sets))) || 1;
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-semibold">Weekly hard sets per muscle</h3>
        <span className="text-xs text-muted">bar = target range</span>
      </div>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.group} className="grid grid-cols-[84px_1fr_44px] items-center gap-3 text-sm">
            <span className="text-muted">{GROUP_LABEL[r.group]}</span>
            <div className="relative h-2.5 rounded-full bg-surface-2">
              <div className="absolute inset-y-0 rounded-full bg-border" style={{ left: `${(r.min / max) * 100}%`, width: `${((r.max - r.min) / max) * 100}%` }} />
              <div className={cn("absolute inset-y-0 left-0 rounded-full", r.status === "ok" ? "bg-accent" : r.status === "low" ? "bg-warn" : "bg-volt")} style={{ width: `${Math.min(100, (r.sets / max) * 100)}%`, opacity: 0.9 }} />
            </div>
            <span className={cn("text-right font-semibold tabular", r.status === "ok" ? "text-fg" : r.status === "low" ? "text-warn" : "text-volt")}>{r.sets}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Direct work counts as 1 set, assistance as ½. Targets scale with your goal, experience and recovery.</p>
    </Card>
  );
}

export function WeekTimeline({ weeks, current, onSelect }: { weeks: WeekPlan[]; current: number; onSelect?: (i: number) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Program weeks">
      {weeks.map((w) => (
        <button
          key={w.index}
          role="tab"
          aria-selected={current === w.index}
          type="button"
          onClick={() => onSelect?.(w.index)}
          className={cn(
            "flex w-[58px] shrink-0 flex-col items-center rounded-xl border px-1 py-2 transition-all",
            current === w.index ? "border-accent bg-accent/10" : "border-border bg-surface",
          )}
        >
          <span className="text-[10px] font-semibold uppercase text-muted">Wk</span>
          <span className="font-display text-xl font-bold leading-none">{w.index + 1}</span>
          <span className={cn("mt-1 h-1 w-6 rounded-full", w.phase === "deload" ? "bg-volt" : w.phase === "peak" ? "bg-warn" : w.phase === "intensification" ? "bg-accent" : "bg-accent/50")} title={PHASE_LABEL[w.phase]} />
        </button>
      ))}
    </div>
  );
}

export function PhaseLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted">
      <span className="flex items-center gap-1.5"><i className="h-1.5 w-4 rounded-full bg-accent/50" /> Accumulation</span>
      <span className="flex items-center gap-1.5"><i className="h-1.5 w-4 rounded-full bg-accent" /> Intensification</span>
      <span className="flex items-center gap-1.5"><i className="h-1.5 w-4 rounded-full bg-volt" /> Deload</span>
      <span className="flex items-center gap-1.5"><i className="h-1.5 w-4 rounded-full bg-warn" /> Peak</span>
    </div>
  );
}
