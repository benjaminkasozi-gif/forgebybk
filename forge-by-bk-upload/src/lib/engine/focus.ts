import type { FocusId, Muscle, MuscleGroup, Pattern, SessionObjective, ProgramGoal, Environment, Equipment } from "./types";

/** Volume-accounting groups plus the two "quality" groups the engine can schedule. */
export type SlotGroup = MuscleGroup | "power" | "conditioning";

export interface SlotTemplate {
  group: SlotGroup;
  /** Acceptable movement patterns in order of preference. */
  patterns: Pattern[];
  /** Muscles the chosen exercise should hit as a primary mover. */
  muscles?: Muscle[];
}

/** Ordered slot templates per group — the engine takes them first-to-last as a group earns more slots. */
export const GROUP_SLOTS: Record<SlotGroup, SlotTemplate[]> = {
  chest: [
    { group: "chest", patterns: ["horizontal_push"] },
    { group: "chest", patterns: ["incline_push", "horizontal_push"] },
    { group: "chest", patterns: ["chest_fly"] },
    { group: "chest", patterns: ["chest_fly", "incline_push"] },
  ],
  back: [
    { group: "back", patterns: ["vertical_pull"] },
    { group: "back", patterns: ["horizontal_pull"] },
    { group: "back", patterns: ["horizontal_pull", "pullover"], muscles: ["upper_back"] },
    { group: "back", patterns: ["pullover", "rear_delt", "shrug"] },
  ],
  shoulders: [
    { group: "shoulders", patterns: ["vertical_push"] },
    { group: "shoulders", patterns: ["lateral_raise"] },
    { group: "shoulders", patterns: ["rear_delt"] },
    { group: "shoulders", patterns: ["lateral_raise"] },
  ],
  biceps: [
    { group: "biceps", patterns: ["elbow_flexion"] },
    { group: "biceps", patterns: ["elbow_flexion"] },
  ],
  triceps: [
    { group: "triceps", patterns: ["elbow_extension"] },
    { group: "triceps", patterns: ["elbow_extension"] },
  ],
  quads: [
    { group: "quads", patterns: ["squat"] },
    { group: "quads", patterns: ["lunge", "squat"] },
    { group: "quads", patterns: ["knee_extension"] },
  ],
  hamstrings: [
    { group: "hamstrings", patterns: ["hinge"] },
    { group: "hamstrings", patterns: ["knee_flexion"] },
    { group: "hamstrings", patterns: ["knee_flexion", "hinge"] },
  ],
  glutes: [
    { group: "glutes", patterns: ["hip_extension"] },
    { group: "glutes", patterns: ["lunge", "hip_extension"] },
    { group: "glutes", patterns: ["hip_abduction"] },
  ],
  calves: [
    { group: "calves", patterns: ["calf_raise"] },
    { group: "calves", patterns: ["calf_raise"] },
  ],
  core: [
    { group: "core", patterns: ["anti_extension", "trunk_flexion"] },
    { group: "core", patterns: ["rotation", "carry"] },
    { group: "core", patterns: ["trunk_flexion", "anti_extension"] },
  ],
  power: [
    { group: "power", patterns: ["jump"] },
    { group: "power", patterns: ["olympic", "throw"] },
    { group: "power", patterns: ["throw", "jump"] },
  ],
  conditioning: [
    { group: "conditioning", patterns: ["conditioning"] },
    { group: "conditioning", patterns: ["carry", "conditioning"] },
    { group: "conditioning", patterns: ["conditioning"] },
  ],
};

type Weights = Partial<Record<SlotGroup, number>>;

const FULL_BODY: Weights = { quads: 1, chest: 1, back: 1.05, hamstrings: 0.85, shoulders: 0.45, glutes: 0.35, core: 0.3, biceps: 0.2, triceps: 0.2 };

export const FOCUS_WEIGHTS: Record<FocusId, Weights> = {
  full_body: FULL_BODY,
  upper: { back: 1.3, chest: 1, shoulders: 0.6, biceps: 0.35, triceps: 0.35 },
  lower: { quads: 1, hamstrings: 0.95, glutes: 0.6, calves: 0.4, core: 0.35 },
  push: { chest: 1, shoulders: 0.85, triceps: 0.6 },
  pull: { back: 1.2, biceps: 0.65, core: 0.2 },
  legs: { quads: 1, hamstrings: 0.9, glutes: 0.6, calves: 0.5 },
  chest: { chest: 1 },
  back: { back: 1 },
  shoulders: { shoulders: 1 },
  biceps: { biceps: 1 },
  triceps: { triceps: 1 },
  arms: { biceps: 1, triceps: 1 },
  glutes: { glutes: 1, hamstrings: 0.3 },
  quads: { quads: 1 },
  hamstrings: { hamstrings: 1 },
  calves: { calves: 1 },
  core: { core: 1 },
  strength: { quads: 1, chest: 1, hamstrings: 0.95, back: 1, shoulders: 0.4 },
  power: { power: 1.2 },
  conditioning: { conditioning: 1.2, core: 0.3 },
  sport: { power: 0.8, ...scale(FULL_BODY, 0.75), core: 0.55 },
};

function scale(w: Weights, k: number): Weights {
  return Object.fromEntries(Object.entries(w).map(([g, v]) => [g, (v ?? 0) * k])) as Weights;
}

/** Sport keywords tilt "sport-specific" sessions toward their demands. */
const SPORT_TILTS: { match: RegExp; weights: Weights }[] = [
  { match: /run|soccer|football|rugby|afl|sprint|hockey|track/i, weights: { hamstrings: 0.4, calves: 0.4, glutes: 0.3, power: 0.3 } },
  { match: /swim|tennis|cricket|baseball|softball|volley|padel|squash|golf|throw/i, weights: { shoulders: 0.4, back: 0.3, core: 0.3 } },
  { match: /basketball|netball|volley|jump/i, weights: { power: 0.4, calves: 0.3, quads: 0.2 } },
  { match: /box|mma|martial|bjj|jiu|wrestl|judo/i, weights: { core: 0.4, back: 0.3, conditioning: 0.5 } },
  { match: /cycl|bike|row|triathlon/i, weights: { quads: 0.3, glutes: 0.3, core: 0.3, back: 0.2 } },
];

/**
 * Combine the selected focuses for a day into slot-group weights.
 * Combinations take the max weight per group so "Chest + Triceps" is not double-counted on overlap.
 */
export function focusWeights(focuses: FocusId[], sport?: string): Weights {
  const out: Weights = {};
  const modifiersOnly = focuses.every((f) => f === "power" || f === "conditioning" || f === "strength");
  const list: FocusId[] = focuses.length ? [...focuses] : ["full_body"];
  // "Power" or "Conditioning" alone still needs some general strength work around it.
  if (modifiersOnly && !list.includes("strength")) list.push("full_body");
  for (const f of list) {
    let w = FOCUS_WEIGHTS[f];
    if (modifiersOnly && f === "full_body") w = scale(w, 0.7);
    for (const [g, v] of Object.entries(w)) {
      const key = g as SlotGroup;
      out[key] = Math.max(out[key] ?? 0, v ?? 0);
    }
  }
  if (focuses.includes("sport") && sport) {
    for (const t of SPORT_TILTS) {
      if (!t.match.test(sport)) continue;
      for (const [g, v] of Object.entries(t.weights)) {
        const key = g as SlotGroup;
        out[key] = (out[key] ?? 0) + (v ?? 0);
      }
    }
  }
  return out;
}

export const MUSCLE_TO_GROUP: Record<Muscle, MuscleGroup | null> = {
  chest: "chest", lats: "back", upper_back: "back", traps: "back", front_delts: "shoulders", side_delts: "shoulders",
  rear_delts: "shoulders", biceps: "biceps", triceps: "triceps", forearms: null, quads: "quads", hamstrings: "hamstrings",
  glutes: "glutes", adductors: null, calves: "calves", abs: "core", obliques: "core", lower_back: null,
};

export const FOCUS_LABEL: Record<FocusId, string> = {
  full_body: "Full Body", upper: "Upper Body", lower: "Lower Body", push: "Push", pull: "Pull", legs: "Legs",
  chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Biceps", triceps: "Triceps", arms: "Arms",
  glutes: "Glutes", quads: "Quads", hamstrings: "Hamstrings", calves: "Calves", core: "Core",
  strength: "Strength", power: "Power", conditioning: "Conditioning", sport: "Sport-Specific",
};

export const FOCUS_GROUPS: { title: string; items: FocusId[] }[] = [
  { title: "Splits", items: ["full_body", "upper", "lower", "push", "pull", "legs"] },
  { title: "Muscles", items: ["chest", "back", "shoulders", "arms", "biceps", "triceps", "glutes", "quads", "hamstrings", "calves", "core"] },
  { title: "Qualities", items: ["strength", "power", "conditioning", "sport"] },
];

export const OBJECTIVE_LABEL: Record<SessionObjective, string> = {
  hypertrophy: "Hypertrophy", strength: "Strength", power: "Power", endurance: "Muscular Endurance",
  conditioning: "Conditioning", mixed: "Mixed",
};

export const GOAL_LABEL: Record<ProgramGoal, string> = {
  hypertrophy: "Hypertrophy", strength: "Strength", power: "Power", athletic: "Athletic Performance",
  endurance: "Muscular Endurance", general_fitness: "General Fitness", hybrid: "Hybrid Strength + Size", custom: "Custom",
};

export const GOAL_DEFAULT_OBJECTIVE: Record<ProgramGoal, SessionObjective> = {
  hypertrophy: "hypertrophy", strength: "strength", power: "power", athletic: "mixed", endurance: "endurance",
  general_fitness: "mixed", hybrid: "mixed", custom: "mixed",
};

export const ENVIRONMENT_EQUIPMENT: Record<Environment, Equipment[]> = {
  commercial_gym: ["barbell", "dumbbell", "kettlebell", "cable", "machine", "smith", "bench", "rack", "pullup_bar", "dip_station", "bands", "trap_bar", "landmine", "sled", "medball", "box", "cardio_machine", "bodyweight"],
  home_gym: ["barbell", "dumbbell", "kettlebell", "bench", "rack", "pullup_bar", "bands", "box", "bodyweight"],
  minimal: ["dumbbell", "kettlebell", "bands", "bench", "pullup_bar", "bodyweight"],
  bodyweight: ["bodyweight", "pullup_bar", "bands"],
};

export const ENVIRONMENT_LABEL: Record<Environment, string> = {
  commercial_gym: "Commercial gym", home_gym: "Home gym", minimal: "Dumbbells & bands", bodyweight: "Bodyweight only",
};
