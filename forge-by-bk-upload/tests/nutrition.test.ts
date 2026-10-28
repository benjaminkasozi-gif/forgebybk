import { describe, expect, it } from "vitest";
import {
  FOODS, FOOD_MAP, bmr, dayKey, dayTotals, defaultMeal, exampleMacros, kcalFromMacros, macrosFor, postWorkout, preWorkout, recentFoods, scaleMacros, searchFoods,
  shiftDay, suggestTarget, type FoodEntry,
} from "@/lib/nutrition";
import { profile } from "./fixtures";

const entry = (o: Partial<FoodEntry>): FoodEntry => ({
  id: Math.random().toString(36), date: "2026-10-28", meal: "lunch", name: "Food", servings: 1, kcal: 100, proteinG: 10, carbsG: 10, fatG: 2,
  loggedAt: "2026-10-28T12:00:00Z", updatedAt: "2026-10-28T12:00:00Z", ...o,
});

describe("nutrition targets", () => {
  it("computes Mifflin–St Jeor resting energy", () => {
    // 10×80 + 6.25×180 − 5×30 + 5 = 1780
    expect(bmr({ weightKg: 80, heightCm: 180, age: 30, sex: "male" })).toBe(1780);
    expect(bmr({ weightKg: 60, heightCm: 165, age: 30, sex: "female" })).toBe(1320);
    expect(bmr({ weightKg: 80 })).toBeNull();
  });

  it("adjusts the suggestion for the goal and training days", () => {
    const p = { ...profile(), weightKg: 80, heightCm: 180, age: 30, sex: "male" as const, availableDays: [0, 2, 4] as never };
    const lose = suggestTarget(p, "lose")!;
    const keep = suggestTarget(p, "maintain")!;
    const gain = suggestTarget(p, "gain")!;
    expect(keep.maintenance).toBe(Math.round(1780 * 1.425));
    expect(lose.plan.calories).toBeLessThan(keep.plan.calories);
    expect(gain.plan.calories).toBeGreaterThan(keep.plan.calories);
    expect(suggestTarget({ ...p, age: undefined })).toBeNull();
  });

  it("macros add back up to the calorie target and protein scales with body mass", () => {
    for (const kcal of [1800, 2500, 3400]) {
      const m = macrosFor(kcal, 80, "maintain");
      expect(Math.abs(kcalFromMacros(m.proteinG, m.carbsG, m.fatG) - kcal)).toBeLessThan(10);
      expect(m.proteinG).toBe(160);
    }
    expect(macrosFor(2000, 80, "lose").proteinG).toBe(176);
  });
});

describe("food database and logging", () => {
  it("every food's calories match its macros", () => {
    const off = FOODS.filter((f) => Math.abs(kcalFromMacros(f.proteinG, f.carbsG, f.fatG) - f.kcal) > Math.max(25, f.kcal * 0.12)).map((f) => f.id);
    expect(off).toEqual([]);
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
  });

  it("scales servings and totals a day, ignoring deleted entries and other days", () => {
    expect(scaleMacros(FOOD_MAP.banana, 2).kcal).toBe(210);
    const list = [entry({ kcal: 300 }), entry({ kcal: 200, deleted: true }), entry({ kcal: 500, date: "2026-10-27" }), entry({ kcal: 150, proteinG: 25 })];
    const t = dayTotals(list, "2026-10-28");
    expect(t.kcal).toBe(450);
    expect(t.proteinG).toBe(35);
  });

  it("recent foods are distinct and newest first", () => {
    const list = [
      entry({ name: "Oats", loggedAt: "2026-10-28T07:00:00Z" }),
      entry({ name: "Eggs", loggedAt: "2026-10-28T08:00:00Z" }),
      entry({ name: "oats", loggedAt: "2026-10-28T09:00:00Z" }),
    ];
    expect(recentFoods(list).map((e) => e.name)).toEqual(["oats", "Eggs"]);
  });

  it("searches by name and category", () => {
    expect(searchFoods("chicken").map((f) => f.id)).toContain("chicken_breast");
    expect(searchFoods("drinks").every((f) => f.category === "Drinks")).toBe(true);
    expect(searchFoods("zzz")).toEqual([]);
  });

  it("handles day keys across month boundaries", () => {
    expect(shiftDay("2026-11-01", -1)).toBe("2026-10-31");
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(defaultMeal(7)).toBe("breakfast");
    expect(defaultMeal(18)).toBe("dinner");
  });
});

describe("pre and post training guidance", () => {
  it("scales with body weight and timing", () => {
    const light = preWorkout(60, "hypertrophy", "meal");
    const heavy = preWorkout(100, "hypertrophy", "meal");
    expect(heavy.carbsG).toBeGreaterThan(light.carbsG);
    expect(preWorkout(80, "hypertrophy", "snack").carbsG).toBeLessThan(preWorkout(80, "hypertrophy", "meal").carbsG);
    expect(preWorkout(80, "hypertrophy", "top_up").proteinG).toBe(0);
    expect(preWorkout(80, "endurance", "meal").carbsG).toBeGreaterThan(preWorkout(80, "strength", "meal").carbsG);
  });

  it("keeps post-workout protein in the 20–50 g range", () => {
    expect(postWorkout(45, "hypertrophy", "maintain").proteinG).toBe(20);
    expect(postWorkout(80, "hypertrophy", "maintain").proteinG).toBe(30);
    expect(postWorkout(200, "hypertrophy", "maintain").proteinG).toBe(50);
    expect(postWorkout(80, "hypertrophy", "lose").carbsG).toBeLessThan(postWorkout(80, "hypertrophy", "gain").carbsG);
  });

  it("every example meal uses real foods", () => {
    for (const t of [preWorkout(80, "health", "meal"), preWorkout(80, "health", "snack"), preWorkout(80, "health", "top_up"), postWorkout(80, "health", "maintain")]) {
      for (const ex of t.examples) {
        for (const [id] of ex.items) expect(FOOD_MAP[id], `${ex.name}: ${id}`).toBeDefined();
        expect(exampleMacros(ex).kcal).toBeGreaterThan(0);
      }
    }
  });
});
