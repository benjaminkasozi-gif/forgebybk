import type { Exercise, LoggedSet, Prescription, WorkoutLog, WeekPlan } from "./types";

/** Estimated 1RM (Epley), counting reps left in reserve as reps that could have been done. */
export function e1rm(weight: number, reps: number, rir = 0): number {
  if (weight <= 0 || reps <= 0) return 0;
  const total = reps + Math.max(0, rir);
  if (total === 1) return weight;
  return weight * (1 + total / 30);
}

/** Load that should allow `reps` with `rir` in reserve for a given 1RM. */
export function loadFromOneRm(oneRm: number, reps: number, rir: number, increment = 2.5): number {
  return roundTo(oneRm / (1 + (reps + rir) / 30), increment);
}

export function roundTo(x: number, step: number): number {
  if (step <= 0) return Math.round(x * 10) / 10;
  return Math.round(Math.round(x / step) * step * 100) / 100;
}

export interface Suggestion {
  weight: number | null;
  reps: number;
  reason: string;
  kind: "increase" | "hold" | "decrease" | "start" | "reps";
}

export function workingSets(sets: LoggedSet[]): LoggedSet[] {
  return sets.filter((s) => s.type === "working" && s.done && (s.reps ?? 0) > 0);
}

/** The most recent finished workout containing this exercise, and its working sets. */
export function lastPerformance(exerciseId: string, history: WorkoutLog[], beforeIso?: string): { log: WorkoutLog; sets: LoggedSet[] } | null {
  const sorted = history
    .filter((w) => w.finishedAt && !w.deleted && (!beforeIso || w.startedAt < beforeIso))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const log of sorted) {
    const le = log.exercises.find((e) => e.exerciseId === exerciseId);
    if (!le) continue;
    const sets = workingSets(le.sets);
    if (sets.length) return { log, sets };
  }
  return null;
}

/**
 * Double progression: work within the rep range at the target effort; once every working set
 * reaches the top of the range, add the smallest load increment and restart at the bottom.
 * Clear misses (most sets below the range) trigger a ~5% reduction.
 */
export function suggestLoad(
  ex: Exercise,
  rx: Prescription,
  history: WorkoutLog[],
  oneRepMaxes: Record<string, number> = {},
  week?: WeekPlan,
): Suggestion {
  const last = lastPerformance(ex.id, history);
  const factor = week?.phase === "deload" ? 0.9 : 1;

  if (!last) {
    const orm = oneRepMaxes[ex.id];
    if (orm && ex.loaded) {
      return { weight: roundTo(loadFromOneRm(orm, rx.repsMax, rx.rir, ex.increment) * factor, ex.increment), reps: rx.repsMax, reason: "From your entered 1RM", kind: "start" };
    }
    return { weight: null, reps: rx.repsMin, reason: ex.loaded ? "First time — pick a weight you could lift for a few more reps" : "First time — focus on form", kind: "start" };
  }

  const sets = last.sets;
  const top = Math.max(...sets.map((s) => s.weight ?? 0));
  const atTop = sets.filter((s) => (s.weight ?? 0) === top);
  const allHitTop = atTop.length >= Math.min(rx.sets, sets.length) && atTop.every((s) => (s.reps ?? 0) >= rx.repsMax && (s.rir == null || s.rir >= rx.rir - 1));
  const misses = sets.filter((s) => (s.reps ?? 0) < rx.repsMin).length;

  if (!ex.loaded || top === 0) {
    const best = Math.max(...sets.map((s) => s.reps ?? 0));
    if (best >= rx.repsMax) return { weight: null, reps: best + 1, reason: "Top of the range — add a rep, slow the tempo or add load", kind: "reps" };
    return { weight: null, reps: Math.min(rx.repsMax, best + 1), reason: "Beat last time by one rep", kind: "reps" };
  }

  if (allHitTop) {
    return { weight: roundTo((top + ex.increment) * factor, ex.increment), reps: rx.repsMin, reason: `Hit ${rx.repsMax} on every set — add ${ex.increment} kg`, kind: "increase" };
  }
  if (misses >= Math.ceil(sets.length / 2)) {
    return { weight: roundTo(top * 0.95 * factor, ex.increment), reps: rx.repsMin, reason: "Missed the range last time — drop ~5% and rebuild", kind: "decrease" };
  }
  const avgReps = Math.round(atTop.reduce((a, s) => a + (s.reps ?? 0), 0) / atTop.length);
  return {
    weight: roundTo(top * factor, ex.increment),
    reps: Math.min(rx.repsMax, Math.max(rx.repsMin, avgReps + 1)),
    reason: factor < 1 ? "Deload — lighter load, same quality" : "Same load — add a rep on each set",
    kind: "hold",
  };
}

/** Warm-up ramp for heavy compound lifts. */
export function warmupSets(workWeight: number, increment: number): { weight: number; reps: number }[] {
  if (workWeight < 40) return [];
  const steps = workWeight >= 100 ? [0.4, 0.6, 0.8] : [0.5, 0.75];
  const reps = workWeight >= 100 ? [5, 3, 2] : [5, 3];
  return steps.map((p, i) => ({ weight: Math.max(20, roundTo(workWeight * p, increment)), reps: reps[i] }));
}
