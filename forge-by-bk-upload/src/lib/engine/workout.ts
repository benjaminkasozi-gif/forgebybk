import { EXERCISE_MAP } from "./exercises";
import { prescriptionForWeek } from "./prescription";
import { e1rm, suggestLoad, warmupSets, workingSets } from "./progression";
import { newId } from "./random";
import type { LoggedExercise, LoggedSet, Program, ProgramSession, WorkoutLog } from "./types";

const now = () => new Date().toISOString();

function blankSet(type: LoggedSet["type"] = "working", weight: number | null = null, reps: number | null = null): LoggedSet {
  return { id: newId(), weight, reps, rir: null, done: false, type };
}

/** Start a workout from a program session, pre-filling suggested loads and target reps. */
export function startWorkoutFromSession(
  program: Program,
  session: ProgramSession,
  weekIndex: number,
  history: WorkoutLog[],
  oneRepMaxes: Record<string, number> = {},
): WorkoutLog {
  const week = program.weekPlans[weekIndex];
  const exercises: LoggedExercise[] = session.exercises.map((pe) => {
    const ex = EXERCISE_MAP[pe.exerciseId];
    const rx = prescriptionForWeek(pe.rx, pe.role, week);
    const sug = ex ? suggestLoad(ex, rx, history, oneRepMaxes, week) : null;
    const sets: LoggedSet[] = [];
    if (ex && pe.role === "primary" && sug?.weight) {
      for (const w of warmupSets(sug.weight, ex.increment)) sets.push(blankSet("warmup", w.weight, w.reps));
    }
    for (let i = 0; i < rx.sets; i++) {
      const s = blankSet("working", sug?.weight ?? null, rx.workSec ? null : sug?.reps ?? rx.repsMin);
      if (rx.workSec) s.seconds = rx.workSec;
      sets.push(s);
    }
    return { id: newId(), exerciseId: pe.exerciseId, rx, sets };
  });
  return {
    id: newId(),
    programId: program.id,
    sessionId: session.id,
    week: weekIndex,
    name: session.label,
    startedAt: now(),
    exercises,
    updatedAt: now(),
  };
}

export function startEmptyWorkout(name = "Quick Workout"): WorkoutLog {
  return { id: newId(), name, startedAt: now(), exercises: [], updatedAt: now() };
}

// ── Immutable edit helpers used by the live logger (every edit is autosaved) ──

function touch(w: WorkoutLog, exercises: LoggedExercise[]): WorkoutLog {
  return { ...w, exercises, updatedAt: now() };
}

function mapEx(w: WorkoutLog, exId: string, f: (e: LoggedExercise) => LoggedExercise): WorkoutLog {
  return touch(w, w.exercises.map((e) => (e.id === exId ? f(e) : e)));
}

export function addExercise(w: WorkoutLog, exerciseId: string, sets = 3): WorkoutLog {
  const le: LoggedExercise = { id: newId(), exerciseId, sets: Array.from({ length: sets }, () => blankSet()) };
  return touch(w, [...w.exercises, le]);
}

export function removeExercise(w: WorkoutLog, exId: string): WorkoutLog {
  return touch(w, w.exercises.filter((e) => e.id !== exId));
}

export function moveExercise(w: WorkoutLog, exId: string, dir: -1 | 1): WorkoutLog {
  const i = w.exercises.findIndex((e) => e.id === exId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= w.exercises.length) return w;
  const list = [...w.exercises];
  [list[i], list[j]] = [list[j], list[i]];
  return touch(w, list);
}

export function swapExercise(w: WorkoutLog, exId: string, newExerciseId: string): WorkoutLog {
  return mapEx(w, exId, (e) => ({ ...e, exerciseId: newExerciseId, sets: e.sets.filter((s) => s.type === "working").map((s) => ({ ...s, weight: null, done: false })) }));
}

export function addSet(w: WorkoutLog, exId: string): WorkoutLog {
  return mapEx(w, exId, (e) => {
    const last = [...e.sets].reverse().find((s) => s.type === "working");
    const s = blankSet("working", last?.weight ?? null, last?.reps ?? null);
    if (last?.seconds) s.seconds = last.seconds;
    return { ...e, sets: [...e.sets, s] };
  });
}

export function removeSet(w: WorkoutLog, exId: string, setId: string): WorkoutLog {
  return mapEx(w, exId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }));
}

export function updateSet(w: WorkoutLog, exId: string, setId: string, patch: Partial<LoggedSet>): WorkoutLog {
  return mapEx(w, exId, (e) => {
    const idx = e.sets.findIndex((s) => s.id === setId);
    if (idx < 0) return e;
    const sets = e.sets.map((s) => (s.id === setId ? sanitize({ ...s, ...patch }) : s));
    // Changing the weight on an unfinished set carries forward to later unfinished working sets.
    if (patch.weight !== undefined && !sets[idx].done) {
      for (let k = idx + 1; k < sets.length; k++) {
        if (!sets[k].done && sets[k].type === "working" && sets[idx].type === "working") sets[k] = { ...sets[k], weight: patch.weight };
      }
    }
    return { ...e, sets };
  });
}

function sanitize(s: LoggedSet): LoggedSet {
  const clamp = (v: number | null | undefined, max: number) => (v == null || Number.isNaN(v) ? null : Math.max(0, Math.min(max, v)));
  return { ...s, weight: clamp(s.weight, 1000), reps: clamp(s.reps, 200), rir: clamp(s.rir, 10), seconds: clamp(s.seconds ?? null, 3600) };
}

export function toggleSetDone(w: WorkoutLog, exId: string, setId: string): WorkoutLog {
  return mapEx(w, exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, done: !s.done, reps: s.reps ?? (s.seconds ? null : e.rx?.repsMin ?? null) } : s)) }));
}

export function setExerciseNotes(w: WorkoutLog, exId: string, notes: string): WorkoutLog {
  return mapEx(w, exId, (e) => ({ ...e, notes }));
}

export function finishWorkout(w: WorkoutLog, extras: Partial<Pick<WorkoutLog, "notes" | "sessionRpe" | "bodyweightKg">> = {}): WorkoutLog {
  // Unfinished sets are dropped so they don't distort volume or PRs.
  const exercises = w.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
    .filter((e) => e.sets.length > 0);
  return { ...w, ...extras, exercises, finishedAt: now(), updatedAt: now() };
}

// ── Summaries ─────────────────────────────────────────────────

export interface WorkoutSummary {
  durationMin: number;
  sets: number;
  reps: number;
  volumeKg: number;
  prs: { exerciseId: string; e1rm: number; previous: number }[];
}

export function workoutVolume(w: WorkoutLog): number {
  return w.exercises.reduce((sum, e) => sum + workingSets(e.sets).reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0), 0);
}

export function bestE1rm(w: WorkoutLog, exerciseId: string): number {
  let best = 0;
  for (const e of w.exercises) {
    if (e.exerciseId !== exerciseId) continue;
    for (const s of workingSets(e.sets)) if (s.weight && s.reps && s.reps <= 12) best = Math.max(best, e1rm(s.weight, s.reps, s.rir ?? 0));
  }
  return best;
}

export function summarize(w: WorkoutLog, history: WorkoutLog[]): WorkoutSummary {
  const end = w.finishedAt ? new Date(w.finishedAt) : new Date();
  const prior = history.filter((h) => h.id !== w.id && h.finishedAt && !h.deleted && h.startedAt < w.startedAt);
  const prs: WorkoutSummary["prs"] = [];
  const seen = new Set<string>();
  for (const e of w.exercises) {
    if (seen.has(e.exerciseId)) continue;
    seen.add(e.exerciseId);
    const now = bestE1rm(w, e.exerciseId);
    if (!now) continue;
    const previous = Math.max(0, ...prior.map((h) => bestE1rm(h, e.exerciseId)));
    if (previous > 0 && now > previous + 0.01) prs.push({ exerciseId: e.exerciseId, e1rm: now, previous });
  }
  const ws = w.exercises.flatMap((e) => workingSets(e.sets));
  return {
    durationMin: Math.max(1, Math.round((end.getTime() - new Date(w.startedAt).getTime()) / 60000)),
    sets: ws.length,
    reps: ws.reduce((a, s) => a + (s.reps ?? 0), 0),
    volumeKg: Math.round(workoutVolume(w)),
    prs,
  };
}

/** Which program session comes next: the first session not yet logged in the current program week. */
export function nextSession(program: Program, history: WorkoutLog[]): { session: ProgramSession; week: number } | null {
  if (!program.sessions.length) return null;
  const logs = history.filter((h) => h.programId === program.id && h.finishedAt && !h.deleted);
  const done = logs.length;
  const perWeek = program.sessions.length;
  const week = Math.min(program.weeks - 1, Math.floor(done / perWeek));
  const thisWeek = new Set(logs.filter((l) => l.week === week).map((l) => l.sessionId));
  const session = program.sessions.find((s) => !thisWeek.has(s.id)) ?? program.sessions[done % perWeek];
  return { session, week };
}
