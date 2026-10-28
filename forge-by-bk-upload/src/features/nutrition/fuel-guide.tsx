"use client";

import { useState } from "react";
import Link from "next/link";
import { Droplets, Lightbulb, Moon, Plus, Sunrise, Timer, Zap } from "lucide-react";
import {
  DURING_TIPS, FUEL_TIPS, PRE_TIMING_LABEL, dailyProtein, dayKey, defaultNutritionGoal, exampleMacros, postWorkout, preWorkout,
  type FuelExample, type FuelTargets, type Meal, type PreTiming,
} from "@/lib/nutrition";
import { useStore } from "@/lib/store";
import { Card, SectionTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/chip";
import { toast } from "@/components/ui/toast";
import { formatNumber } from "@/lib/utils";
import { makeEntry } from "./food-log";

function Target({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl bg-bg/40 p-2.5 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-display text-2xl font-bold tabular leading-tight">{value ? formatNumber(value) : "—"}<span className="ml-0.5 text-xs font-medium text-muted">{value ? unit : ""}</span></div>
    </div>
  );
}

function ExampleRow({ ex, meal }: { ex: FuelExample; meal: Meal }) {
  const addFood = useStore((s) => s.addFood);
  const m = exampleMacros(ex);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{ex.name}</div>
        <div className="text-xs text-muted">{ex.text}</div>
        <div className="mt-0.5 text-xs tabular text-muted">{formatNumber(m.kcal)} kcal · P {Math.round(m.proteinG)} · C {Math.round(m.carbsG)} · F {Math.round(m.fatG)}</div>
      </div>
      <button
        type="button"
        onClick={() => { addFood(makeEntry(dayKey(), meal, ex.name, m, 1, { servingLabel: "meal" })); toast(`Logged ${ex.name} to today`); }}
        aria-label={`Log ${ex.name} to today`}
        className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-accent/12 px-2.5 text-xs font-semibold text-accent active:scale-95"
      >
        <Plus className="h-3.5 w-3.5" /> Log
      </button>
    </li>
  );
}

function FuelCard({ title, icon, t, meal, children }: { title: string; icon: React.ReactNode; t: FuelTargets; meal: Meal; children?: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/12 text-accent">{icon}</span>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {children}
      <p className="mt-3 text-sm">{t.summary}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Target label="Carbs" value={t.carbsG} unit="g" />
        <Target label="Protein" value={t.proteinG} unit="g" />
        <Target label="Fluid" value={t.fluidMl} unit="ml" />
      </div>
      <p className="mt-3 text-xs text-muted">{t.fatNote}</p>
      <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">Ideas</div>
      <ul className="divide-y divide-border/60">{t.examples.map((ex) => <ExampleRow key={ex.name} ex={ex} meal={meal} />)}</ul>
    </Card>
  );
}

export function FuelGuide() {
  const profile = useStore((s) => s.profile)!;
  const [timing, setTiming] = useState<PreTiming>("meal");
  const weight = profile.weightKg;
  const w = weight ?? 75;
  const goal = profile.nutrition?.goal ?? defaultNutritionGoal(profile.primaryGoal);
  const pre = preWorkout(w, profile.primaryGoal, timing);
  const post = postWorkout(w, profile.primaryGoal, goal);
  const protein = dailyProtein(w);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        {weight ? <>Amounts are worked out for your body weight of <span className="font-semibold text-fg">{weight} kg</span>.</> : <>Amounts assume 75 kg. <Link href="/profile" className="font-semibold text-accent">Add your weight</Link> to personalise them.</>}
      </p>

      <FuelCard title="Before training" icon={<Sunrise className="h-4 w-4" />} t={pre} meal="pre">
        <div className="mt-3">
          <div className="mb-1.5 text-xs text-muted">How long until you train?</div>
          <Segmented ariaLabel="How long until you train" value={timing} onChange={setTiming} options={(Object.keys(PRE_TIMING_LABEL) as PreTiming[]).map((k) => ({ value: k, label: PRE_TIMING_LABEL[k] }))} />
        </div>
      </FuelCard>

      <Card>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-volt/12 text-volt"><Timer className="h-4 w-4" /></span>
          <h2 className="text-lg font-bold">During training</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm">{DURING_TIPS.map((t) => <li key={t} className="flex gap-2"><Droplets className="mt-0.5 h-4 w-4 shrink-0 text-volt" />{t}</li>)}</ul>
      </Card>

      <FuelCard title="After training" icon={<Zap className="h-4 w-4" />} t={post} meal="post" />

      <Card>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/12 text-accent"><Moon className="h-4 w-4" /></span>
          <h2 className="text-lg font-bold">Across the day</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          <li>Aim for <span className="font-semibold tabular">{protein.min}–{protein.max} g</span> of protein a day.</li>
          <li>Split it into 3–5 meals of about <span className="font-semibold tabular">{protein.perMeal} g</span> each.</li>
          <li>Build each meal around a protein, a carb, and fruit or veg — then adjust portions to your calorie target.</li>
          <li>On rest days, keep protein the same and trim some carbs.</li>
        </ul>
      </Card>

      <section>
        <SectionTitle>Tips &amp; tricks</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {FUEL_TIPS.map((t) => (
            <Card key={t.title} className="flex gap-3 p-3.5">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              <div>
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="text-xs text-muted">{t.body}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted">General sports-nutrition guidance for healthy adults, not medical advice. If you have a medical condition, an eating disorder history or are pregnant, speak to a dietitian.</p>
    </div>
  );
}
