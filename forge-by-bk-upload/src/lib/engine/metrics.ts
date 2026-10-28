import { EXERCISE_MAP } from "./exercises";
import { MUSCLE_TO_GROUP } from "./focus";
import { workingSets } from "./progression";
import { bestE1rm, workoutVolume } from "./workout";
import type { MuscleGroup, WorkoutLog } from "./types";

export function finished(history: WorkoutLog[]): WorkoutLog[] {
  return history.filter((w) => w.finishedAt && !w.deleted).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

/** Monday-based week key, e.g. "2026-10-26". */
export function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function e1rmSeries(history: WorkoutLog[], exerciseId: string): { date: string; e1rm: number; best: number }[] {
  let best = 0;
  return finished(history)
    .map((w) => ({ date: w.startedAt.slice(0, 10), e1rm: Math.round(bestE1rm(w, exerciseId) * 10) / 10 }))
    .filter((p) => p.e1rm > 0)
    .map((p) => ({ ...p, best: (best = Math.max(best, p.e1rm)) }));
}

export function weeklyVolumeSeries(history: WorkoutLog[], weeks = 12): { week: string; volume: number; sessions: number }[] {
  const map = new Map<string, { volume: number; sessions: number }>();
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    map.set(weekKey(d.toISOString()), { volume: 0, sessions: 0 });
  }
  for (const w of finished(history)) {
    const k = weekKey(w.startedAt);
    const row = map.get(k);
    if (!row) continue;
    row.volume += workoutVolume(w);
    row.sessions += 1;
  }
  return [...map.entries()].map(([week, v]) => ({ week, volume: Math.round(v.volume), sessions: v.sessions }));
}

export function setsByGroup(history: WorkoutLog[], sinceIso: string): Record<MuscleGroup, number> {
  const out: Record<MuscleGroup, number> = { chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0, quads: 0, hamstrings: 0, glutes: 0, calves: 0, core: 0 };
  for (const w of finished(history)) {
    if (w.startedAt < sinceIso) continue;
    for (const e of w.exercises) {
      const ex = EXERCISE_MAP[e.exerciseId];
      if (!ex) continue;
      const n = workingSets(e.sets).length;
      const groups = new Set(ex.primary.map((m) => MUSCLE_TO_GROUP[m]).filter(Boolean) as MuscleGroup[]);
      groups.forEach((g) => (out[g] += n));
    }
  }
  return out;
}

/** Consecutive weeks (including this one) with at least one finished workout. */
export function weekStreak(history: WorkoutLog[]): number {
  const weeks = new Set(finished(history).map((w) => weekKey(w.startedAt)));
  let streak = 0;
  const d = new Date();
  if (!weeks.has(weekKey(d.toISOString()))) d.setDate(d.getDate() - 7); // this week not started yet
  while (weeks.has(weekKey(d.toISOString()))) {
    streak++;
    d.setDate(d.getDate() - 7);
  }
  return streak;
}

export function trainedExercises(history: WorkoutLog[]): string[] {
  const count = new Map<string, number>();
  for (const w of finished(history)) for (const e of w.exercises) if (EXERCISE_MAP[e.exerciseId]?.loaded) count.set(e.exerciseId, (count.get(e.exerciseId) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

export function personalBests(history: WorkoutLog[], limit = 6): { exerciseId: string; e1rm: number; date: string }[] {
  const best = new Map<string, { e1rm: number; date: string }>();
  for (const w of finished(history)) {
    for (const e of w.exercises) {
      const v = bestE1rm(w, e.exerciseId);
      if (v > (best.get(e.exerciseId)?.e1rm ?? 0)) best.set(e.exerciseId, { e1rm: v, date: w.startedAt });
    }
  }
  return [...best.entries()].map(([exerciseId, v]) => ({ exerciseId, ...v })).sort((a, b) => b.e1rm - a.e1rm).slice(0, limit);
}
