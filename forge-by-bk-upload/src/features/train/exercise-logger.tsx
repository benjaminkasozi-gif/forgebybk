"use client";

import { memo, useState } from "react";
import { Check, ChevronDown, Info, MoreVertical, Plus, TrendingDown, TrendingUp, Minus as Flat } from "lucide-react";
import {
  EXERCISE_MAP, lastPerformance, suggestLoad, addSet, moveExercise, removeExercise, removeSet, setExerciseNotes, toggleSetDone, updateSet,
  type LoggedExercise, type LoggedSet, type WorkoutLog,
} from "@/lib/engine";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { restText } from "@/features/programs/program-parts";
import { useRest } from "./rest-timer";
import { ExerciseDemo, HowToSteps } from "@/features/demo/exercise-demo";

interface Props {
  le: LoggedExercise;
  index: number;
  count: number;
  history: WorkoutLog[];
  onSwap: () => void;
}

export const ExerciseLogger = memo(function ExerciseLogger({ le, index, count, history, onSwap }: Props) {
  const edit = useStore((s) => s.editActiveWorkout);
  const settings = useStore((s) => s.settings);
  const oneRepMaxes = useStore((s) => s.profile?.oneRepMaxes);
  const startRest = useRest((s) => s.start);
  const [menu, setMenu] = useState(false);
  const [showCues, setShowCues] = useState(false);
  const ex = EXERCISE_MAP[le.exerciseId];
  const rx = le.rx;
  const last = lastPerformance(le.exerciseId, history);
  const sug = ex && rx ? suggestLoad(ex, rx, history, oneRepMaxes) : null;
  const doneCount = le.sets.filter((s) => s.done && s.type === "working").length;
  const working = le.sets.filter((s) => s.type === "working").length;
  const complete = working > 0 && doneCount === working;
  const timed = Boolean(ex?.timed);

  const onToggle = (s: LoggedSet) => {
    edit((w) => toggleSetDone(w, le.id, s.id));
    if (!s.done && settings.autoStartRest) startRest(s.type === "warmup" ? 60 : rx?.restSec ?? 90);
  };

  const TrendIcon = sug?.kind === "increase" ? TrendingUp : sug?.kind === "decrease" ? TrendingDown : Flat;

  return (
    <section className={cn("rounded-2xl border bg-surface transition-colors", complete ? "border-accent/40" : "border-border")} aria-label={ex?.name}>
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold", complete ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted")}>{complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}</span>
            <h3 className="truncate text-[17px] font-bold">{ex?.name ?? le.exerciseId}</h3>
          </div>
          {rx && (
            <div className="mt-1 text-xs text-muted tabular">
              Target {rx.sets} × {rx.workSec ? `${rx.workSec}s` : `${rx.repsMin}–${rx.repsMax}`}{!rx.workSec && ` @ RIR ${rx.rir}`} · rest {restText(rx.restSec)}
              {rx.tempo && ` · tempo ${rx.tempo}`}
            </div>
          )}
          {rx?.intent && <div className="mt-0.5 text-xs text-volt">{rx.intent}</div>}
        </div>
        <div className="relative flex shrink-0 gap-1">
          {ex && (
            <button type="button" aria-label="How to do it" aria-expanded={showCues} onClick={() => setShowCues(!showCues)} className={cn("grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2", showCues ? "text-accent" : "text-muted")}><Info className="h-4 w-4" /></button>
          )}
          <button type="button" aria-label="Exercise options" aria-expanded={menu} onClick={() => setMenu(!menu)} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2"><MoreVertical className="h-4 w-4" /></button>
          {menu && (
            <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-2xl" onMouseLeave={() => setMenu(false)}>
              {[
                { l: "Swap exercise", f: onSwap },
                { l: "Move up", f: () => edit((w) => moveExercise(w, le.id, -1)), d: index === 0 },
                { l: "Move down", f: () => edit((w) => moveExercise(w, le.id, 1)), d: index === count - 1 },
                { l: "Add note", f: () => { const n = prompt("Note for this exercise", le.notes ?? ""); if (n !== null) edit((w) => setExerciseNotes(w, le.id, n.slice(0, 200))); } },
                { l: "Remove exercise", f: () => confirm(`Remove ${ex?.name}?`) && edit((w) => removeExercise(w, le.id)), danger: true },
              ].map((m) => (
                <button key={m.l} type="button" disabled={m.d} onClick={() => { setMenu(false); m.f(); }} className={cn("block w-full px-4 py-2.5 text-left text-sm hover:bg-border/50 disabled:opacity-30", m.danger && "text-danger")}>{m.l}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCues && ex && (
        <div className="mx-4 mb-3 space-y-3">
          <ExerciseDemo exercise={ex} />
          <HowToSteps exercise={ex} />
          {ex.cues.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-surface-2 p-3 text-sm">
              {ex.cues.map((c) => <li key={c} className="flex gap-2"><span className="text-accent">•</span>{c}</li>)}
            </ul>
          )}
        </div>
      )}

      {(sug || last) && (
        <div className="mx-4 mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {sug && (
            <span className="flex items-center gap-1 text-accent">
              <TrendIcon className="h-3.5 w-3.5" /> {sug.reason}
            </span>
          )}
          {last && (
            <span className="text-muted tabular">
              Last: {last.sets.map((s) => (s.weight ? `${s.weight}×${s.reps}` : `${s.reps}`)).join(", ")}
            </span>
          )}
        </div>
      )}
      {le.notes && <p className="mx-4 mb-2 rounded-lg bg-warn/10 px-3 py-1.5 text-xs text-warn">{le.notes}</p>}

      <div className="px-2 pb-2">
        <div className={cn("grid items-center gap-1.5 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted", settings.showRir && !timed ? "grid-cols-[28px_1fr_1fr_56px_48px]" : "grid-cols-[28px_1fr_1fr_48px]")}>
          <span>Set</span>
          <span className="text-center">{ex?.loaded ? "kg" : "+kg"}</span>
          <span className="text-center">{timed ? "sec" : "reps"}</span>
          {settings.showRir && !timed && <span className="text-center">RIR</span>}
          <span />
        </div>
        {le.sets.map((s, i) => (
          <SetRow
            key={s.id}
            s={s}
            label={s.type === "warmup" ? "W" : String(le.sets.slice(0, i + 1).filter((x) => x.type === "working").length)}
            timed={timed}
            showRir={settings.showRir && !timed}
            onChange={(patch) => edit((w) => updateSet(w, le.id, s.id, patch))}
            onToggle={() => onToggle(s)}
            onRemove={() => edit((w) => removeSet(w, le.id, s.id))}
          />
        ))}
        <button type="button" onClick={() => edit((w) => addSet(w, le.id))} className="mt-1 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-muted hover:bg-surface-2 hover:text-fg">
          <Plus className="h-4 w-4" /> Add set
        </button>
      </div>
    </section>
  );
});

function SetRow({ s, label, timed, showRir, onChange, onToggle, onRemove }: { s: LoggedSet; label: string; timed: boolean; showRir: boolean; onChange: (p: Partial<LoggedSet>) => void; onToggle: () => void; onRemove: () => void }) {
  const num = (v: string) => (v === "" ? null : Number(v.replace(",", ".")));
  const [swipe, setSwipe] = useState(false);
  return (
    <div className={cn("group grid items-center gap-1.5 rounded-xl px-2 py-1 transition-colors", showRir ? "grid-cols-[28px_1fr_1fr_56px_48px]" : "grid-cols-[28px_1fr_1fr_48px]", s.done && "bg-accent/10")}>
      <button type="button" onClick={() => setSwipe(!swipe)} aria-label={`Set ${label} options`} className={cn("text-center text-sm font-bold", s.type === "warmup" ? "text-warn" : "text-muted")}>
        {swipe ? <ChevronDown className="mx-auto h-4 w-4" /> : label}
      </button>
      {swipe ? (
        <div className="col-span-3 flex gap-2">
          <button type="button" onClick={() => { onChange({ type: s.type === "warmup" ? "working" : "warmup" }); setSwipe(false); }} className="h-11 flex-1 rounded-lg bg-surface-2 text-xs font-semibold">
            Mark as {s.type === "warmup" ? "working" : "warm-up"}
          </button>
          <button type="button" onClick={onRemove} className="h-11 flex-1 rounded-lg bg-danger/15 text-xs font-semibold text-danger">Delete set</button>
        </div>
      ) : (
        <>
          <NumInput value={s.weight} onChange={(v) => onChange({ weight: num(v) })} label={`Set ${label} weight`} step="0.5" done={s.done} />
          {timed ? (
            <NumInput value={s.seconds ?? null} onChange={(v) => onChange({ seconds: num(v) })} label={`Set ${label} seconds`} done={s.done} />
          ) : (
            <NumInput value={s.reps} onChange={(v) => onChange({ reps: num(v) })} label={`Set ${label} reps`} done={s.done} integer />
          )}
          {showRir && <NumInput value={s.rir} onChange={(v) => onChange({ rir: num(v) })} label={`Set ${label} reps in reserve`} done={s.done} integer placeholder="–" />}
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={s.done}
            aria-label={s.done ? `Undo set ${label}` : `Complete set ${label}`}
            className={cn("grid h-11 w-12 place-items-center rounded-xl border transition-all active:scale-90", s.done ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface-2 text-muted")}
          >
            <Check className="h-5 w-5" strokeWidth={3} />
          </button>
        </>
      )}
    </div>
  );
}

function NumInput({ value, onChange, label, step, done, integer, placeholder = "0" }: { value: number | null; onChange: (v: string) => void; label: string; step?: string; done: boolean; integer?: boolean; placeholder?: string }) {
  return (
    <input
      type="number"
      inputMode={integer ? "numeric" : "decimal"}
      step={step ?? "1"}
      min={0}
      aria-label={label}
      placeholder={placeholder}
      value={value ?? ""}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-11 w-full min-w-0 rounded-lg border bg-bg/60 text-center text-[17px] font-semibold tabular focus:border-accent focus:outline-none", done ? "border-transparent text-accent" : "border-border")}
    />
  );
}

