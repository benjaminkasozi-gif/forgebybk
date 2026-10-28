"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Dumbbell, Flag, Play, Plus, Sparkles, Trophy, X, Zap } from "lucide-react";
import {
  EXERCISE_MAP, OBJECTIVE_LABEL, PHASE_LABEL, addExercise, alternatives, eligibleExercises, nextSession, startEmptyWorkout, startWorkoutFromSession, summarize, swapExercise,
  type WorkoutLog, type WorkoutSummary,
} from "@/lib/engine";
import { useActiveProgram, useStore, useWorkouts } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/chip";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { ExercisePicker } from "@/features/library/exercise-picker";
import { ExerciseLogger } from "@/features/train/exercise-logger";
import { RestTimerBar, useRest } from "@/features/train/rest-timer";
import { cn, formatDuration, formatNumber, relativeDay } from "@/lib/utils";

export default function TrainPage() {
  const active = useStore((s) => s.activeWorkout);
  const [summary, setSummary] = useState<{ log: WorkoutLog; sum: WorkoutSummary } | null>(null);
  if (summary) return <Summary {...summary} onClose={() => setSummary(null)} />;
  return active ? <ActiveWorkout onFinished={(log, sum) => setSummary({ log, sum })} /> : <StartPanel />;
}

function StartPanel() {
  const program = useActiveProgram();
  const workouts = useWorkouts();
  const profile = useStore((s) => s.profile)!;
  const startWorkout = useStore((s) => s.startWorkout);
  const done = workouts.filter((w) => w.finishedAt);
  const next = program ? nextSession(program, done) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Train" subtitle="Pick a session — everything autosaves as you lift, even offline." />
      {program && next ? (
        <>
          <Card className="card-gradient glow p-5">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="accent">Recommended</Badge>
              <Badge>Week {next.week + 1} · {PHASE_LABEL[program.weekPlans[next.week]?.phase ?? "accumulation"]}</Badge>
            </div>
            <h2 className="mt-3 font-display text-3xl font-bold uppercase leading-none">{next.session.label}</h2>
            <p className="mt-1.5 text-sm text-muted">{program.name}</p>
            <div className="mt-3 flex gap-4 text-sm text-muted">
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> ~{next.session.estMinutes} min</span>
              <span className="flex items-center gap-1.5"><Dumbbell className="h-4 w-4" /> {next.session.exercises.length} exercises</span>
            </div>
            <Button size="lg" className="mt-4 w-full" onClick={() => startWorkout(startWorkoutFromSession(program, next.session, next.week, done, profile.oneRepMaxes))}>
              <Play className="h-5 w-5" /> Start workout
            </Button>
          </Card>
          <section>
            <SectionTitle>Or choose another day</SectionTitle>
            <div className="space-y-2">
              {program.sessions.filter((s) => s.id !== next.session.id).map((s) => (
                <button key={s.id} type="button" onClick={() => startWorkout(startWorkoutFromSession(program, s, next.week, done, profile.oneRepMaxes))} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-left hover:border-muted/40">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{s.label}</div>
                    <div className="text-xs text-muted">{OBJECTIVE_LABEL[s.objective]} · {s.exercises.length} exercises · ~{s.estMinutes} min</div>
                  </div>
                  <Play className="h-4 w-4 shrink-0 text-accent" />
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <EmptyState icon={<Sparkles className="h-6 w-6" />} title="No active program" body="Generate a program for guided sessions with target loads — or just start an empty workout." action={<Button asChild><Link href="/generate">Generate program</Link></Button>} />
      )}
      <Button variant="outline" size="lg" className="w-full" onClick={() => startWorkout(startEmptyWorkout())}>
        <Zap className="h-5 w-5" /> Start empty workout
      </Button>
      <History />
    </div>
  );
}

function History() {
  const workouts = useWorkouts();
  const deleteWorkout = useStore((s) => s.deleteWorkout);
  const [open, setOpen] = useState<WorkoutLog | null>(null);
  const done = workouts.filter((w) => w.finishedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (!done.length) return null;
  return (
    <section>
      <SectionTitle>History</SectionTitle>
      <ul className="space-y-2">
        {done.slice(0, 20).map((w) => {
          const s = summarize(w, done);
          return (
            <li key={w.id}>
              <button type="button" onClick={() => setOpen(w)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{w.name}</div>
                  <div className="text-xs text-muted">{relativeDay(w.startedAt)} · {s.durationMin} min · {s.sets} sets{s.prs.length ? ` · ${s.prs.length} PR` : ""}</div>
                </div>
                <span className="font-display text-lg font-bold tabular">{formatNumber(s.volumeKg)}<span className="ml-0.5 text-xs text-muted">kg</span></span>
              </button>
            </li>
          );
        })}
      </ul>
      {open && (
        <Sheet open onOpenChange={(o) => !o && setOpen(null)} title={open.name} description={new Date(open.startedAt).toLocaleString()}>
          <div className="space-y-3">
            {open.exercises.map((e) => (
              <div key={e.id}>
                <div className="font-semibold">{EXERCISE_MAP[e.exerciseId]?.name}</div>
                <div className="text-sm text-muted tabular">{e.sets.map((s) => `${s.type === "warmup" ? "W " : ""}${s.weight ?? 0}×${s.reps ?? s.seconds + "s"}`).join(" · ")}</div>
              </div>
            ))}
            {open.notes && <p className="rounded-xl bg-surface-2 p-3 text-sm">{open.notes}</p>}
            <Button variant="danger" className="w-full" onClick={() => { if (confirm("Delete this workout from your history?")) { deleteWorkout(open.id); setOpen(null); toast("Workout deleted"); } }}>Delete workout</Button>
          </div>
        </Sheet>
      )}
    </section>
  );
}

function ActiveWorkout({ onFinished }: { onFinished: (log: WorkoutLog, sum: WorkoutSummary) => void }) {
  const w = useStore((s) => s.activeWorkout)!;
  const edit = useStore((s) => s.editActiveWorkout);
  const finish = useStore((s) => s.finishActiveWorkout);
  const discard = useStore((s) => s.discardActiveWorkout);
  const profile = useStore((s) => s.profile)!;
  const workouts = useWorkouts();
  const stopRest = useRest((s) => s.stop);
  const history = useMemo(() => workouts.filter((x) => x.finishedAt), [workouts]);
  const pool = useMemo(() => eligibleExercises(profile), [profile]);
  const [picker, setPicker] = useState<{ swapId?: string } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const elapsed = useElapsed(w.startedAt);
  useWakeLock();

  const totalWorking = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.type === "working").length, 0);
  const doneWorking = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.type === "working" && s.done).length, 0);
  const swapping = picker?.swapId ? w.exercises.find((e) => e.id === picker.swapId) : undefined;

  return (
    <div className="pb-24">
      <div className="sticky top-[60px] z-20 -mx-4 mb-4 border-b border-border/70 bg-bg/90 px-4 py-3 backdrop-blur-xl lg:top-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden /> <span className="tabular">{formatDuration(elapsed)}</span> · {doneWorking}/{totalWorking} sets
            </div>
            <h1 className="truncate text-lg font-bold">{w.name}</h1>
          </div>
          <Button onClick={() => setFinishing(true)} disabled={doneWorking === 0}><Flag className="h-4 w-4" /> Finish</Button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${totalWorking ? (doneWorking / totalWorking) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {w.exercises.length === 0 && <EmptyState icon={<Dumbbell className="h-6 w-6" />} title="Empty workout" body="Add your first exercise to start logging." />}
        {w.exercises.map((le, i) => (
          <ExerciseLogger key={le.id} le={le} index={i} count={w.exercises.length} history={history} onSwap={() => setPicker({ swapId: le.id })} />
        ))}
        <Button variant="outline" size="lg" className="w-full" onClick={() => setPicker({})}><Plus className="h-5 w-5" /> Add exercise</Button>
        <button type="button" onClick={() => { if (confirm("Discard this workout? Logged sets will be lost.")) { discard(); stopRest(); } }} className="mx-auto flex items-center gap-1 py-3 text-sm text-muted hover:text-danger">
          <X className="h-4 w-4" /> Discard workout
        </button>
      </div>

      <ExercisePicker
        open={picker !== null}
        onOpenChange={(o) => !o && setPicker(null)}
        title={swapping ? `Swap ${EXERCISE_MAP[swapping.exerciseId]?.name}` : "Add exercise"}
        pool={pool}
        suggestions={swapping ? alternatives(swapping.exerciseId, profile, 5) : undefined}
        onPick={(id) => {
          edit((x) => (picker?.swapId ? swapExercise(x, picker.swapId, id) : addExercise(x, id)));
          setPicker(null);
        }}
      />

      {finishing && (
        <FinishSheet
          onClose={() => setFinishing(false)}
          defaultBodyweight={profile.weightKg}
          onFinish={(extras) => {
            const log = finish(extras);
            stopRest();
            if (log) onFinished(log, summarize(log, history));
          }}
        />
      )}
      <RestTimerBar />
    </div>
  );
}

function FinishSheet({ onClose, onFinish, defaultBodyweight }: { onClose: () => void; onFinish: (e: { sessionRpe?: number; bodyweightKg?: number; notes?: string }) => void; defaultBodyweight?: number }) {
  const [rpe, setRpe] = useState<number | undefined>();
  const [bw, setBw] = useState(defaultBodyweight ? String(defaultBodyweight) : "");
  const [notes, setNotes] = useState("");
  const bwNum = bw ? Number(bw) : undefined;
  const bwError = bwNum != null && (Number.isNaN(bwNum) || bwNum < 30 || bwNum > 300) ? "Enter 30–300 kg" : undefined;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title="Finish workout" description="Unticked sets are not saved.">
      <div className="space-y-5">
        <Field label="How hard was the session? (RPE)">
          <div className="grid grid-cols-10 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button key={n} type="button" aria-pressed={rpe === n} onClick={() => setRpe(n)} className={cn("h-10 rounded-lg border text-sm font-bold", rpe === n ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface-2 text-muted")}>{n}</button>
            ))}
          </div>
        </Field>
        <Field label="Bodyweight (kg, optional)" htmlFor="bw" error={bwError}>
          <Input id="bw" type="number" inputMode="decimal" value={bw} onChange={(e) => setBw(e.target.value)} aria-invalid={!!bwError} />
        </Field>
        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel?" maxLength={500} />
        </Field>
        <Button size="lg" className="w-full" disabled={!!bwError} onClick={() => onFinish({ sessionRpe: rpe, bodyweightKg: bwNum, notes: notes.trim() || undefined })}>
          <CheckCircle2 className="h-5 w-5" /> Save workout
        </Button>
      </div>
    </Sheet>
  );
}

function Summary({ log, sum, onClose }: { log: WorkoutLog; sum: WorkoutSummary; onClose: () => void }) {
  return (
    <div className="space-y-5 pt-4 animate-fade-up">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent text-accent-fg glow"><CheckCircle2 className="h-8 w-8" /></div>
        <h1 className="mt-4 font-display text-4xl font-bold uppercase">Workout complete</h1>
        <p className="text-muted">{log.name}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["Duration", `${sum.durationMin}`, "min"],
          ["Volume", formatNumber(sum.volumeKg), "kg"],
          ["Sets", `${sum.sets}`, ""],
          ["Reps", `${sum.reps}`, ""],
        ].map(([l, v, u]) => (
          <Card key={l} className="p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted">{l}</div>
            <div className="font-display text-3xl font-bold tabular">{v}<span className="ml-1 text-sm text-muted">{u}</span></div>
          </Card>
        ))}
      </div>
      {sum.prs.length > 0 && (
        <Card className="card-gradient">
          <div className="mb-2 flex items-center gap-2 font-semibold"><Trophy className="h-5 w-5 text-warn" /> New personal records</div>
          <ul className="space-y-1.5">
            {sum.prs.map((p) => (
              <li key={p.exerciseId} className="flex justify-between text-sm">
                <span>{EXERCISE_MAP[p.exerciseId]?.name}</span>
                <span className="tabular text-accent">{Math.round(p.e1rm)} kg e1RM <span className="text-muted">(+{Math.round(p.e1rm - p.previous)})</span></span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="lg" asChild><Link href="/progress">View progress</Link></Button>
        <Button size="lg" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

function useElapsed(startIso: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (now - new Date(startIso).getTime()) / 1000;
}

/** Keep the screen awake during a session where supported. */
function useWakeLock() {
  useEffect(() => {
    type WL = { release: () => Promise<void> };
    let lock: WL | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WL> } };
    const req = () => nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    req();
    const onVis = () => document.visibilityState === "visible" && req();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, []);
}
