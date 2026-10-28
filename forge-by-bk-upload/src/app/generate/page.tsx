"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, ArrowLeft, ArrowRight, Battery, Dumbbell, Layers, Plus, RefreshCw, Sparkles, Target, Trophy, Wand2, Zap } from "lucide-react";
import {
  GOAL_DEFAULT_OBJECTIVE, GOAL_LABEL, OBJECTIVE_LABEL, defaultDayLabel, generateProgram, spreadWeekdays, suggestSplit,
  type AthleteGoal, type DayPlan, type FocusId, type Program, type ProgramGoal, type SessionObjective,
} from "@/lib/engine";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, OptionCard } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { toast } from "@/components/ui/toast";
import { DayCard, ObjectivePicker } from "@/features/generate/day-editor";
import { PhaseLegend, SessionCard, VolumeReport, WeekTimeline } from "@/features/programs/program-parts";
import { cn } from "@/lib/utils";

const GOALS: { id: ProgramGoal; desc: string; icon: React.ReactNode }[] = [
  { id: "hypertrophy", desc: "Maximise muscle growth", icon: <Dumbbell className="h-4 w-4" /> },
  { id: "strength", desc: "Get stronger on the main lifts", icon: <Trophy className="h-4 w-4" /> },
  { id: "power", desc: "Speed, jumps and explosive strength", icon: <Zap className="h-4 w-4" /> },
  { id: "athletic", desc: "Strength, power and conditioning for sport", icon: <Target className="h-4 w-4" /> },
  { id: "endurance", desc: "Higher reps, shorter rests", icon: <Battery className="h-4 w-4" /> },
  { id: "general_fitness", desc: "Balanced, sustainable training", icon: <Activity className="h-4 w-4" /> },
  { id: "hybrid", desc: "Heavy strength days + hypertrophy days", icon: <Layers className="h-4 w-4" /> },
  { id: "custom", desc: "Describe your own goal", icon: <Wand2 className="h-4 w-4" /> },
];

const FROM_ATHLETE: Record<AthleteGoal, ProgramGoal> = {
  hypertrophy: "hypertrophy", strength: "strength", endurance: "endurance", general_fitness: "general_fitness", power: "power",
  athletic: "athletic", recomposition: "hybrid", return_to_training: "general_fitness", health: "general_fitness",
};

const DURATIONS = [4, 6, 8, 10, 12];
const STEPS = ["Goal", "Frequency", "Duration", "Training days", "Objectives", "Review"];

let dayCounter = 0;
const mkDay = (focuses: FocusId[], objective: SessionObjective): DayPlan => ({ id: `day_${Date.now().toString(36)}_${++dayCounter}`, weekday: null, label: "", focuses, objective });

function templates(goal: ProgramGoal): { name: string; days: [FocusId[], SessionObjective?][] }[] {
  const o = GOAL_DEFAULT_OBJECTIVE[goal];
  return [
    { name: "Full Body ×3", days: [[["full_body"]], [["full_body"]], [["full_body"]]] },
    { name: "Upper / Lower", days: [[["upper"], "strength"], [["lower"], "strength"], [["upper"], "hypertrophy"], [["lower"], "hypertrophy"]] },
    { name: "Push / Pull / Legs", days: [[["push"]], [["pull"]], [["legs"]]] },
    { name: "Body-part split", days: [[["chest", "triceps"]], [["back", "biceps"]], [["lower"]], [["shoulders", "arms"]], [["full_body"]]] },
    { name: "Chest-Shoulders / Back / Legs", days: [[["chest", "shoulders", "triceps"]], [["back", "biceps"]], [["legs", "core"]]] },
  ].map((t) => ({ ...t, days: t.days.map(([f, obj]) => [f, obj ?? o] as [FocusId[], SessionObjective]) }));
}

export default function GeneratePage() {
  return (
    <Suspense>
      <Wizard />
    </Suspense>
  );
}

function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useStore((s) => s.profile)!;
  const saveProgram = useStore((s) => s.saveProgram);

  const initialGoal = FROM_ATHLETE[profile.primaryGoal];
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<ProgramGoal>(initialGoal);
  const [customGoal, setCustomGoal] = useState("");
  const [weeks, setWeeks] = useState(8);
  const [customWeeks, setCustomWeeks] = useState(false);
  const [days, setDays] = useState<DayPlan[]>(() => suggestSplit(initialGoal, Math.max(1, Math.min(7, profile.availableDays.length || 3)), profile.availableDays));
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Program | null>(null);
  const [previewWeek, setPreviewWeek] = useState(0);

  const setFrequency = (n: number) => {
    setDays((prev) => {
      if (n === prev.length) return prev;
      if (n < prev.length) return prev.slice(0, n);
      const extra = suggestSplit(goal, n, profile.availableDays).slice(prev.length);
      return [...prev, ...extra];
    });
  };

  const applyTemplate = (t: ReturnType<typeof templates>[number]) => {
    const wd = spreadWeekdays(t.days.length, profile.availableDays);
    setDays(t.days.map(([f, o], i) => ({ ...mkDay(f, o!), weekday: wd[i] ?? null })));
    toast(`${t.name} loaded — edit any day freely`);
  };

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0 && goal === "custom" && !customGoal.trim()) e.customGoal = "Describe your goal";
    if (s === 2 && (weeks < 1 || weeks > 52)) e.weeks = "1–52 weeks";
    if (s === 3) {
      if (!days.length) e.days = "Add at least one training day";
      days.forEach((d) => {
        if (!d.focuses.length) e[d.id] = "Pick at least one focus for this day";
      });
      const wds = days.map((d) => d.weekday).filter((w) => w != null);
      if (new Set(wds).size !== wds.length) e.days = "Two sessions are on the same weekday — that's allowed, but double-check it's intended.";
    }
    setErrors(e);
    const blocking = Object.entries(e).filter(([k]) => !(k === "days" && e.days.startsWith("Two sessions")));
    if (e.days?.startsWith("Two sessions")) toast("Heads up: two sessions share a weekday", "error");
    return blocking.length === 0;
  };

  const generate = (seed?: number) => {
    try {
      const p = generateProgram({ profile, goal, customGoal, weeks, days, name, seed });
      setResult(p);
      setPreviewWeek(0);
      setStep(5);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not generate program", "error");
    }
  };

  const next = () => {
    if (!validate(step)) return;
    if (step === 4) return generate();
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  };

  const save = () => {
    if (!result) return;
    saveProgram({ ...result, name: name.trim() || result.name, startDate: new Date().toISOString() }, true);
    toast("Program saved and set as active");
    router.push(`/programs/${result.id}`);
  };

  const tpl = useMemo(() => templates(goal), [goal]);

  return (
    <div className="pb-28">
      {params.get("welcome") && step === 0 && (
        <Card className="card-gradient mb-5 animate-fade-up">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <p className="text-sm">Profile saved, {profile.name}. Now let’s design your program — you choose what every day trains, FORGE handles the rest.</p>
          </div>
        </Card>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-[34px] font-bold uppercase leading-none">{step === 5 ? "Your program" : "Generate"}</h1>
        <span className="text-sm text-muted tabular">Step {step + 1}/{STEPS.length}</span>
      </div>
      <ol className="mb-6 flex gap-1" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button type="button" disabled={i > step || (i === 5 && !result)} onClick={() => setStep(i)} className="w-full text-left disabled:cursor-default" aria-current={i === step ? "step" : undefined}>
              <div className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-accent" : "bg-border")} />
              <div className={cn("mt-1.5 hidden text-[11px] font-semibold sm:block", i === step ? "text-fg" : "text-muted")}>{s}</div>
            </button>
          </li>
        ))}
      </ol>

      <div key={step} className="animate-fade-up">
        {step === 0 && (
          <Section title="What's the overall goal?" sub={`Pre-selected from your profile (${GOAL_LABEL[initialGoal]}).`}>
            <div className="grid gap-2 sm:grid-cols-2">
              {GOALS.map((g) => (
                <OptionCard key={g.id} selected={goal === g.id} onClick={() => setGoal(g.id)} title={GOAL_LABEL[g.id]} desc={g.desc} icon={g.icon} />
              ))}
            </div>
            {goal === "custom" && (
              <Field label="Describe your goal" htmlFor="cg" error={errors.customGoal}>
                <Input id="cg" value={customGoal} onChange={(e) => setCustomGoal(e.target.value)} placeholder="e.g. Pull-up strength + bigger arms" maxLength={60} />
              </Field>
            )}
          </Section>
        )}

        {step === 1 && (
          <Section title="How many sessions per week?" sub={`You said you can train ${profile.availableDays.length} days. Any number from 1 to 7 works.`}>
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button key={n} type="button" aria-pressed={days.length === n} onClick={() => setFrequency(n)} className={cn("aspect-square rounded-2xl border font-display text-3xl font-bold transition-all", days.length === n ? "border-accent bg-accent text-accent-fg glow" : "border-border bg-surface text-muted")}>
                  {n}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted">
              {days.length <= 2 ? "Great for busy weeks — full-body sessions maximise frequency per muscle." : days.length <= 4 ? "The sweet spot for most lifters — each muscle trained about twice a week." : "High frequency — keep an eye on recovery; FORGE will spread volume across days."}
            </p>
          </Section>
        )}

        {step === 2 && (
          <Section title="How long should it run?" sub="Programs are periodised into blocks with planned deloads.">
            <div className="grid grid-cols-3 gap-2">
              {DURATIONS.map((w) => (
                <button key={w} type="button" aria-pressed={!customWeeks && weeks === w} onClick={() => { setWeeks(w); setCustomWeeks(false); }} className={cn("rounded-2xl border py-4 transition-all", !customWeeks && weeks === w ? "border-accent bg-accent/10 glow" : "border-border bg-surface")}>
                  <div className="font-display text-3xl font-bold">{w}</div>
                  <div className="text-xs text-muted">weeks</div>
                </button>
              ))}
              <button type="button" aria-pressed={customWeeks} onClick={() => setCustomWeeks(true)} className={cn("rounded-2xl border py-4 transition-all", customWeeks ? "border-accent bg-accent/10 glow" : "border-border bg-surface")}>
                <div className="font-display text-3xl font-bold">…</div>
                <div className="text-xs text-muted">custom</div>
              </button>
            </div>
            {customWeeks && (
              <Card className="flex items-center justify-between">
                <span className="font-medium">Weeks</span>
                <Stepper value={weeks} onChange={setWeeks} min={1} max={52} label="Weeks" />
              </Card>
            )}
            {errors.weeks && <p className="text-sm text-danger">{errors.weeks}</p>}
          </Section>
        )}

        {step === 3 && (
          <Section title="Design each training day" sub="Combine any focuses — e.g. Chest + Triceps, Lower Body, or Back + Biceps + Core. Nothing is locked in.">
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              <span className="flex shrink-0 items-center text-xs font-semibold uppercase tracking-wider text-muted">Quick fill</span>
              {tpl.map((t) => (
                <Chip key={t.name} onClick={() => applyTemplate(t)} className="shrink-0">{t.name}</Chip>
              ))}
            </div>
            {errors.days && <p className="text-sm text-warn" role="alert">{errors.days}</p>}
            <div className="space-y-3">
              {days.map((d, i) => (
                <DayCard
                  key={d.id}
                  day={d}
                  index={i}
                  count={days.length}
                  error={errors[d.id]}
                  takenWeekdays={days.filter((x) => x.id !== d.id).map((x) => x.weekday)}
                  onChange={(nd) => setDays(days.map((x) => (x.id === d.id ? nd : x)))}
                  onRemove={() => setDays(days.filter((x) => x.id !== d.id))}
                  onMove={(dir) => {
                    const j = i + dir;
                    const list = [...days];
                    [list[i], list[j]] = [list[j], list[i]];
                    setDays(list);
                  }}
                />
              ))}
            </div>
            {days.length < 7 && (
              <Button variant="outline" className="w-full" onClick={() => setDays([...days, mkDay([], GOAL_DEFAULT_OBJECTIVE[goal])])}>
                <Plus className="h-4 w-4" /> Add training day
              </Button>
            )}
          </Section>
        )}

        {step === 4 && (
          <Section title="Set each session's objective" sub="Mix freely — a strength lower day and a hypertrophy upper day in the same week is fine.">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Apply to all</span>
              {(["hypertrophy", "strength", "power", "endurance", "conditioning", "mixed"] as SessionObjective[]).map((o) => (
                <Chip key={o} onClick={() => setDays(days.map((d) => ({ ...d, objective: o })))} className="h-8 text-[13px]">{OBJECTIVE_LABEL[o]}</Chip>
              ))}
            </div>
            <div className="space-y-3">
              {days.map((d, i) => (
                <Card key={d.id}>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">Day {i + 1}</div>
                  <div className="-mt-2 mb-3 font-semibold">{d.label || defaultDayLabel(d.focuses, d.objective)}</div>
                  <ObjectivePicker value={d.objective} onChange={(objective) => setDays(days.map((x) => (x.id === d.id ? { ...x, objective } : x)))} />
                </Card>
              ))}
            </div>
          </Section>
        )}

        {step === 5 && result && (
          <div className="space-y-5">
            <Card className="card-gradient">
              <Field label="Program name" htmlFor="pn">
                <Input id="pn" value={name || result.name} onChange={(e) => setName(e.target.value)} maxLength={50} />
              </Field>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Mini label="Goal" value={goal === "custom" ? customGoal || "Custom" : GOAL_LABEL[goal]} />
                <Mini label="Sessions" value={`${result.sessions.length}× / wk`} />
                <Mini label="Length" value={`${result.weeks} weeks`} />
              </div>
            </Card>
            <div className="space-y-2">
              <WeekTimeline weeks={result.weekPlans} current={previewWeek} onSelect={setPreviewWeek} />
              <PhaseLegend />
              <p className="text-sm text-muted">{result.weekPlans[previewWeek]?.note}</p>
            </div>
            {result.sessions.map((s, i) => (
              <SessionCard key={s.id} session={s} index={i} week={result.weekPlans[previewWeek]} />
            ))}
            <VolumeReport rows={result.volumeReport} />
            <p className="text-center text-xs text-muted">You can swap exercises, edit sets and reps, and rebuild any day after saving.</p>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[76px] z-30 border-t border-border bg-bg/90 backdrop-blur-xl lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-3xl gap-2 px-4 py-3">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} aria-label="Back"><ArrowLeft className="h-5 w-5" /></Button>
          )}
          {step < 5 ? (
            <Button size="lg" className="flex-1" onClick={next}>
              {step === 4 ? <><Sparkles className="h-5 w-5" /> Generate program</> : <>Continue <ArrowRight className="h-5 w-5" /></>}
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="lg" onClick={() => generate(Math.floor(Math.random() * 2 ** 31))} aria-label="Regenerate with different exercises">
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Button size="lg" className="flex-1" onClick={save}>Save & start</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
