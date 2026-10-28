import { ENVIRONMENT_EQUIPMENT } from "@/lib/engine/focus";
import type { AthleteProfile, DayPlan, FocusId, SessionObjective, Weekday } from "@/lib/engine/types";

export function profile(over: Partial<AthleteProfile> = {}): AthleteProfile {
  return {
    name: "Test",
    age: 28,
    experience: "intermediate",
    primaryGoal: "hypertrophy",
    secondaryGoals: [],
    availableDays: [0, 1, 2, 3, 4],
    sessionMinutes: 60,
    environment: "commercial_gym",
    equipment: ENVIRONMENT_EQUIPMENT.commercial_gym,
    oneRepMaxes: {},
    preferredExercises: [],
    dislikedExercises: [],
    priorityMuscles: [],
    sports: [],
    injuries: [],
    recoveryScore: 3,
    units: "kg",
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

let n = 0;
export function day(focuses: FocusId[], objective: SessionObjective, weekday: Weekday | null = null, extra: Partial<DayPlan> = {}): DayPlan {
  return { id: `d${++n}`, weekday, label: "", focuses, objective, ...extra };
}
