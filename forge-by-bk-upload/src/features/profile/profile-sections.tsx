"use client";

import { useState } from "react";
import { Activity, Battery, Dumbbell, Flame, HeartPulse, Home, Plus, RotateCcw, Target, Trophy, X, Zap } from "lucide-react";
import {
  ENVIRONMENT_EQUIPMENT, ENVIRONMENT_LABEL, EQUIPMENT_LABEL, EXERCISE_MAP, JOINT_LABEL, MUSCLE_LABEL,
  type AthleteGoal, type AthleteProfile, type Environment, type Equipment, type Joint, type Muscle, type Weekday, type Experience,
} from "@/lib/engine";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Chip, OptionCard, Segmented } from "@/components/ui/chip";
import { ExercisePicker } from "@/features/library/exercise-picker";
import { WEEKDAY_SHORT } from "@/lib/utils";

export type Draft = AthleteProfile;
export type SetDraft = (patch: Partial<Draft>) => void;
type SectionProps = { draft: Draft; set: SetDraft; errors?: Record<string, string> };

export const ATHLETE_GOALS: { id: AthleteGoal; title: string; desc: string; icon: React.ReactNode }[] = [
  { id: "hypertrophy", title: "Muscle hypertrophy", desc: "Build size and shape", icon: <Dumbbell className="h-4 w-4" /> },
  { id: "strength", title: "Maximal strength", desc: "Lift heavier on the big lifts", icon: <Trophy className="h-4 w-4" /> },
  { id: "endurance", title: "Muscular endurance", desc: "More reps, less fatigue", icon: <Battery className="h-4 w-4" /> },
  { id: "general_fitness", title: "General fitness", desc: "Strong, fit and capable", icon: <Activity className="h-4 w-4" /> },
  { id: "power", title: "Power & explosiveness", desc: "Jump higher, move faster", icon: <Zap className="h-4 w-4" /> },
  { id: "athletic", title: "Athletic performance", desc: "Train for your sport", icon: <Target className="h-4 w-4" /> },
  { id: "recomposition", title: "Body recomposition", desc: "Lose fat, keep or gain muscle", icon: <Flame className="h-4 w-4" /> },
  { id: "return_to_training", title: "Return to training", desc: "Rebuild consistency safely", icon: <RotateCcw className="h-4 w-4" /> },
  { id: "health", title: "General health", desc: "Longevity and wellbeing", icon: <HeartPulse className="h-4 w-4" /> },
];

export const EXPERIENCE: { id: Experience; title: string; desc: string }[] = [
  { id: "beginner", title: "Beginner", desc: "Under ~1 year of consistent lifting" },
  { id: "intermediate", title: "Intermediate", desc: "1–3 years, comfortable with the main lifts" },
  { id: "advanced", title: "Advanced", desc: "3+ years, progress now takes planning" },
];

const KEY_LIFTS = [
  { id: "back_squat", label: "Back squat" },
  { id: "bb_bench", label: "Bench press" },
  { id: "deadlift", label: "Deadlift" },
  { id: "ohp", label: "Overhead press" },
];

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const num = (v: string) => (v === "" ? undefined : Number(v));

export function validateProfile(d: Draft, step?: "basics" | "schedule" | "equipment"): Record<string, string> {
  const e: Record<string, string> = {};
  if (!step || step === "basics") {
    if (!d.name.trim()) e.name = "Tell us what to call you";
    if (d.age != null && (d.age < 13 || d.age > 100)) e.age = "Age must be between 13 and 100";
    if (d.heightCm != null && (d.heightCm < 100 || d.heightCm > 250)) e.heightCm = "Height should be 100–250 cm";
    if (d.weightKg != null && (d.weightKg < 30 || d.weightKg > 300)) e.weightKg = "Weight should be 30–300 kg";
  }
  if (!step || step === "schedule") {
    if (!d.availableDays.length) e.availableDays = "Pick at least one day";
    if (d.sessionMinutes < 15 || d.sessionMinutes > 180) e.sessionMinutes = "15–180 minutes";
  }
  if (!step || step === "equipment") {
    if (!d.equipment.length) e.equipment = "Choose at least one option";
  }
  return e;
}

export function BasicsSection({ draft, set, errors = {} }: SectionProps) {
  return (
    <div className="space-y-4">
      <Field label="Name" htmlFor="name" error={errors.name}>
        <Input id="name" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Your name" autoComplete="given-name" aria-invalid={!!errors.name} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Age" htmlFor="age" error={errors.age}>
          <Input id="age" type="number" inputMode="numeric" value={draft.age ?? ""} onChange={(e) => set({ age: num(e.target.value) })} placeholder="28" aria-invalid={!!errors.age} />
        </Field>
        <Field label="Height (cm)" htmlFor="h" error={errors.heightCm}>
          <Input id="h" type="number" inputMode="numeric" value={draft.heightCm ?? ""} onChange={(e) => set({ heightCm: num(e.target.value) })} placeholder="178" aria-invalid={!!errors.heightCm} />
        </Field>
        <Field label="Weight (kg)" htmlFor="w" error={errors.weightKg}>
          <Input id="w" type="number" inputMode="decimal" value={draft.weightKg ?? ""} onChange={(e) => set({ weightKg: num(e.target.value) })} placeholder="80" aria-invalid={!!errors.weightKg} />
        </Field>
      </div>
      <Field label="Sex (optional — used for volume and load defaults)">
        <Segmented
          ariaLabel="Sex"
          value={draft.sex ?? "other"}
          onChange={(v) => set({ sex: v })}
          options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Prefer not" }]}
        />
      </Field>
    </div>
  );
}

export function ExperienceGoalSection({ draft, set }: SectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-medium">Training experience</div>
        {EXPERIENCE.map((x) => (
          <OptionCard key={x.id} selected={draft.experience === x.id} onClick={() => set({ experience: x.id })} title={x.title} desc={x.desc} />
        ))}
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">Primary goal</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {ATHLETE_GOALS.map((g) => (
            <OptionCard key={g.id} selected={draft.primaryGoal === g.id} onClick={() => set({ primaryGoal: g.id, secondaryGoals: draft.secondaryGoals.filter((s) => s !== g.id) })} title={g.title} desc={g.desc} icon={g.icon} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">Secondary goals <span className="text-muted">(optional)</span></div>
        <div className="flex flex-wrap gap-2">
          {ATHLETE_GOALS.filter((g) => g.id !== draft.primaryGoal).map((g) => (
            <Chip key={g.id} selected={draft.secondaryGoals.includes(g.id)} onClick={() => set({ secondaryGoals: toggle(draft.secondaryGoals, g.id) })}>
              {g.title}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScheduleSection({ draft, set, errors = {} }: SectionProps) {
  return (
    <div className="space-y-6">
      <Field label="Days you can train" error={errors.availableDays}>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_SHORT.map((d, i) => {
            const on = draft.availableDays.includes(i as Weekday);
            return (
              <button key={d} type="button" aria-pressed={on} onClick={() => set({ availableDays: toggle(draft.availableDays, i as Weekday).sort() })} className={`h-12 rounded-xl border text-sm font-semibold transition-all ${on ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface-2 text-muted"}`}>
                {d}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label={`Preferred session length — ${draft.sessionMinutes} min`} error={errors.sessionMinutes}>
        <input type="range" min={20} max={120} step={5} value={draft.sessionMinutes} onChange={(e) => set({ sessionMinutes: Number(e.target.value) })} className="w-full accent-[hsl(var(--accent))]" aria-label="Session length in minutes" />
        <div className="flex justify-between text-xs text-muted"><span>20</span><span>60</span><span>120</span></div>
      </Field>
      <Field label="Sports you play (optional)" hint="Used to tailor sport-specific sessions, e.g. soccer, tennis, basketball">
        <TagInput values={draft.sports} onChange={(sports) => set({ sports })} placeholder="Add a sport" />
      </Field>
    </div>
  );
}

export function EquipmentSection({ draft, set, errors = {} }: SectionProps) {
  const envs = Object.keys(ENVIRONMENT_LABEL) as Environment[];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2">
        {envs.map((env) => (
          <OptionCard key={env} selected={draft.environment === env} onClick={() => set({ environment: env, equipment: ENVIRONMENT_EQUIPMENT[env] })} title={ENVIRONMENT_LABEL[env]} icon={<Home className="h-4 w-4" />} />
        ))}
      </div>
      <Field label="Fine-tune your equipment" error={errors.equipment}>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(EQUIPMENT_LABEL) as Equipment[]).filter((q) => q !== "bodyweight").map((q) => (
            <Chip key={q} selected={draft.equipment.includes(q)} onClick={() => set({ equipment: toggle(draft.equipment, q) })}>
              {EQUIPMENT_LABEL[q]}
            </Chip>
          ))}
        </div>
      </Field>
    </div>
  );
}

export function StrengthSection({ draft, set }: SectionProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Optional. Known or estimated one-rep maxes let FORGE suggest exact starting loads. Leave blank if unsure — it learns from your first sessions.</p>
      {KEY_LIFTS.map((l) => (
        <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
          <label htmlFor={`orm-${l.id}`} className="font-medium">{l.label}</label>
          <div className="flex items-center gap-2">
            <Input
              id={`orm-${l.id}`}
              type="number"
              inputMode="decimal"
              className="w-24 text-right"
              placeholder="—"
              value={draft.oneRepMaxes[l.id] ?? ""}
              onChange={(e) => {
                const v = num(e.target.value);
                const next = { ...draft.oneRepMaxes };
                if (v && v > 0 && v < 600) next[l.id] = v;
                else delete next[l.id];
                set({ oneRepMaxes: next });
              }}
            />
            <span className="text-sm text-muted">kg</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PreferencesSection({ draft, set }: SectionProps) {
  const [picker, setPicker] = useState<null | "preferred" | "disliked">(null);
  const muscles = Object.keys(MUSCLE_LABEL) as Muscle[];
  return (
    <div className="space-y-6">
      {(["preferred", "disliked"] as const).map((kind) => {
        const key = kind === "preferred" ? "preferredExercises" : "dislikedExercises";
        const list = draft[key];
        return (
          <div key={kind} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{kind === "preferred" ? "Exercises you love" : "Exercises to avoid"}</div>
              <button type="button" onClick={() => setPicker(kind)} className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="flex min-h-9 flex-wrap gap-2">
              {list.length === 0 && <span className="text-sm text-muted">None selected</span>}
              {list.map((id) => (
                <span key={id} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm ${kind === "preferred" ? "border-accent/40 text-accent" : "border-danger/40 text-danger"}`}>
                  {EXERCISE_MAP[id]?.name ?? id}
                  <button type="button" aria-label={`Remove ${EXERCISE_MAP[id]?.name}`} onClick={() => set({ [key]: list.filter((x) => x !== id) } as Partial<Draft>)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        );
      })}
      <div className="space-y-2">
        <div className="text-sm font-medium">Muscles needing extra attention</div>
        <div className="flex flex-wrap gap-2">
          {muscles.map((m) => (
            <Chip key={m} selected={draft.priorityMuscles.includes(m)} onClick={() => set({ priorityMuscles: toggle(draft.priorityMuscles, m) })}>
              {MUSCLE_LABEL[m]}
            </Chip>
          ))}
        </div>
      </div>
      <ExercisePicker
        open={picker !== null}
        onOpenChange={(o) => !o && setPicker(null)}
        title={picker === "preferred" ? "Add a favourite" : "Add an exercise to avoid"}
        selected={picker === "preferred" ? draft.preferredExercises : draft.dislikedExercises}
        onPick={(id) => {
          if (picker === "preferred") set({ preferredExercises: toggle(draft.preferredExercises, id), dislikedExercises: draft.dislikedExercises.filter((x) => x !== id) });
          if (picker === "disliked") set({ dislikedExercises: toggle(draft.dislikedExercises, id), preferredExercises: draft.preferredExercises.filter((x) => x !== id) });
        }}
      />
    </div>
  );
}

export function HealthSection({ draft, set }: SectionProps) {
  const joints = Object.keys(JOINT_LABEL) as Joint[];
  const RECOVERY = ["", "Poor", "Below average", "Average", "Good", "Excellent"];
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-medium">Injuries or areas to protect</div>
        <p className="text-xs text-muted">Exercises that heavily load these joints are excluded; moderate ones are deprioritised.</p>
        <div className="flex flex-wrap gap-2">
          {joints.map((j) => (
            <Chip key={j} selected={draft.injuries.includes(j)} onClick={() => set({ injuries: toggle(draft.injuries, j) })}>
              {JOINT_LABEL[j]}
            </Chip>
          ))}
        </div>
      </div>
      <Field label="Notes on injuries or limitations" htmlFor="inj">
        <Textarea id="inj" value={draft.injuryNotes ?? ""} onChange={(e) => set({ injuryNotes: e.target.value })} placeholder="e.g. Left shoulder impingement — overhead pressing aggravates it" maxLength={500} />
      </Field>
      <Field label={`Recovery capacity — ${RECOVERY[draft.recoveryScore]}`} hint="Sleep, stress, job and lifestyle. Lower recovery means less weekly volume and lower-fatigue exercise choices.">
        <input type="range" min={1} max={5} value={draft.recoveryScore} onChange={(e) => set({ recoveryScore: Number(e.target.value) })} className="w-full accent-[hsl(var(--accent))]" aria-label="Recovery capacity" />
      </Field>
    </div>
  );
}

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [v, setV] = useState("");
  const add = () => {
    const t = v.trim();
    if (t && !values.includes(t) && t.length <= 40) onChange([...values, t]);
    setV("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder={placeholder} aria-label={placeholder} />
        <button type="button" onClick={add} className="rounded-xl border border-border px-4 text-sm font-semibold">Add</button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-sm">
              {s}
              <button type="button" aria-label={`Remove ${s}`} onClick={() => onChange(values.filter((x) => x !== s))}><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function emptyProfile(): Draft {
  return {
    name: "", experience: "intermediate", primaryGoal: "hypertrophy", secondaryGoals: [], availableDays: [0, 2, 4], sessionMinutes: 60,
    environment: "commercial_gym", equipment: ENVIRONMENT_EQUIPMENT.commercial_gym, oneRepMaxes: {}, preferredExercises: [], dislikedExercises: [],
    priorityMuscles: [], sports: [], injuries: [], recoveryScore: 3, units: "kg", updatedAt: new Date().toISOString(),
  };
}
