import { describe, expect, it } from "vitest";
import { EXERCISE_MAP } from "@/lib/engine/exercises";
import { generateProgram } from "@/lib/engine/generator";
import { e1rm, loadFromOneRm, suggestLoad } from "@/lib/engine/progression";
import {
  addSet, finishWorkout, nextSession, removeSet, startEmptyWorkout, startWorkoutFromSession, summarize, swapExercise, toggleSetDone, updateSet, addExercise,
} from "@/lib/engine/workout";
import type { LoggedSet, Prescription, WorkoutLog } from "@/lib/engine/types";
import { day, profile } from "./fixtures";

const rx: Prescription = { sets: 3, repsMin: 8, repsMax: 12, rir: 2, restSec: 90 };

function logWith(exerciseId: string, sets: Partial<LoggedSet>[], daysAgo = 3): WorkoutLog {
  const d = new Date(Date.now() - daysAgo * 864e5).toISOString();
  return {
    id: `w${Math.random()}`, name: "t", startedAt: d, finishedAt: d, updatedAt: d,
    exercises: [{ id: "e", exerciseId, sets: sets.map((s, i) => ({ id: `s${i}`, weight: 60, reps: 10, rir: 2, done: true, type: "working", ...s })) }],
  };
}

describe("progression maths", () => {
  it("estimates 1RM with Epley and round-trips", () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 5)).toBeCloseTo(116.67, 1);
    expect(e1rm(100, 3, 2)).toBeCloseTo(e1rm(100, 5), 5);
    expect(loadFromOneRm(116.67, 5, 0)).toBe(100);
  });
});

describe("double progression", () => {
  const bench = EXERCISE_MAP["db_bench"];

  it("adds load when every set hits the top of the range", () => {
    const h = [logWith("db_bench", [{ reps: 12 }, { reps: 12 }, { reps: 12 }])];
    const s = suggestLoad(bench, rx, h);
    expect(s.kind).toBe("increase");
    expect(s.weight).toBe(62);
    expect(s.reps).toBe(8);
  });

  it("holds load and adds a rep when inside the range", () => {
    const s = suggestLoad(bench, rx, [logWith("db_bench", [{ reps: 10 }, { reps: 9 }, { reps: 9 }])]);
    expect(s.kind).toBe("hold");
    expect(s.weight).toBe(60);
    expect(s.reps).toBe(10);
  });

  it("reduces load after clear misses", () => {
    const s = suggestLoad(bench, rx, [logWith("db_bench", [{ reps: 6 }, { reps: 5 }, { reps: 8 }])]);
    expect(s.kind).toBe("decrease");
    expect(s.weight).toBeLessThan(60);
  });

  it("uses the most recent session only", () => {
    const old = logWith("db_bench", [{ reps: 12 }, { reps: 12 }, { reps: 12 }], 10);
    const recent = logWith("db_bench", [{ weight: 70, reps: 8 }, { weight: 70, reps: 8 }, { weight: 70, reps: 8 }], 2);
    expect(suggestLoad(bench, rx, [old, recent]).weight).toBe(70);
  });

  it("seeds a first session from a known 1RM", () => {
    const s = suggestLoad(EXERCISE_MAP["back_squat"], { sets: 4, repsMin: 3, repsMax: 5, rir: 2, restSec: 180 }, [], { back_squat: 140 });
    expect(s.kind).toBe("start");
    expect(s.weight).toBe(112.5);
  });
});

describe("workout logging", () => {
  const p = profile();
  const prog = generateProgram({ profile: p, goal: "strength", weeks: 6, seed: 3, days: [day(["lower"], "strength"), day(["upper"], "strength")] });

  it("starts a session with prescribed sets and warm-ups for heavy primaries", () => {
    const w = startWorkoutFromSession(prog, prog.sessions[0], 0, [], { back_squat: 150, trap_bar_deadlift: 180, deadlift: 180 });
    expect(w.exercises).toHaveLength(prog.sessions[0].exercises.length);
    const first = w.exercises[0];
    expect(first.sets.filter((s) => s.type === "working")).toHaveLength(first.rx!.sets);
  });

  it("edits, completes, and finishes a workout, dropping unfinished sets", () => {
    let w = addExercise(startEmptyWorkout(), "db_bench", 2);
    const exId = w.exercises[0].id;
    const [s1, s2] = w.exercises[0].sets;
    w = updateSet(w, exId, s1.id, { weight: 30 });
    expect(w.exercises[0].sets[1].weight).toBe(30); // carried forward
    w = updateSet(w, exId, s1.id, { reps: 10, rir: 2 });
    w = toggleSetDone(w, exId, s1.id);
    w = addSet(w, exId);
    expect(w.exercises[0].sets).toHaveLength(3);
    w = removeSet(w, exId, s2.id);
    expect(w.exercises[0].sets).toHaveLength(2);
    const done = finishWorkout(w);
    expect(done.finishedAt).toBeDefined();
    expect(done.exercises[0].sets).toHaveLength(1);
  });

  it("clamps invalid input", () => {
    let w = addExercise(startEmptyWorkout(), "db_bench", 1);
    const e = w.exercises[0];
    w = updateSet(w, e.id, e.sets[0].id, { weight: -5, reps: 9999 });
    expect(w.exercises[0].sets[0].weight).toBe(0);
    expect(w.exercises[0].sets[0].reps).toBe(200);
  });

  it("swaps an exercise and resets loads", () => {
    let w = addExercise(startEmptyWorkout(), "bb_bench", 2);
    w = updateSet(w, w.exercises[0].id, w.exercises[0].sets[0].id, { weight: 100 });
    w = swapExercise(w, w.exercises[0].id, "db_bench");
    expect(w.exercises[0].exerciseId).toBe("db_bench");
    expect(w.exercises[0].sets.every((s) => s.weight === null)).toBe(true);
  });

  it("detects PRs in the summary", () => {
    const prev = logWith("db_bench", [{ weight: 30, reps: 10 }], 5);
    const now = finishWorkout({ ...logWith("db_bench", [{ weight: 32, reps: 10 }], 0), finishedAt: undefined });
    const sum = summarize(now, [prev]);
    expect(sum.prs).toHaveLength(1);
    expect(sum.volumeKg).toBe(320);
  });

  it("advances to the next unlogged session", () => {
    const first = nextSession(prog, []);
    expect(first?.session.id).toBe(prog.sessions[0].id);
    const log = finishWorkout({ ...startWorkoutFromSession(prog, prog.sessions[0], 0, []), exercises: [] });
    const second = nextSession(prog, [log]);
    expect(second?.session.id).toBe(prog.sessions[1].id);
    expect(second?.week).toBe(0);
  });
});
