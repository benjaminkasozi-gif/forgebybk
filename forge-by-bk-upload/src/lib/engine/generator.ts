import { EXERCISES, EXERCISE_MAP } from "./exercises";
import { focusWeights, GROUP_SLOTS, MUSCLE_TO_GROUP, FOCUS_LABEL, GOAL_DEFAULT_OBJECTIVE, type SlotGroup, type SlotTemplate } from "./focus";
import { basePrescription, buildWeekPlans, estimateMinutes, volumeTargets } from "./prescription";
import { mulberry32, uid } from "./random";
import type {
  AthleteProfile, DayPlan, Exercise, FocusId, MuscleGroup, Program, ProgramExercise, ProgramGoal,
  ProgramSession, SessionObjective, SlotRole, VolumeReportRow, Weekday,
} from "./types";

export interface GenerateInput {
  profile: AthleteProfile;
  goal: ProgramGoal;
  customGoal?: string;
  weeks: number;
  days: DayPlan[];
  name?: string;
  seed?: number;
}

interface Ctx {
  profile: AthleteProfile;
  rand: () => number;
  /** exerciseId → number of times already used elsewhere in the week (for variety). */
  usage: Map<string, number>;
}

const BIG_GROUPS = new Set<SlotGroup>(["chest", "back", "shoulders", "quads", "hamstrings", "glutes"]);
/** Regressions that only make sense for novices. */
const NOVICE_REGRESSIONS = new Set(["assisted_pullup", "bw_squat", "bench_dip", "band_pulldown"]);
/** Tie-break order among compounds: big lower-body lifts first, then presses and pulls. */
const PATTERN_ORDER: Partial<Record<string, number>> = {
  squat: 0, hinge: 0.1, horizontal_push: 0.2, vertical_pull: 0.25, horizontal_pull: 0.3, incline_push: 0.35,
  vertical_push: 0.4, lunge: 0.5, hip_extension: 0.55,
};

const MAX_DIFFICULTY = { beginner: 2, intermediate: 3, advanced: 3 } as const;

/** Every exercise the athlete can safely perform with their equipment and history. */
export function eligibleExercises(profile: AthleteProfile): Exercise[] {
  const kit = new Set([...profile.equipment, "bodyweight"]);
  const injured = new Set(profile.injuries);
  return EXERCISES.filter((e) => {
    if (!e.equipment.every((q) => kit.has(q))) return false;
    if (profile.dislikedExercises.includes(e.id)) return false;
    if (e.difficulty > MAX_DIFFICULTY[profile.experience]) return false;
    for (const [joint, level] of Object.entries(e.stress)) {
      if (injured.has(joint as never) && (level ?? 0) >= 2) return false;
    }
    return true;
  });
}

function scoreExercise(e: Exercise, slot: SlotTemplate, objective: SessionObjective, ctx: Ctx, wantCompound: boolean): number {
  const { profile } = ctx;
  let s = 0;
  const pIdx = slot.patterns.indexOf(e.pattern);
  s += (slot.patterns.length - pIdx) * 4;
  if (slot.muscles?.some((m) => e.primary.includes(m))) s += 4;
  if (profile.preferredExercises.includes(e.id)) s += 8;
  if (wantCompound && e.mechanics === "compound") s += 3;
  if (!wantCompound && e.mechanics === "isolation") s += 1;
  // Strength & power sessions favour loadable barbell/trap-bar lifts; hypertrophy favours stable, high-tension options.
  if (objective === "strength" || objective === "power") {
    if (e.equipment.includes("barbell") || e.equipment.includes("trap_bar")) s += 3;
  } else if (objective === "hypertrophy") {
    if (e.equipment.includes("machine") || e.equipment.includes("cable") || e.equipment.includes("dumbbell")) s += 1.5;
  }
  // With real equipment available, bands and bodyweight variations are fallbacks, not first choices.
  const wellEquipped = profile.environment === "commercial_gym" || profile.environment === "home_gym";
  const minimalKit = e.equipment.every((q) => q === "bodyweight" || q === "bands");
  if (wellEquipped && minimalKit && objective !== "conditioning" && e.pattern !== "jump" && e.pattern !== "throw") s -= 4;
  if (!e.loaded && objective !== "conditioning" && objective !== "endurance" && profile.environment !== "bodyweight") s -= 2;
  // Novices: lower skill and fatigue cost. Advanced lifters tolerate it.
  if (profile.experience === "beginner") s -= (e.difficulty - 1) * 2 + (e.fatigue - 1);
  if (profile.experience === "intermediate" && e.difficulty === 3) s -= 1.5;
  if (profile.recoveryScore <= 2 || (profile.age ?? 0) >= 55) s -= (e.fatigue - 1) * 1.5;
  // Light penalty for joints that are sore but not contraindicated.
  for (const [joint, level] of Object.entries(e.stress)) {
    if (profile.injuries.includes(joint as never)) s -= (level ?? 0) * 3;
  }
  if (NOVICE_REGRESSIONS.has(e.id) && profile.experience !== "beginner" && profile.environment !== "bodyweight") s -= 5;
  s -= (ctx.usage.get(e.id) ?? 0) * 2.5;
  return s + ctx.rand() * 1.5;
}

function pickExercise(slot: SlotTemplate, pool: Exercise[], objective: SessionObjective, ctx: Ctx, taken: Set<string>, wantCompound: boolean): Exercise | null {
  let candidates = pool.filter((e) => slot.patterns.includes(e.pattern) && !taken.has(e.id));
  if (!candidates.length) {
    // Fall back to anything that trains the group directly.
    candidates = pool.filter((e) => !taken.has(e.id) && e.primary.some((m) => MUSCLE_TO_GROUP[m] === slot.group));
  }
  if (!candidates.length) return null;
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const c of candidates) {
    const sc = scoreExercise(c, slot, objective, ctx, wantCompound);
    if (sc > bestScore) {
      bestScore = sc;
      best = c;
    }
  }
  return best;
}

/** Order slots like a coach would: power → heavy compounds → lighter compounds → isolation → core → conditioning. */
function orderKey(e: Exercise): number {
  if (e.pattern === "jump" || e.pattern === "throw" || e.pattern === "olympic") return 0;
  if (e.pattern === "conditioning") return 9;
  if (MUSCLE_TO_GROUP[e.primary[0]] === "core" || e.pattern === "carry") return 8;
  if (e.mechanics === "compound") return 3 - e.fatigue + (PATTERN_ORDER[e.pattern] ?? 0.8); // most fatiguing first
  return 5;
}

function assignRoles(exs: Exercise[], objective: SessionObjective): SlotRole[] {
  let primaryGiven = 0;
  const maxPrimary = objective === "strength" || objective === "power" ? 2 : 1;
  return exs.map((e) => {
    if (e.mechanics === "compound" && e.pattern !== "conditioning" && e.pattern !== "carry" && primaryGiven < maxPrimary && e.fatigue >= 2) {
      primaryGiven++;
      return "primary";
    }
    return e.mechanics === "compound" ? "secondary" : "accessory";
  });
}

/** Build the exercises for one day around its exact focus and objective. */
export function buildSession(day: DayPlan, profile: AthleteProfile, ctx: Ctx, pool: Exercise[]): ProgramSession {
  const weights = focusWeights(day.focuses, day.sport);
  // Muscles the athlete flagged for extra attention get more slots when they belong to this day.
  for (const m of profile.priorityMuscles) {
    const g = MUSCLE_TO_GROUP[m];
    if (g && (weights[g] ?? 0) > 0) weights[g] = (weights[g] ?? 0) + 0.35;
  }
  const strengthBias = day.focuses.includes("strength") || day.objective === "strength";
  const minutes = profile.sessionMinutes;
  const counts: Partial<Record<SlotGroup, number>> = {};
  const chosen: Exercise[] = [];
  const taken = new Set<string>();
  const groups = (Object.keys(weights) as SlotGroup[]).filter((g) => (weights[g] ?? 0) > 0);
  const maxSlots = Math.max(3, Math.min(10, Math.round(minutes / 7)));

  while (chosen.length < maxSlots) {
    let bestG: SlotGroup | null = null;
    let bestV = 0;
    for (const g of groups) {
      const c = counts[g] ?? 0;
      if (c >= GROUP_SLOTS[g].length) continue;
      const v = (weights[g] ?? 0) / Math.pow(c + 1, 1.5);
      if (v > bestV) {
        bestV = v;
        bestG = g;
      }
    }
    if (!bestG || bestV < 0.12) break;
    const slotIdx = counts[bestG] ?? 0;
    counts[bestG] = slotIdx + 1;
    const slot = GROUP_SLOTS[bestG][slotIdx];
    const wantCompound = strengthBias || (slotIdx === 0 && BIG_GROUPS.has(bestG));
    const pick = pickExercise(slot, pool, day.objective, ctx, taken, wantCompound);
    if (!pick) continue;
    // Stop once the time budget is used, but always keep at least three exercises.
    const trial = [...chosen, pick];
    const rxs = assignRoles(trial, day.objective).map((r, i) => basePrescription(trial[i], r, day.objective, profile.experience));
    if (chosen.length >= 3 && estimateMinutes(rxs) > minutes) break;
    chosen.push(pick);
    taken.add(pick.id);
  }

  chosen.sort((a, b) => orderKey(a) - orderKey(b));
  const roles = assignRoles(chosen, day.objective);
  const exercises: ProgramExercise[] = chosen.map((e, i) => {
    ctx.usage.set(e.id, (ctx.usage.get(e.id) ?? 0) + 1);
    return { id: uid(ctx.rand), exerciseId: e.id, role: roles[i], rx: basePrescription(e, roles[i], day.objective, profile.experience) };
  });
  return {
    id: day.id,
    weekday: day.weekday,
    label: day.label || defaultDayLabel(day.focuses, day.objective),
    focuses: day.focuses,
    objective: day.objective,
    exercises,
    estMinutes: estimateMinutes(exercises.map((x) => x.rx)),
  };
}

export function defaultDayLabel(focuses: FocusId[], objective: SessionObjective): string {
  const f = focuses.length ? focuses.map((x) => FOCUS_LABEL[x]).join(" + ") : "Full Body";
  const o = objective === "mixed" ? "" : ` · ${objective === "endurance" ? "Endurance" : objective[0].toUpperCase() + objective.slice(1)}`;
  return f + o;
}

/** Hard sets per muscle group for the week: primary movers count 1, secondary movers 0.5. */
export function weeklySets(sessions: ProgramSession[]): Record<MuscleGroup, number> {
  const out: Record<MuscleGroup, number> = { chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0, quads: 0, hamstrings: 0, glutes: 0, calves: 0, core: 0 };
  for (const s of sessions) {
    for (const pe of s.exercises) {
      const e = EXERCISE_MAP[pe.exerciseId];
      if (!e || e.pattern === "conditioning") continue;
      const prim = new Set(e.primary.map((m) => MUSCLE_TO_GROUP[m]).filter(Boolean) as MuscleGroup[]);
      const sec = new Set(e.secondary.map((m) => MUSCLE_TO_GROUP[m]).filter((g): g is MuscleGroup => !!g && !prim.has(g)));
      prim.forEach((g) => (out[g] += pe.rx.sets));
      sec.forEach((g) => (out[g] += pe.rx.sets * 0.5));
    }
  }
  return out;
}

/** Nudge set counts so every trained muscle group lands inside its weekly target range. */
export function balanceVolume(sessions: ProgramSession[], goal: ProgramGoal, profile: AthleteProfile): VolumeReportRow[] {
  const targets = volumeTargets(goal, profile.experience, profile.recoveryScore);
  const trained = trainedGroups(sessions);
  const directFor = (g: MuscleGroup) =>
    sessions
      .flatMap((s) => s.exercises.map((pe) => ({ pe, s })))
      .filter(({ pe }) => {
        const e = EXERCISE_MAP[pe.exerciseId];
        return e && !e.timed && e.primary.some((m) => MUSCLE_TO_GROUP[m] === g);
      })
      .sort((a, b) => roleRank(b.pe.role) - roleRank(a.pe.role)); // accessories first
  // Extra sets may stretch a session slightly past the requested length, never far past it.
  const budget = profile.sessionMinutes * 1.1;
  const fits = (s: ProgramSession, pe: ProgramExercise) =>
    estimateMinutes(s.exercises.map((x) => (x === pe ? { ...x.rx, sets: x.rx.sets + 1 } : x.rx))) <= budget;

  for (let pass = 0; pass < 6; pass++) {
    const vol = weeklySets(sessions);
    let changed = false;
    for (const g of trained) {
      const [lo, hi] = targets[g];
      const direct = directFor(g);
      if (vol[g] < lo) {
        const hit = direct.find(({ pe, s }) => pe.role !== "primary" && pe.rx.sets < 5 && fits(s, pe));
        if (hit) {
          hit.pe.rx.sets += 1;
          changed = true;
        }
      } else if (vol[g] > hi) {
        const hit = direct.find(({ pe }) => pe.rx.sets > 2);
        if (hit) {
          hit.pe.rx.sets -= 1;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  for (const s of sessions) s.estMinutes = estimateMinutes(s.exercises.map((x) => x.rx));
  return reportVolume(sessions, goal, profile);
}

function trainedGroups(sessions: ProgramSession[]): Set<MuscleGroup> {
  const trained = new Set<MuscleGroup>();
  for (const s of sessions) {
    const w = focusWeights(s.focuses);
    (Object.keys(w) as SlotGroup[]).forEach((g) => {
      if (g !== "power" && g !== "conditioning" && (w[g] ?? 0) >= 0.3) trained.add(g);
    });
  }
  return trained;
}

/** Weekly sets vs. target range for every muscle group the program sets out to train. Pure — safe to call after edits. */
export function reportVolume(sessions: ProgramSession[], goal: ProgramGoal, profile: AthleteProfile): VolumeReportRow[] {
  const targets = volumeTargets(goal, profile.experience, profile.recoveryScore);
  const vol = weeklySets(sessions);
  return [...trainedGroups(sessions)].map((g) => {
    const [min, max] = targets[g];
    const sets = Math.round(vol[g] * 2) / 2;
    return { group: g, sets, min, max, status: sets < min ? "low" : sets > max ? "high" : "ok" };
  });
}

function roleRank(r: SlotRole) {
  return r === "accessory" ? 2 : r === "secondary" ? 1 : 0;
}

export function generateProgram(input: GenerateInput): Program {
  const { profile, goal, weeks, days } = input;
  if (!days.length) throw new Error("A program needs at least one training day");
  if (days.length > 7) throw new Error("A program can have at most 7 sessions per week");
  if (weeks < 1 || weeks > 52) throw new Error("Program length must be between 1 and 52 weeks");
  const seed = input.seed ?? Math.floor(Math.random() * 2 ** 31);
  const ctx: Ctx = { profile, rand: mulberry32(seed), usage: new Map() };
  const pool = eligibleExercises(profile);
  const sessions = days.map((d) => buildSession(d, profile, ctx, pool));
  const volumeReport = balanceVolume(sessions, goal, profile);
  const now = new Date().toISOString();
  return {
    id: uid(ctx.rand),
    name: input.name?.trim() || defaultProgramName(goal, days.length, weeks, input.customGoal),
    goal,
    customGoal: input.customGoal,
    weeks,
    sessions,
    weekPlans: buildWeekPlans(weeks, goal, profile.experience, profile.recoveryScore),
    createdAt: now,
    updatedAt: now,
    seed,
    volumeReport,
  };
}

/** Rebuild a single day (after its focus or objective changes) while avoiding exercises used on other days. */
export function regenerateSession(program: Program, sessionId: string, day: DayPlan, profile: AthleteProfile, seed = Date.now()): ProgramSession {
  const ctx: Ctx = { profile, rand: mulberry32(seed), usage: new Map() };
  for (const s of program.sessions) {
    if (s.id === sessionId) continue;
    for (const pe of s.exercises) ctx.usage.set(pe.exerciseId, (ctx.usage.get(pe.exerciseId) ?? 0) + 1);
  }
  return buildSession(day, profile, ctx, eligibleExercises(profile));
}

function defaultProgramName(goal: ProgramGoal, days: number, weeks: number, custom?: string): string {
  const g = goal === "custom" && custom ? custom : { hypertrophy: "Hypertrophy", strength: "Strength", power: "Power", athletic: "Athlete", endurance: "Endurance", general_fitness: "Fitness", hybrid: "Power-Building", custom: "Custom" }[goal];
  return `${g} · ${days}×/wk · ${weeks} wk`;
}

/** Swappable alternatives: same movement pattern first, then same primary muscles. */
export function alternatives(exerciseId: string, profile: AthleteProfile, limit = 8): Exercise[] {
  const src = EXERCISE_MAP[exerciseId];
  if (!src) return [];
  const pool = eligibleExercises(profile).filter((e) => e.id !== exerciseId);
  const scored = pool
    .map((e) => {
      let s = 0;
      if (e.pattern === src.pattern) s += 10;
      s += e.primary.filter((m) => src.primary.includes(m)).length * 3;
      if (e.mechanics === src.mechanics) s += 1;
      return { e, s };
    })
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.e);
}

/** A starting split suggestion the user can freely edit — never enforced. */
export function suggestSplit(goal: ProgramGoal, count: number, available: Weekday[] = []): DayPlan[] {
  const obj = GOAL_DEFAULT_OBJECTIVE[goal];
  const S = (focuses: FocusId[], objective: SessionObjective = obj): Omit<DayPlan, "id" | "weekday" | "label"> => ({ focuses, objective });
  const strengthy = goal === "strength" || goal === "power" || goal === "hybrid";
  const splits: Record<number, Omit<DayPlan, "id" | "weekday" | "label">[]> = {
    1: [S(["full_body"])],
    2: [S(["full_body"]), S(["full_body"])],
    3: goal === "athletic"
      ? [S(["full_body", "power"], "power"), S(["upper"], "strength"), S(["lower", "conditioning"], "mixed")]
      : [S(["full_body"]), S(["full_body"]), S(["full_body"])],
    4: strengthy
      ? [S(["upper"], "strength"), S(["lower"], "strength"), S(["upper"], "hypertrophy"), S(["lower"], "hypertrophy")]
      : [S(["upper"]), S(["lower"]), S(["upper"]), S(["lower"])],
    5: [S(["upper"], strengthy ? "strength" : obj), S(["lower"], strengthy ? "strength" : obj), S(["push"], "hypertrophy"), S(["pull"], "hypertrophy"), S(["legs"], "hypertrophy")],
    6: [S(["push"]), S(["pull"]), S(["legs"]), S(["push"], "hypertrophy"), S(["pull"], "hypertrophy"), S(["legs"], "hypertrophy")],
    7: [S(["push"]), S(["pull"]), S(["legs"]), S(["conditioning", "core"], "conditioning"), S(["upper"], "hypertrophy"), S(["lower"], "hypertrophy"), S(["arms", "shoulders"], "hypertrophy")],
  };
  const n = Math.max(1, Math.min(7, count));
  const weekdays = spreadWeekdays(n, available);
  return splits[n].map((d, i) => ({ ...d, id: `day_${i + 1}_${Math.random().toString(36).slice(2, 7)}`, weekday: weekdays[i] ?? null, label: "" }));
}

/** Spread n sessions across the week, preferring the athlete's available days and avoiding back-to-back where possible. */
export function spreadWeekdays(n: number, available: Weekday[]): Weekday[] {
  const pool: Weekday[] = available.length >= n ? [...available].sort() : [0, 1, 2, 3, 4, 5, 6];
  if (n >= pool.length) return pool.slice(0, n);
  const step = pool.length / n;
  const out: Weekday[] = [];
  for (let i = 0; i < n; i++) out.push(pool[Math.floor(i * step)]);
  return out;
}
