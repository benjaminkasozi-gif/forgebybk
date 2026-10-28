import { describe, expect, it } from "vitest";
import { EXERCISE_MAP, EXERCISES } from "@/lib/engine/exercises";
import { MUSCLE_TO_GROUP, ENVIRONMENT_EQUIPMENT } from "@/lib/engine/focus";
import { alternatives, eligibleExercises, generateProgram, regenerateSession, suggestSplit, weeklySets } from "@/lib/engine/generator";
import { buildWeekPlans, prescriptionForWeek } from "@/lib/engine/prescription";
import type { MuscleGroup, ProgramSession } from "@/lib/engine/types";
import { day, profile } from "./fixtures";

const groupsHit = (s: ProgramSession) =>
  new Set(s.exercises.flatMap((pe) => EXERCISE_MAP[pe.exerciseId].primary.map((m) => MUSCLE_TO_GROUP[m])).filter(Boolean) as MuscleGroup[]);

describe("exercise library", () => {
  it("has unique ids and valid data", () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(EXERCISES.length).toBeGreaterThan(100);
    for (const e of EXERCISES) {
      expect(e.primary.length).toBeGreaterThan(0);
      expect(e.equipment.length).toBeGreaterThan(0);
    }
  });
});

describe("generateProgram — custom day focuses", () => {
  const p = profile();

  it("builds each session around the exact focus chosen", () => {
    const prog = generateProgram({
      profile: p, goal: "hypertrophy", weeks: 8, seed: 1,
      days: [day(["chest", "triceps"], "hypertrophy", 0), day(["back", "biceps"], "hypertrophy", 1), day(["lower"], "strength", 2), day(["shoulders", "arms"], "hypertrophy", 3), day(["full_body"], "mixed", 4)],
    });
    expect(prog.sessions).toHaveLength(5);

    const [ct, bb, lower, sa] = prog.sessions;
    expect([...groupsHit(ct)].every((g) => g === "chest" || g === "triceps" || g === "shoulders")).toBe(true);
    expect(groupsHit(ct).has("chest") && groupsHit(ct).has("triceps")).toBe(true);
    expect(groupsHit(bb).has("back") && groupsHit(bb).has("biceps")).toBe(true);
    expect(groupsHit(bb).has("chest")).toBe(false);
    expect(groupsHit(lower).has("chest")).toBe(false);
    expect(groupsHit(lower).has("quads") && groupsHit(lower).has("hamstrings")).toBe(true);
    expect(groupsHit(sa).has("biceps") && groupsHit(sa).has("triceps") && groupsHit(sa).has("shoulders")).toBe(true);
  });

  it("applies per-session objectives (strength lower, hypertrophy upper)", () => {
    const prog = generateProgram({ profile: p, goal: "hybrid", weeks: 6, seed: 2, days: [day(["lower"], "strength"), day(["upper"], "hypertrophy")] });
    const [lower, upper] = prog.sessions;
    const lowerPrimary = lower.exercises.find((e) => e.role === "primary")!;
    expect(lowerPrimary.rx.repsMax).toBeLessThanOrEqual(6);
    expect(lowerPrimary.rx.restSec).toBeGreaterThanOrEqual(180);
    const upperAcc = upper.exercises.filter((e) => e.role === "accessory");
    expect(upperAcc.length).toBeGreaterThan(0);
    for (const a of upperAcc) expect(a.rx.repsMax).toBeGreaterThanOrEqual(10);
  });

  it("orders compounds before isolation work", () => {
    const prog = generateProgram({ profile: p, goal: "hypertrophy", weeks: 4, seed: 3, days: [day(["push"], "hypertrophy")] });
    const mech = prog.sessions[0].exercises.map((pe) => EXERCISE_MAP[pe.exerciseId].mechanics);
    const firstIso = mech.indexOf("isolation");
    expect(firstIso).toBeGreaterThan(0);
    expect(mech.slice(firstIso).includes("compound")).toBe(false);
  });

  it("never repeats an exercise within a session", () => {
    for (let seed = 0; seed < 20; seed++) {
      const prog = generateProgram({ profile: p, goal: "hypertrophy", weeks: 4, seed, days: [day(["arms"], "hypertrophy"), day(["full_body"], "mixed")] });
      for (const s of prog.sessions) {
        const ids = s.exercises.map((e) => e.exerciseId);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it("is deterministic for a given seed", () => {
    const input = { profile: p, goal: "strength" as const, weeks: 8, days: [day(["upper"], "strength"), day(["lower"], "strength")], seed: 42 };
    const a = generateProgram(input).sessions.map((s) => s.exercises.map((e) => e.exerciseId));
    const b = generateProgram(input).sessions.map((s) => s.exercises.map((e) => e.exerciseId));
    expect(a).toEqual(b);
  });

  it("supports 1 to 7 sessions and rejects invalid input", () => {
    for (let n = 1; n <= 7; n++) {
      const prog = generateProgram({ profile: p, goal: "general_fitness", weeks: 4, seed: n, days: suggestSplit("general_fitness", n) });
      expect(prog.sessions).toHaveLength(n);
      for (const s of prog.sessions) expect(s.exercises.length).toBeGreaterThanOrEqual(3);
    }
    expect(() => generateProgram({ profile: p, goal: "strength", weeks: 4, days: [] })).toThrow();
    expect(() => generateProgram({ profile: p, goal: "strength", weeks: 0, days: [day(["upper"], "strength")] })).toThrow();
  });

  it("respects the session time budget", () => {
    const short = generateProgram({ profile: profile({ sessionMinutes: 30 }), goal: "hypertrophy", weeks: 4, seed: 5, days: [day(["full_body"], "hypertrophy")] });
    const long = generateProgram({ profile: profile({ sessionMinutes: 90 }), goal: "hypertrophy", weeks: 4, seed: 5, days: [day(["full_body"], "hypertrophy")] });
    expect(short.sessions[0].exercises.length).toBeLessThan(long.sessions[0].exercises.length);
    expect(long.sessions[0].estMinutes).toBeLessThanOrEqual(100);
  });

  it("adds power and conditioning work when chosen", () => {
    const prog = generateProgram({ profile: p, goal: "athletic", weeks: 6, seed: 9, days: [day(["power"], "power"), day(["conditioning"], "conditioning")] });
    const patterns0 = prog.sessions[0].exercises.map((e) => EXERCISE_MAP[e.exerciseId].pattern);
    expect(patterns0.some((x) => x === "jump" || x === "throw" || x === "olympic")).toBe(true);
    expect(["jump", "throw", "olympic"]).toContain(patterns0[0]); // explosive work comes first
    const patterns1 = prog.sessions[1].exercises.map((e) => EXERCISE_MAP[e.exerciseId].pattern);
    expect(patterns1).toContain("conditioning");
  });
});

describe("profile constraints", () => {
  it("only uses available equipment", () => {
    const p = profile({ environment: "bodyweight", equipment: ENVIRONMENT_EQUIPMENT.bodyweight });
    const prog = generateProgram({ profile: p, goal: "general_fitness", weeks: 4, seed: 1, days: [day(["full_body"], "mixed"), day(["upper"], "hypertrophy")] });
    const kit = new Set(p.equipment);
    for (const s of prog.sessions) for (const pe of s.exercises) for (const q of EXERCISE_MAP[pe.exerciseId].equipment) expect(kit.has(q)).toBe(true);
  });

  it("excludes exercises that heavily load an injured joint", () => {
    const p = profile({ injuries: ["lower_back", "shoulder"] });
    for (const e of eligibleExercises(p)) {
      expect(e.stress.lower_back ?? 0).toBeLessThan(2);
      expect(e.stress.shoulder ?? 0).toBeLessThan(2);
    }
    const prog = generateProgram({ profile: p, goal: "strength", weeks: 4, seed: 1, days: [day(["lower"], "strength")] });
    expect(prog.sessions[0].exercises.map((e) => e.exerciseId)).not.toContain("deadlift");
  });

  it("never selects disliked exercises and favours preferred ones", () => {
    const p = profile({ dislikedExercises: ["back_squat", "leg_press"], preferredExercises: ["hip_thrust"] });
    const prog = generateProgram({ profile: p, goal: "hypertrophy", weeks: 4, seed: 1, days: [day(["legs"], "hypertrophy")] });
    const ids = prog.sessions[0].exercises.map((e) => e.exerciseId);
    expect(ids).not.toContain("back_squat");
    expect(ids).not.toContain("leg_press");
    expect(ids).toContain("hip_thrust");
  });

  it("keeps beginners away from the most technical lifts", () => {
    const p = profile({ experience: "beginner" });
    expect(eligibleExercises(p).some((e) => e.difficulty === 3)).toBe(false);
  });
});

describe("weekly volume", () => {
  it("keeps trained groups inside their target range where possible", () => {
    const prog = generateProgram({ profile: profile(), goal: "hypertrophy", weeks: 8, seed: 11, days: suggestSplit("hypertrophy", 4) });
    const ok = prog.volumeReport.filter((r) => r.status === "ok").length;
    expect(ok / prog.volumeReport.length).toBeGreaterThanOrEqual(0.6);
    for (const r of prog.volumeReport) expect(r.sets).toBeGreaterThanOrEqual(r.min * 0.5);
    const vol = weeklySets(prog.sessions);
    expect(vol.chest).toBeGreaterThan(0);
  });
});

describe("periodisation", () => {
  it("schedules deloads and a peak week for strength", () => {
    const weeks = buildWeekPlans(10, "strength", "intermediate", 3);
    expect(weeks).toHaveLength(10);
    expect(weeks[0].phase).toBe("accumulation");
    expect(weeks.filter((w) => w.phase === "deload").length).toBeGreaterThanOrEqual(1);
    expect(weeks[9].phase).toBe("peak");
    expect(weeks[4].phase).toBe("deload");
  });

  it("deload weeks cut volume and raise RIR", () => {
    const weeks = buildWeekPlans(8, "hypertrophy", "intermediate", 3);
    const deload = weeks.find((w) => w.phase === "deload")!;
    const rx = { sets: 4, repsMin: 8, repsMax: 12, rir: 2, restSec: 90 };
    const d = prescriptionForWeek(rx, "secondary", deload);
    expect(d.sets).toBeLessThan(4);
    expect(d.rir).toBeGreaterThan(2);
  });

  it("ramps effort across a block", () => {
    const weeks = buildWeekPlans(5, "hypertrophy", "intermediate", 3);
    expect(weeks[0].rirDelta).toBeGreaterThan(weeks[3].rirDelta);
  });
});

describe("editing", () => {
  it("regenerates one day without reusing other days' exercises where avoidable", () => {
    const p = profile();
    const prog = generateProgram({ profile: p, goal: "hypertrophy", weeks: 4, seed: 7, days: [day(["chest"], "hypertrophy"), day(["back"], "hypertrophy")] });
    const s = regenerateSession(prog, prog.sessions[1].id, day(["chest"], "hypertrophy"), p, 99);
    const used = new Set(prog.sessions[0].exercises.map((e) => e.exerciseId));
    const overlap = s.exercises.filter((e) => used.has(e.exerciseId)).length;
    expect(overlap).toBeLessThan(s.exercises.length);
  });

  it("offers alternatives with the same pattern first", () => {
    const alts = alternatives("bb_bench", profile());
    expect(alts.length).toBeGreaterThan(2);
    expect(alts[0].pattern).toBe("horizontal_push");
  });
});
