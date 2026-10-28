// Core domain types shared by the program engine, store and UI.

export type Muscle =
  | "chest"
  | "lats"
  | "upper_back"
  | "traps"
  | "front_delts"
  | "side_delts"
  | "rear_delts"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "adductors"
  | "calves"
  | "abs"
  | "obliques"
  | "lower_back";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "kettlebell"
  | "cable"
  | "machine"
  | "smith"
  | "bench"
  | "rack"
  | "pullup_bar"
  | "dip_station"
  | "bands"
  | "trap_bar"
  | "landmine"
  | "sled"
  | "medball"
  | "box"
  | "cardio_machine"
  | "bodyweight";

export type Pattern =
  | "horizontal_push"
  | "incline_push"
  | "vertical_push"
  | "chest_fly"
  | "horizontal_pull"
  | "vertical_pull"
  | "pullover"
  | "shrug"
  | "lateral_raise"
  | "rear_delt"
  | "elbow_flexion"
  | "elbow_extension"
  | "squat"
  | "lunge"
  | "knee_extension"
  | "hinge"
  | "knee_flexion"
  | "hip_extension"
  | "hip_abduction"
  | "hip_adduction"
  | "calf_raise"
  | "anti_extension"
  | "rotation"
  | "trunk_flexion"
  | "carry"
  | "jump"
  | "throw"
  | "olympic"
  | "conditioning";

export type Joint = "shoulder" | "elbow" | "wrist" | "neck" | "lower_back" | "hip" | "knee" | "ankle";

export type Mechanics = "compound" | "isolation";

export interface Exercise {
  id: string;
  name: string;
  pattern: Pattern;
  primary: Muscle[];
  secondary: Muscle[];
  /** All items are required to perform the movement ("bodyweight" = none). */
  equipment: Equipment[];
  mechanics: Mechanics;
  /** 1 = novice friendly, 3 = technically demanding. */
  difficulty: 1 | 2 | 3;
  /** Systemic fatigue cost, 1 (low) – 3 (high). */
  fatigue: 1 | 2 | 3;
  /** How much each joint is loaded; 2+ is excluded for an injured joint, 1 is penalised. */
  stress: Partial<Record<Joint, 1 | 2 | 3>>;
  unilateral?: boolean;
  /** Whether external load is tracked in kg. */
  loaded: boolean;
  /** Prescribed by time rather than reps (planks, carries, intervals). */
  timed?: boolean;
  /** Smallest sensible jump in load, kg. */
  increment: number;
  cues: string[];
}

export type Experience = "beginner" | "intermediate" | "advanced";

export type ProgramGoal =
  | "hypertrophy"
  | "strength"
  | "power"
  | "athletic"
  | "endurance"
  | "general_fitness"
  | "hybrid"
  | "custom";

export type AthleteGoal =
  | "hypertrophy"
  | "strength"
  | "endurance"
  | "general_fitness"
  | "power"
  | "athletic"
  | "recomposition"
  | "return_to_training"
  | "health";

export type SessionObjective = "hypertrophy" | "strength" | "power" | "endurance" | "conditioning" | "mixed";

export type FocusId =
  | "full_body"
  | "upper"
  | "lower"
  | "push"
  | "pull"
  | "legs"
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "arms"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves"
  | "core"
  | "strength"
  | "power"
  | "conditioning"
  | "sport";

export type Environment = "commercial_gym" | "home_gym" | "minimal" | "bodyweight";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Monday

export interface AthleteProfile {
  name: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  sex?: "male" | "female" | "other";
  experience: Experience;
  primaryGoal: AthleteGoal;
  secondaryGoals: AthleteGoal[];
  availableDays: Weekday[];
  sessionMinutes: number;
  environment: Environment;
  equipment: Equipment[];
  /** Known one-rep maxes in kg, keyed by exercise id. */
  oneRepMaxes: Record<string, number>;
  preferredExercises: string[];
  dislikedExercises: string[];
  priorityMuscles: Muscle[];
  sports: string[];
  injuries: Joint[];
  injuryNotes?: string;
  /** 1 (poor) – 5 (excellent): sleep, stress and lifestyle recovery capacity. */
  recoveryScore: number;
  units: "kg" | "lb";
  /** Daily calorie and macro targets, if the athlete has set them. */
  nutrition?: NutritionPlan;
  updatedAt: string;
}

export type NutritionGoal = "lose" | "maintain" | "gain";

export interface NutritionPlan {
  goal: NutritionGoal;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** A day the user configures in the generator. */
export interface DayPlan {
  id: string;
  weekday: Weekday | null;
  label: string;
  focuses: FocusId[];
  objective: SessionObjective;
  sport?: string;
}

export type SlotRole = "primary" | "secondary" | "accessory";

export interface Prescription {
  sets: number;
  repsMin: number;
  repsMax: number;
  /** Reps in reserve target. */
  rir: number;
  restSec: number;
  /** Seconds of work for timed exercises. */
  workSec?: number;
  tempo?: string;
  intent?: string;
}

export interface ProgramExercise {
  id: string;
  exerciseId: string;
  role: SlotRole;
  rx: Prescription;
  notes?: string;
  supersetWith?: string;
}

export interface ProgramSession {
  id: string;
  weekday: Weekday | null;
  label: string;
  focuses: FocusId[];
  objective: SessionObjective;
  exercises: ProgramExercise[];
  estMinutes: number;
}

export type Phase = "accumulation" | "intensification" | "peak" | "deload";

export interface WeekPlan {
  index: number;
  phase: Phase;
  setDelta: number;
  rirDelta: number;
  repShift: number;
  loadFactor: number;
  note: string;
}

export interface Program {
  id: string;
  name: string;
  goal: ProgramGoal;
  customGoal?: string;
  weeks: number;
  sessions: ProgramSession[];
  weekPlans: WeekPlan[];
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  seed: number;
  volumeReport: VolumeReportRow[];
  deleted?: boolean;
}

export interface VolumeReportRow {
  group: MuscleGroup;
  sets: number;
  min: number;
  max: number;
  status: "low" | "ok" | "high";
}

/** Coarse muscle groups used for weekly volume accounting. */
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export interface LoggedSet {
  id: string;
  weight: number | null;
  reps: number | null;
  rir: number | null;
  seconds?: number | null;
  done: boolean;
  type: "warmup" | "working";
}

export interface LoggedExercise {
  id: string;
  exerciseId: string;
  rx?: Prescription;
  sets: LoggedSet[];
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  programId?: string;
  sessionId?: string;
  week?: number;
  name: string;
  startedAt: string;
  finishedAt?: string;
  exercises: LoggedExercise[];
  notes?: string;
  bodyweightKg?: number;
  sessionRpe?: number;
  updatedAt: string;
  deleted?: boolean;
}
