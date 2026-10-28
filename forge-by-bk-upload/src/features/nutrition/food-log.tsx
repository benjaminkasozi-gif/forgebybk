"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Pencil, Plus, Search, Trash2, Utensils } from "lucide-react";
import { newId } from "@/lib/engine";
import {
  FOODS, MEALS, MEAL_LABEL, NUTRITION_GOAL_LABEL, dayKey, dayTotals, defaultMeal, defaultNutritionGoal, entriesForDay, kcalFromMacros, macrosFor, recentFoods,
  scaleMacros, searchFoods, shiftDay, suggestTarget, sumMacros, type Food, type FoodEntry, type Macros, type Meal, type NutritionGoal,
} from "@/lib/nutrition";
import { useFoods, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, Segmented } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/input";
import { EmptyState, ProgressRing } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { toast } from "@/components/ui/toast";
import { cn, formatNumber } from "@/lib/utils";

const macroLine = (m: Macros) => `P ${Math.round(m.proteinG)} · C ${Math.round(m.carbsG)} · F ${Math.round(m.fatG)}`;

function dayLabel(key: string) {
  const today = dayKey();
  if (key === today) return "Today";
  if (key === shiftDay(today, -1)) return "Yesterday";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/** Build a log entry for today (or `date`) in one place so every add path is consistent. */
export function makeEntry(date: string, meal: Meal, name: string, macros: Macros, servings = 1, extra: Partial<FoodEntry> = {}): FoodEntry {
  const t = new Date().toISOString();
  return { id: newId(), date, meal, name, servings, ...macros, loggedAt: t, updatedAt: t, ...extra };
}

/* ─────────────── Summary ─────────────── */

function MacroBar({ label, value, target, tone }: { label: string; value: number; target?: number; tone: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="tabular text-muted">
          <span className="text-fg">{Math.round(value)}</span>
          {target ? ` / ${target} g` : " g"}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Summary({ totals, onEditTarget }: { totals: Macros; onEditTarget: () => void }) {
  const plan = useStore((s) => s.profile?.nutrition);
  if (!plan) {
    return (
      <Card className="card-gradient">
        <h2 className="text-lg font-bold">Set your daily calories</h2>
        <p className="mt-1 text-sm text-muted">Pick a target and FORGE tracks what&apos;s left as you log. We can suggest one from your profile.</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-muted">Eaten so far: <span className="font-semibold text-fg tabular">{formatNumber(totals.kcal)} kcal</span></span>
          <Button onClick={onEditTarget}>Set target</Button>
        </div>
      </Card>
    );
  }
  const left = plan.calories - totals.kcal;
  return (
    <Card className="card-gradient">
      <div className="flex items-center gap-5">
        <ProgressRing value={totals.kcal / plan.calories} size={116} stroke={9}>
          <div className="text-center leading-tight">
            <div className={cn("font-display text-3xl font-bold tabular", left < 0 && "text-warn")}>{formatNumber(Math.abs(left))}</div>
            <div className="text-[11px] text-muted">{left < 0 ? "kcal over" : "kcal left"}</div>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm">
              <span className="font-semibold tabular">{formatNumber(totals.kcal)}</span>
              <span className="text-muted"> / {formatNumber(plan.calories)} kcal</span>
            </div>
            <button type="button" onClick={onEditTarget} aria-label="Edit calorie target" className="-mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2">
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          <MacroBar label="Protein" value={totals.proteinG} target={plan.proteinG} tone="bg-accent" />
          <MacroBar label="Carbs" value={totals.carbsG} target={plan.carbsG} tone="bg-volt" />
          <MacroBar label="Fat" value={totals.fatG} target={plan.fatG} tone="bg-warn" />
        </div>
      </div>
    </Card>
  );
}

/* ─────────────── Target editor ─────────────── */

export function TargetSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const profile = useStore((s) => s.profile)!;
  const setProfile = useStore((s) => s.setProfile);
  const [goal, setGoal] = useState<NutritionGoal>(profile.nutrition?.goal ?? defaultNutritionGoal(profile.primaryGoal));
  const [calories, setCalories] = useState(profile.nutrition?.calories ?? suggestTarget(profile, goal)?.plan.calories ?? 2200);
  const suggestion = suggestTarget(profile, goal);
  const macros = macrosFor(calories, profile.weightKg, goal);
  const valid = calories >= 1000 && calories <= 6000;

  const save = () => {
    if (!valid) return;
    setProfile({ ...profile, nutrition: { goal, calories, ...macros } });
    toast("Calorie target saved");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Daily calorie target" description="Your macros are worked out from this and your body weight.">
      <div className="space-y-5">
        <Field label="Goal">
          <Segmented ariaLabel="Nutrition goal" value={goal} onChange={(g) => { setGoal(g); const s = suggestTarget(profile, g); if (s && !profile.nutrition) setCalories(s.plan.calories); }} options={(["lose", "maintain", "gain"] as const).map((g) => ({ value: g, label: NUTRITION_GOAL_LABEL[g] }))} />
        </Field>

        <Field label="Calories per day" htmlFor="kcal-target" error={valid ? undefined : "Choose between 1,000 and 6,000 kcal."}>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="secondary" className="h-11 w-11" aria-label="50 fewer calories" onClick={() => setCalories(Math.max(1000, calories - 50))}><Minus className="h-4 w-4" /></Button>
            <Input id="kcal-target" type="number" inputMode="numeric" className="flex-1 text-center text-lg font-semibold tabular" value={calories || ""} onChange={(e) => setCalories(Number(e.target.value) || 0)} aria-invalid={!valid} />
            <Button size="icon" variant="secondary" className="h-11 w-11" aria-label="50 more calories" onClick={() => setCalories(Math.min(6000, calories + 50))}><Plus className="h-4 w-4" /></Button>
          </div>
        </Field>

        {suggestion ? (
          <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">Suggested: {formatNumber(suggestion.plan.calories)} kcal</div>
                <div className="text-xs text-muted">
                  Resting {formatNumber(suggestion.bmr)} × {suggestion.factor.toFixed(2)} activity ({profile.availableDays.length} training days) = {formatNumber(suggestion.maintenance)} to maintain
                  {goal === "lose" ? ", minus 20%" : goal === "gain" ? ", plus 10%" : ""}.
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCalories(suggestion.plan.calories)}>Use</Button>
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">Add your age, height and weight in Profile to get a suggested target.</p>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Protein", macros.proteinG],
            ["Carbs", macros.carbsG],
            ["Fat", macros.fatG],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-surface-2 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted">{l}</div>
              <div className="font-semibold tabular">{v} g</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">General guidance, not medical advice. If you have a health condition or are pregnant, check with a dietitian.</p>
        <Button size="lg" className="w-full" disabled={!valid} onClick={save}>Save target</Button>
      </div>
    </Sheet>
  );
}

/* ─────────────── Add food ─────────────── */

function MealPicker({ value, onChange }: { value: Meal; onChange: (m: Meal) => void }) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="radiogroup" aria-label="Meal">
      {MEALS.map((m) => <Chip key={m} selected={value === m} onClick={() => onChange(m)} className="shrink-0">{MEAL_LABEL[m]}</Chip>)}
    </div>
  );
}

function CustomFoodForm({ onAdd }: { onAdd: (name: string, macros: Macros, servings: number) => void }) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [fat, setFat] = useState("");
  const [servings, setServings] = useState(1);
  const [tried, setTried] = useState(false);
  const num = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);
  const implied = kcalFromMacros(num(p), num(c), num(fat));
  const calories = kcal ? num(kcal) : implied;
  const nameErr = !name.trim() ? "Give it a name." : undefined;
  const kcalErr = calories <= 0 ? "Enter calories, or macros so we can work them out." : calories > 5000 ? "That's over 5,000 kcal per serving." : undefined;

  const submit = () => {
    setTried(true);
    if (nameErr || kcalErr) return;
    onAdd(name.trim().slice(0, 60), scaleMacros({ kcal: calories, proteinG: num(p), carbsG: num(c), fatG: num(fat) }, servings), servings);
  };

  return (
    <div className="space-y-4">
      <Field label="Food name" htmlFor="cf-name" error={tried ? nameErr : undefined}>
        <Input id="cf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mum's lasagne" aria-invalid={tried && Boolean(nameErr)} />
      </Field>
      <Field label="Calories per serving" htmlFor="cf-kcal" hint={!kcal && implied ? `Worked out from macros: ${implied} kcal` : "Leave blank to work it out from macros."} error={tried ? kcalErr : undefined}>
        <Input id="cf-kcal" type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder={implied ? String(implied) : "kcal"} aria-invalid={tried && Boolean(kcalErr)} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        {([["Protein", p, setP], ["Carbs", c, setC], ["Fat", fat, setFat]] as const).map(([l, v, setV]) => (
          <Field key={l} label={`${l} (g)`} htmlFor={`cf-${l}`}>
            <Input id={`cf-${l}`} type="number" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} placeholder="0" />
          </Field>
        ))}
      </div>
      <Field label="Servings">
        <Stepper value={servings} onChange={setServings} min={0.25} max={20} step={0.25} label="servings" />
      </Field>
      <Button size="lg" className="w-full" onClick={submit}>Add {calories > 0 ? `${formatNumber(Math.round(calories * servings))} kcal` : "food"}</Button>
    </div>
  );
}

export function AddFoodSheet({ open, onOpenChange, date, initialMeal }: { open: boolean; onOpenChange: (o: boolean) => void; date: string; initialMeal?: Meal }) {
  const addFood = useStore((s) => s.addFood);
  const entries = useFoods();
  const [meal, setMeal] = useState<Meal>(initialMeal ?? defaultMeal(new Date().getHours()));
  const [mode, setMode] = useState<"search" | "custom">("search");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<{ name: string; serving: string; base: Macros; foodId?: string } | null>(null);
  const [servings, setServings] = useState(1);
  const recent = useMemo(() => recentFoods(entries), [entries]);
  const results = useMemo(() => searchFoods(q), [q]);

  const add = (name: string, macros: Macros, n: number, extra: Partial<FoodEntry> = {}) => {
    addFood(makeEntry(date, meal, name, macros, n, extra));
    toast(`Added ${name} · ${formatNumber(macros.kcal)} kcal`);
    setPicked(null);
    setServings(1);
    setQ("");
  };

  const pick = (x: Food) => { setPicked({ name: x.name, serving: x.serving, base: x, foodId: x.id }); setServings(1); };
  const pickRecent = (e: FoodEntry) => {
    const per = scaleMacros(e, 1 / (e.servings || 1));
    setPicked({ name: e.name, serving: e.servingLabel ?? "serving", base: per, foodId: e.foodId });
    setServings(e.servings);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setPicked(null); }} title="Add food" description={`${dayLabel(date)} · ${MEAL_LABEL[meal]}`}>
      <div className="space-y-4">
        <MealPicker value={meal} onChange={setMeal} />
        <Segmented ariaLabel="Add mode" value={mode} onChange={setMode} options={[{ value: "search", label: "Search foods" }, { value: "custom", label: "Custom" }]} />

        {mode === "custom" ? (
          <CustomFoodForm onAdd={(name, m, n) => add(name, m, n)} />
        ) : picked ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4">
              <div className="font-semibold">{picked.name}</div>
              <div className="text-xs text-muted">1 serving = {picked.serving} · {formatNumber(picked.base.kcal)} kcal</div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Stepper value={servings} onChange={setServings} min={0.25} max={20} step={0.25} label="servings" suffix="srv" />
                <div className="text-right">
                  <div className="font-display text-2xl font-bold tabular">{formatNumber(scaleMacros(picked.base, servings).kcal)}</div>
                  <div className="text-[11px] text-muted">kcal</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted tabular">{macroLine(scaleMacros(picked.base, servings))}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setPicked(null)}>Back</Button>
              <Button onClick={() => add(picked.name, scaleMacros(picked.base, servings), servings, { foodId: picked.foodId, servingLabel: picked.serving })}>Add</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search e.g. oats, chicken, banana" className="pl-9" aria-label="Search foods" />
            </div>
            {!q && recent.length > 0 && (
              <section>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Recent</div>
                <ul className="divide-y divide-border/60">
                  {recent.map((e) => (
                    <FoodRow key={e.id} name={e.name} sub={`${e.servings} × ${e.servingLabel ?? "serving"}`} kcal={e.kcal} onPick={() => pickRecent(e)} onQuickAdd={() => add(e.name, scaleMacros(e, 1), e.servings, { foodId: e.foodId, servingLabel: e.servingLabel })} />
                  ))}
                </ul>
              </section>
            )}
            <section>
              {!q && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Common foods</div>}
              {results.length ? (
                <ul className="divide-y divide-border/60">
                  {results.map((x) => <FoodRow key={x.id} name={x.name} sub={`${x.serving} · ${x.category}`} kcal={x.kcal} onPick={() => pick(x)} onQuickAdd={() => add(x.name, scaleMacros(x, 1), 1, { foodId: x.id, servingLabel: x.serving })} />)}
                </ul>
              ) : (
                <div className="py-6 text-center text-sm text-muted">
                  No match for “{q}”.{" "}
                  <button type="button" className="font-semibold text-accent" onClick={() => setMode("custom")}>Add it as a custom food</button>
                </div>
              )}
            </section>
            <p className="text-center text-xs text-muted">{FOODS.length} common foods · values are typical averages</p>
          </>
        )}
      </div>
    </Sheet>
  );
}

function FoodRow({ name, sub, kcal, onPick, onQuickAdd }: { name: string; sub: string; kcal: number; onPick: () => void; onQuickAdd: () => void }) {
  return (
    <li className="flex items-center gap-2">
      <button type="button" onClick={onPick} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-2.5 text-left">
        <span className="min-w-0">
          <span className="block truncate font-medium">{name}</span>
          <span className="block truncate text-xs text-muted">{sub}</span>
        </span>
        <span className="shrink-0 text-sm tabular text-muted">{formatNumber(kcal)} kcal</span>
      </button>
      <button type="button" onClick={onQuickAdd} aria-label={`Quick add ${name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent active:scale-95">
        <Plus className="h-4 w-4" />
      </button>
    </li>
  );
}

/* ─────────────── The day's log ─────────────── */

function MealCard({ meal, entries, onAdd }: { meal: Meal; entries: FoodEntry[]; onAdd: () => void }) {
  const deleteFood = useStore((s) => s.deleteFood);
  const total = sumMacros(entries);
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <div>
          <h3 className="font-semibold">{MEAL_LABEL[meal]}</h3>
          {entries.length > 0 && <div className="text-xs text-muted tabular">{formatNumber(total.kcal)} kcal · {macroLine(total)}</div>}
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onAdd} aria-label={`Add food to ${MEAL_LABEL[meal]}`}><Plus className="h-4 w-4" /></Button>
      </div>
      {entries.length > 0 && (
        <ul className="divide-y divide-border/60 px-4 pb-1">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{e.name}</div>
                <div className="truncate text-xs text-muted tabular">{e.servings !== 1 ? `${e.servings} × ` : ""}{e.servingLabel ?? "serving"} · {macroLine(e)}</div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular">{formatNumber(e.kcal)}</span>
              <button type="button" onClick={() => { deleteFood(e.id); toast(`Removed ${e.name}`); }} aria-label={`Remove ${e.name}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function FoodLog() {
  const entries = useFoods();
  const [date, setDate] = useState(dayKey());
  const [adding, setAdding] = useState<{ meal?: Meal } | null>(null);
  const [editingTarget, setEditingTarget] = useState(false);
  const today = dayKey();
  const day = entriesForDay(entries, date);
  const totals = dayTotals(entries, date);
  const byMeal = MEALS.map((m) => ({ meal: m, items: day.filter((e) => e.meal === m) }));
  const shown = byMeal.filter((g) => g.items.length > 0 || g.meal === "breakfast" || g.meal === "lunch" || g.meal === "dinner");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button size="icon" variant="ghost" aria-label="Previous day" onClick={() => setDate(shiftDay(date, -1))}><ChevronLeft className="h-5 w-5" /></Button>
        <button type="button" onClick={() => setDate(today)} className="text-sm font-semibold" aria-live="polite">{dayLabel(date)}</button>
        <Button size="icon" variant="ghost" aria-label="Next day" disabled={date >= today} onClick={() => setDate(shiftDay(date, 1))}><ChevronRight className="h-5 w-5" /></Button>
      </div>

      <Summary totals={totals} onEditTarget={() => setEditingTarget(true)} />

      <Button size="lg" className="w-full" onClick={() => setAdding({})}><Plus className="h-5 w-5" /> Add food</Button>

      {day.length === 0 && (
        <EmptyState icon={<Utensils className="h-6 w-6" />} title={date === today ? "Nothing logged yet today" : "Nothing logged this day"} body="Add food as you go — search common foods, re-add recent ones, or enter your own." />
      )}

      <div className="space-y-3">
        {shown.map((g) => <MealCard key={g.meal} meal={g.meal} entries={g.items} onAdd={() => setAdding({ meal: g.meal })} />)}
      </div>

      {adding && <AddFoodSheet open onOpenChange={(o) => !o && setAdding(null)} date={date} initialMeal={adding.meal} />}
      {editingTarget && <TargetSheet open onOpenChange={setEditingTarget} />}
    </div>
  );
}
