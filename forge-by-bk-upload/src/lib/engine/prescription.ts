import type { Exercise, Experience, Prescription, SessionObjective, SlotRole, WeekPlan, MuscleGroup, ProgramGoal, Phase } from "./types";

type RxTable = Record<SlotRole, Prescription>;

/**
 * Base prescriptions by session objective and slot role.
 * Ranges follow common S&C guidance: strength 1–6 reps at long rests, hypertrophy 6–15 near failure,
 * power low reps with full recovery and maximal intent, endurance 15+ reps with short rests.
 */
const TABLE: Record<SessionObjective, RxTable> = {
  strength: {
    primary: { sets: 4, repsMin: 3, repsMax: 5, rir: 2, restSec: 210, intent: "Heavy, crisp reps" },
    secondary: { sets: 3, repsMin: 5, repsMax: 8, rir: 2, restSec: 150 },
    accessory: { sets: 3, repsMin: 8, repsMax: 12, rir: 2, restSec: 90 },
  },
  hypertrophy: {
    primary: { sets: 3, repsMin: 6, repsMax: 10, rir: 2, restSec: 150 },
    secondary: { sets: 3, repsMin: 8, repsMax: 12, rir: 2, restSec: 105 },
    accessory: { sets: 3, repsMin: 10, repsMax: 15, rir: 1, restSec: 75, tempo: "3-0-1-0" },
  },
  power: {
    primary: { sets: 5, repsMin: 2, repsMax: 3, rir: 4, restSec: 180, intent: "Maximal intent, stop if speed drops" },
    secondary: { sets: 3, repsMin: 3, repsMax: 5, rir: 2, restSec: 180 },
    accessory: { sets: 3, repsMin: 6, repsMax: 10, rir: 2, restSec: 90 },
  },
  endurance: {
    primary: { sets: 3, repsMin: 12, repsMax: 15, rir: 2, restSec: 75 },
    secondary: { sets: 3, repsMin: 15, repsMax: 20, rir: 2, restSec: 60 },
    accessory: { sets: 2, repsMin: 15, repsMax: 25, rir: 1, restSec: 45 },
  },
  conditioning: {
    primary: { sets: 4, repsMin: 8, repsMax: 12, rir: 3, restSec: 60 },
    secondary: { sets: 3, repsMin: 10, repsMax: 15, rir: 3, restSec: 45 },
    accessory: { sets: 3, repsMin: 12, repsMax: 15, rir: 2, restSec: 30 },
  },
  mixed: {
    primary: { sets: 4, repsMin: 4, repsMax: 6, rir: 2, restSec: 180 },
    secondary: { sets: 3, repsMin: 8, repsMax: 10, rir: 2, restSec: 120 },
    accessory: { sets: 3, repsMin: 10, repsMax: 15, rir: 1, restSec: 75 },
  },
};

export function basePrescription(ex: Exercise, role: SlotRole, objective: SessionObjective, experience: Experience): Prescription {
  // Explosive patterns always get power-style dosing regardless of the session objective.
  const explosive = ex.pattern === "jump" || ex.pattern === "throw" || ex.pattern === "olympic";
  if (explosive) {
    return { sets: experience === "beginner" ? 3 : 4, repsMin: ex.pattern === "olympic" ? 2 : 3, repsMax: ex.pattern === "olympic" ? 3 : 5, rir: 4, restSec: 120, intent: "Explode — quality over fatigue" };
  }
  if (ex.timed) return timedPrescription(ex, objective);

  const rx: Prescription = { ...TABLE[objective][role] };
  // Isolation lifts are never dosed for 3–5 rep strength work.
  if (ex.mechanics === "isolation" && rx.repsMax < 8) {
    rx.repsMin = 8;
    rx.repsMax = 12;
    rx.restSec = Math.min(rx.restSec, 90);
  }
  // High-skill, high-fatigue lifts are kept out of very high rep ranges.
  if (ex.fatigue === 3 && rx.repsMax > 12) {
    rx.repsMin = 8;
    rx.repsMax = 12;
  }
  if (experience === "beginner") {
    rx.sets = Math.max(2, rx.sets - (role === "primary" ? 1 : 0));
    rx.rir = Math.min(4, rx.rir + 1);
    if (rx.repsMax <= 5) {
      rx.repsMin = 5;
      rx.repsMax = 6; // novices learn technique with slightly higher reps
    }
  } else if (experience === "advanced" && role !== "primary") {
    rx.sets += 1;
  }
  return rx;
}

function timedPrescription(ex: Exercise, objective: SessionObjective): Prescription {
  if (ex.pattern === "conditioning") {
    const hard = objective === "conditioning" || objective === "endurance";
    return { sets: hard ? 8 : 6, repsMin: 1, repsMax: 1, rir: 2, workSec: hard ? 30 : 20, restSec: hard ? 30 : 40, intent: "Hard but repeatable efforts" };
  }
  if (ex.pattern === "carry") return { sets: 3, repsMin: 1, repsMax: 1, rir: 2, workSec: 40, restSec: 75 };
  return { sets: 3, repsMin: 1, repsMax: 1, rir: 2, workSec: 30, restSec: 45 };
}

/** Estimated session length in minutes, including a short warm-up. */
export function estimateMinutes(rxs: Prescription[]): number {
  let sec = 6 * 60;
  for (const rx of rxs) {
    const work = rx.workSec ?? ((rx.repsMin + rx.repsMax) / 2) * 3 + 5;
    sec += rx.sets * (work + rx.restSec) + 60;
  }
  return Math.round(sec / 60);
}

/** Weekly hard-set targets per muscle group by goal and experience (MEV–MRV style ranges). */
export function volumeTargets(goal: ProgramGoal, experience: Experience, recovery: number): Record<MuscleGroup, [number, number]> {
  const base: Record<Experience, [number, number]> =
    goal === "hypertrophy" || goal === "hybrid"
      ? { beginner: [8, 12], intermediate: [10, 18], advanced: [12, 22] }
      : goal === "strength" || goal === "power"
        ? { beginner: [5, 10], intermediate: [6, 14], advanced: [8, 16] }
        : { beginner: [5, 10], intermediate: [6, 14], advanced: [8, 16] };
  let [lo, hi] = base[experience];
  if (recovery <= 2) {
    lo = Math.round(lo * 0.85);
    hi = Math.round(hi * 0.85);
  }
  const t = (scale: number): [number, number] => [Math.max(2, Math.round(lo * scale)), Math.max(4, Math.round(hi * scale))];
  return {
    chest: t(1), back: t(1.1), shoulders: t(0.9), biceps: t(0.7), triceps: t(0.7),
    quads: t(1), hamstrings: t(0.8), glutes: t(0.8), calves: t(0.7), core: t(0.6),
  };
}

/**
 * Build the week-by-week periodisation plan.
 * Mesocycles end in a deload; strength/power programs of 6+ weeks finish with a peak week.
 */
export function buildWeekPlans(weeks: number, goal: ProgramGoal, experience: Experience, recovery: number): WeekPlan[] {
  const block = experience === "beginner" ? 6 : experience === "advanced" || recovery <= 2 ? 4 : 5;
  const peaks = (goal === "strength" || goal === "power" || goal === "athletic") && weeks >= 6;
  const plans: WeekPlan[] = [];
  let blockIndex = 0;
  let inBlock = 0;
  for (let i = 0; i < weeks; i++) {
    const isLast = i === weeks - 1;
    let phase: Phase;
    if (peaks && isLast) phase = "peak";
    else if (inBlock === block - 1 && !isLast && i > 0) phase = "deload";
    else phase = blockIndex > 0 && (goal === "strength" || goal === "power" || goal === "hybrid") ? "intensification" : "accumulation";

    const workWeeks = block - 1;
    const progress = workWeeks <= 1 ? 1 : Math.min(1, inBlock / (workWeeks - 1));
    const plan: WeekPlan = { index: i, phase, setDelta: 0, rirDelta: 0, repShift: 0, loadFactor: 1, note: "" };

    if (phase === "deload") {
      Object.assign(plan, { setDelta: -1, rirDelta: 2, loadFactor: 0.9, note: "Deload — ~40% fewer sets, lighter loads, leave plenty in the tank." });
    } else if (phase === "peak") {
      Object.assign(plan, { setDelta: -1, rirDelta: -1, repShift: -2, loadFactor: 1.05, note: "Peak — low volume, heavy singles to triples. Test a top set if you feel fresh." });
    } else {
      // RIR ramps from +1 at the start of a block to −1 at its hardest week.
      plan.rirDelta = Math.round(1 - 2 * progress);
      plan.setDelta = goal === "hypertrophy" || goal === "hybrid" || goal === "endurance" ? Math.round(progress * 1.4) : 0;
      plan.repShift = phase === "intensification" ? -1 : 0;
      plan.loadFactor = 1 + 0.025 * inBlock + (phase === "intensification" ? 0.025 : 0);
      plan.note =
        progress === 0
          ? phase === "intensification" ? "New block — heavier, slightly fewer reps." : "Intro week — find working weights, stay crisp."
          : progress >= 1
            ? "Overreach week — push close to failure on the last set."
            : "Build — add a rep or a little load from last week.";
    }
    plans.push(plan);
    inBlock++;
    if (phase === "deload") {
      inBlock = 0;
      blockIndex++;
    }
  }
  return plans;
}

/** Apply a week's periodisation to a base prescription. */
export function prescriptionForWeek(rx: Prescription, role: SlotRole, week: WeekPlan | undefined): Prescription {
  if (!week) return rx;
  const out = { ...rx };
  if (week.phase === "deload") {
    out.sets = Math.max(1, Math.round(rx.sets * 0.6));
  } else if (week.phase === "peak") {
    out.sets = Math.max(2, rx.sets - 1);
  } else if (role !== "primary" || week.setDelta < 0) {
    out.sets = Math.max(1, rx.sets + week.setDelta);
  }
  if (!rx.workSec) {
    out.repsMin = Math.max(1, rx.repsMin + week.repShift);
    out.repsMax = Math.max(out.repsMin, rx.repsMax + week.repShift);
  }
  out.rir = Math.max(0, Math.min(5, rx.rir + week.rirDelta));
  return out;
}

export const PHASE_LABEL: Record<Phase, string> = {
  accumulation: "Accumulation", intensification: "Intensification", peak: "Peak", deload: "Deload",
};
