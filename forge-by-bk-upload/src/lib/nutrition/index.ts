/**
 * Nutrition: daily targets, food logging maths and pre/post-training guidance. Pure, no React.
 * Guidance follows mainstream sports-nutrition position stands (protein 1.6–2.2 g/kg/day,
 * ~0.3–0.4 g/kg per meal, carbohydrate scaled to training demand, fluids scaled to body mass).
 */
import type { AthleteGoal, AthleteProfile, NutritionGoal, NutritionPlan } from "@/lib/engine/types";

export type { NutritionGoal, NutritionPlan };

export type Meal = "breakfast" | "lunch" | "dinner" | "snack" | "pre" | "post";

export const MEALS: Meal[] = ["breakfast", "pre", "post", "lunch", "dinner", "snack"];
export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
  pre: "Pre-workout",
  post: "Post-workout",
};

export interface Macros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface FoodEntry extends Macros {
  id: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  meal: Meal;
  name: string;
  /** Database food it came from, if any. Macros are already multiplied by servings. */
  foodId?: string;
  servings: number;
  servingLabel?: string;
  loggedAt: string;
  updatedAt: string;
  deleted?: boolean;
}

export type FoodCategory = "Carbs" | "Protein" | "Fats" | "Fruit & veg" | "Drinks" | "Snacks" | "Meals";

export interface Food extends Macros {
  id: string;
  name: string;
  serving: string;
  category: FoodCategory;
}

const f = (id: string, name: string, serving: string, category: FoodCategory, kcal: number, proteinG: number, carbsG: number, fatG: number): Food => ({ id, name, serving, category, kcal, proteinG, carbsG, fatG });

/** Common foods, values per stated serving (cooked weights unless noted). */
export const FOODS: Food[] = [
  f("oats", "Rolled oats (dry)", "40 g", "Carbs", 152, 5.3, 27, 2.7),
  f("white_rice", "White rice", "1 cup (160 g)", "Carbs", 205, 4.3, 45, 0.4),
  f("brown_rice", "Brown rice", "1 cup (195 g)", "Carbs", 216, 5, 45, 1.8),
  f("pasta", "Pasta", "1 cup (140 g)", "Carbs", 220, 8, 43, 1.3),
  f("wholegrain_bread", "Wholegrain bread", "1 slice (40 g)", "Carbs", 100, 4.5, 17, 1.5),
  f("white_bread", "White bread", "1 slice (30 g)", "Carbs", 80, 2.7, 15, 1),
  f("bagel", "Bagel, plain", "1 (100 g)", "Carbs", 270, 10, 53, 1.5),
  f("rice_cakes", "Rice cakes", "2 cakes (18 g)", "Carbs", 70, 1.4, 15, 0.5),
  f("potato", "Potato, baked", "1 medium (170 g)", "Carbs", 160, 4.3, 37, 0.2),
  f("sweet_potato", "Sweet potato", "1 medium (150 g)", "Carbs", 130, 2.4, 30, 0.2),
  f("quinoa", "Quinoa", "1 cup (185 g)", "Carbs", 222, 8, 39, 3.6),
  f("wrap", "Tortilla wrap", "1 large", "Carbs", 210, 6, 35, 5),
  f("granola", "Granola", "50 g", "Carbs", 230, 5, 32, 9),
  f("honey", "Honey", "1 tbsp (21 g)", "Carbs", 64, 0, 17, 0),

  f("chicken_breast", "Chicken breast", "100 g", "Protein", 165, 31, 0, 3.6),
  f("beef_mince", "Lean beef mince (5%)", "100 g", "Protein", 175, 26, 0, 8),
  f("salmon", "Salmon fillet", "100 g", "Protein", 206, 22, 0, 12),
  f("tuna", "Tuna in water", "1 can (95 g)", "Protein", 100, 23, 0, 1),
  f("eggs", "Eggs", "2 large", "Protein", 143, 12.6, 0.7, 9.5),
  f("egg_whites", "Egg whites", "100 ml", "Protein", 52, 11, 0.7, 0.2),
  f("greek_yogurt", "Greek yogurt, 0% fat", "170 g", "Protein", 100, 17, 6, 0.7),
  f("greek_yogurt_full", "Greek yogurt, full fat", "170 g", "Protein", 165, 15, 6, 8.5),
  f("cottage_cheese", "Cottage cheese, low fat", "113 g", "Protein", 90, 12, 4, 2.5),
  f("whey", "Whey protein", "1 scoop (30 g)", "Protein", 120, 24, 3, 1.5),
  f("tofu", "Tofu, firm", "100 g", "Protein", 145, 15.7, 3.5, 8.7),
  f("turkey_slices", "Turkey breast slices", "60 g", "Protein", 60, 13, 1, 0.5),
  f("protein_bar", "Protein bar", "1 bar (60 g)", "Protein", 220, 20, 24, 7),
  f("edamame", "Edamame", "1 cup (155 g)", "Protein", 190, 17, 14, 8),
  f("lentils", "Lentils", "1 cup (200 g)", "Protein", 230, 18, 40, 0.8),
  f("black_beans", "Black beans", "½ cup (86 g)", "Protein", 114, 7.6, 20, 0.5),

  f("peanut_butter", "Peanut butter", "1 tbsp (16 g)", "Fats", 95, 3.5, 3.5, 8),
  f("almonds", "Almonds", "28 g", "Fats", 165, 6, 6, 14),
  f("avocado", "Avocado", "½ fruit (100 g)", "Fats", 160, 2, 8.5, 14.7),
  f("olive_oil", "Olive oil", "1 tbsp", "Fats", 120, 0, 0, 13.5),
  f("cheddar", "Cheddar cheese", "30 g", "Fats", 120, 7, 0.4, 10),
  f("butter", "Butter", "10 g", "Fats", 72, 0.1, 0, 8.1),
  f("hummus", "Hummus", "2 tbsp (30 g)", "Fats", 70, 2, 4, 5),

  f("banana", "Banana", "1 medium", "Fruit & veg", 105, 1.3, 27, 0.4),
  f("apple", "Apple", "1 medium", "Fruit & veg", 95, 0.5, 25, 0.3),
  f("berries", "Mixed berries", "1 cup (150 g)", "Fruit & veg", 85, 1, 21, 0.5),
  f("dates", "Medjool dates", "3 dates", "Fruit & veg", 200, 1.3, 54, 0.1),
  f("broccoli", "Broccoli", "1 cup (90 g)", "Fruit & veg", 31, 2.5, 6, 0.3),
  f("salad", "Mixed salad leaves", "2 cups", "Fruit & veg", 20, 1.5, 4, 0.2),
  f("veg_mix", "Mixed vegetables", "1 cup", "Fruit & veg", 60, 3, 12, 0.5),

  f("milk", "Milk, semi-skimmed", "250 ml", "Drinks", 125, 8.5, 12, 4.5),
  f("choc_milk", "Chocolate milk", "300 ml", "Drinks", 210, 10, 32, 5),
  f("orange_juice", "Orange juice", "250 ml", "Drinks", 112, 1.7, 26, 0.5),
  f("sports_drink", "Sports drink", "500 ml", "Drinks", 130, 0, 34, 0),
  f("latte", "Latte", "350 ml", "Drinks", 180, 10, 15, 9),
  f("black_coffee", "Black coffee", "1 cup", "Drinks", 2, 0.3, 0, 0),
  f("soft_drink", "Soft drink", "1 can (330 ml)", "Drinks", 140, 0, 35, 0),

  f("dark_chocolate", "Dark chocolate", "20 g", "Snacks", 120, 1.5, 9, 8.5),
  f("trail_mix", "Trail mix", "40 g", "Snacks", 190, 5, 18, 12),
  f("beef_jerky", "Beef jerky", "30 g", "Snacks", 100, 15, 5, 2),

  f("pizza", "Pizza", "1 slice", "Meals", 285, 12, 36, 10),
  f("burger", "Burger", "1 burger", "Meals", 540, 30, 40, 28),
  f("fries", "Fries", "Medium (117 g)", "Meals", 365, 4, 48, 17),
  f("sushi", "Sushi roll", "8 pieces", "Meals", 255, 9, 38, 7),
  f("burrito", "Chicken burrito", "1 burrito", "Meals", 650, 35, 75, 22),
  f("caesar_salad", "Chicken Caesar salad", "1 bowl", "Meals", 450, 35, 15, 28),
];

export const FOOD_MAP: Record<string, Food> = Object.fromEntries(FOODS.map((x) => [x.id, x]));

/* ─────────────── Logging maths ─────────────── */

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Macros for a number of servings of a food. */
export function scaleMacros(m: Macros, servings: number): Macros {
  return { kcal: Math.round(m.kcal * servings), proteinG: round1(m.proteinG * servings), carbsG: round1(m.carbsG * servings), fatG: round1(m.fatG * servings) };
}

/** Calories implied by macros (4/4/9 kcal per gram). */
export const kcalFromMacros = (p: number, c: number, fat: number) => Math.round(p * 4 + c * 4 + fat * 9);

export function sumMacros(list: Macros[]): Macros {
  const t = list.reduce((a, x) => ({ kcal: a.kcal + x.kcal, proteinG: a.proteinG + x.proteinG, carbsG: a.carbsG + x.carbsG, fatG: a.fatG + x.fatG }), { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  return { kcal: Math.round(t.kcal), proteinG: round1(t.proteinG), carbsG: round1(t.carbsG), fatG: round1(t.fatG) };
}

/** Local YYYY-MM-DD for a date. */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + days));
}

export const entriesForDay = (entries: FoodEntry[], date: string) => entries.filter((e) => e.date === date && !e.deleted);

export const dayTotals = (entries: FoodEntry[], date: string) => sumMacros(entriesForDay(entries, date));

/** A sensible meal slot for the time of day. */
export function defaultMeal(hour: number): Meal {
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour >= 17 && hour < 21) return "dinner";
  return "snack";
}

/** Most recently logged distinct foods, newest first, for quick re-adding. */
export function recentFoods(entries: FoodEntry[], limit = 8): FoodEntry[] {
  const seen = new Set<string>();
  const out: FoodEntry[] = [];
  for (const e of [...entries].filter((x) => !x.deleted).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))) {
    const key = `${e.name.toLowerCase()}|${e.servings}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

export function searchFoods(q: string, list: Food[] = FOODS): Food[] {
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return list;
  return list.filter((x) => terms.every((t) => `${x.name} ${x.category}`.toLowerCase().includes(t)));
}

/* ─────────────── Daily targets ─────────────── */

export const NUTRITION_GOAL_LABEL: Record<NutritionGoal, string> = { lose: "Lose fat", maintain: "Maintain", gain: "Build muscle" };

const GOAL_ADJUST: Record<NutritionGoal, number> = { lose: -0.2, maintain: 0, gain: 0.1 };

export function defaultNutritionGoal(goal: AthleteGoal): NutritionGoal {
  if (goal === "hypertrophy" || goal === "strength" || goal === "power") return "gain";
  if (goal === "recomposition") return "lose";
  return "maintain";
}

/** Mifflin–St Jeor resting energy, kcal/day. Null when weight, height or age is unknown. */
export function bmr(p: Pick<AthleteProfile, "weightKg" | "heightCm" | "age" | "sex">): number | null {
  if (!p.weightKg || !p.heightCm || !p.age) return null;
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(base + (p.sex === "male" ? 5 : p.sex === "female" ? -161 : -78));
}

/** Activity multiplier from weekly training days (1.2 sedentary → 1.725 very active). */
export const activityFactor = (trainingDays: number) => Math.min(1.725, Math.round((1.2 + 0.075 * Math.max(0, trainingDays)) * 1000) / 1000);

/** Macros for a calorie target: protein and fat by body mass, carbs fill the rest. */
export function macrosFor(calories: number, weightKg: number | undefined, goal: NutritionGoal): Pick<NutritionPlan, "proteinG" | "carbsG" | "fatG"> {
  const w = weightKg ?? calories / 33;
  const proteinG = Math.round(w * (goal === "lose" ? 2.2 : 2.0));
  const fatG = Math.round(Math.max(w * 0.8, (calories * 0.22) / 9));
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { proteinG, carbsG, fatG };
}

export interface TargetSuggestion {
  plan: NutritionPlan;
  bmr: number;
  maintenance: number;
  factor: number;
}

/** Suggested daily target from the profile, or null if body stats are missing. */
export function suggestTarget(p: AthleteProfile, goal: NutritionGoal = defaultNutritionGoal(p.primaryGoal)): TargetSuggestion | null {
  const base = bmr(p);
  if (!base) return null;
  const factor = activityFactor(p.availableDays.length);
  const maintenance = Math.round(base * factor);
  const calories = Math.round((maintenance * (1 + GOAL_ADJUST[goal])) / 10) * 10;
  return { bmr: base, factor, maintenance, plan: { goal, calories, ...macrosFor(calories, p.weightKg, goal) } };
}

/* ─────────────── Pre / post training guidance ─────────────── */

export type PreTiming = "meal" | "snack" | "top_up";

export const PRE_TIMING_LABEL: Record<PreTiming, string> = { meal: "2–4 h", snack: "~1 h", top_up: "< 30 min" };

export interface FuelExample {
  name: string;
  /** Portions in plain words. */
  text: string;
  items: [foodId: string, servings: number][];
}

export interface FuelTargets {
  carbsG: number;
  proteinG: number;
  fluidMl: number;
  fatNote: string;
  summary: string;
  examples: FuelExample[];
}

const r5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
const r50 = (n: number) => Math.round(n / 50) * 50;

/** Higher-carb goals: endurance and field/court athletes burn more glycogen per session. */
const carbHeavy = (goal: AthleteGoal) => goal === "endurance" || goal === "athletic";

export function preWorkout(weightKg: number, goal: AthleteGoal, timing: PreTiming): FuelTargets {
  const hi = carbHeavy(goal);
  if (timing === "meal") {
    return {
      carbsG: r5(weightKg * (hi ? 1.5 : 1)),
      proteinG: r5(weightKg * 0.3),
      fluidMl: r50(weightKg * 6),
      fatNote: "Keep fat and fibre moderate so it's digested by the time you train.",
      summary: "A normal balanced meal: a carb base, a palm of lean protein, some veg.",
      examples: [
        { name: "Chicken, rice & veg", text: "130 g chicken, 1½ cups rice, a cup of veg", items: [["chicken_breast", 1.3], ["white_rice", 1.5], ["veg_mix", 1]] },
        { name: "Oats, banana & whey", text: "80 g oats, a banana, a scoop of whey", items: [["oats", 2], ["banana", 1], ["whey", 1]] },
        { name: "Bagel, turkey & fruit", text: "A bagel with 90 g turkey, an apple", items: [["bagel", 1], ["turkey_slices", 1.5], ["apple", 1]] },
      ],
    };
  }
  if (timing === "snack") {
    return {
      carbsG: r5(weightKg * (hi ? 0.75 : 0.5)),
      proteinG: r5(weightKg * 0.2),
      fluidMl: r50(weightKg * 5),
      fatNote: "Low fat and low fibre — skip nuts, salads and anything fried.",
      summary: "A light snack that's mostly fast carbs with a little protein.",
      examples: [
        { name: "Greek yogurt, banana & honey", text: "170 g Greek yogurt, a banana, a spoon of honey", items: [["greek_yogurt", 1], ["banana", 1], ["honey", 1]] },
        { name: "Rice cakes & banana", text: "2 rice cakes, a thin spread of peanut butter, a banana", items: [["rice_cakes", 1], ["banana", 1], ["peanut_butter", 0.5]] },
        { name: "Toast, honey & milk", text: "2 slices white toast with honey, a glass of milk", items: [["white_bread", 2], ["honey", 1], ["milk", 1]] },
      ],
    };
  }
  return {
    carbsG: r5(weightKg * 0.3),
    proteinG: 0,
    fluidMl: 250,
    fatNote: "Nothing heavy — just quick-digesting carbs, or skip it if you ate recently.",
    summary: "Only if you're hungry or training early: a small hit of quick carbs.",
    examples: [
      { name: "Banana", text: "One medium banana", items: [["banana", 1]] },
      { name: "Sports drink", text: "About 300 ml, sipped", items: [["sports_drink", 0.6]] },
      { name: "Dates", text: "2 Medjool dates", items: [["dates", 0.7]] },
    ],
  };
}

export function postWorkout(weightKg: number, goal: AthleteGoal, nutritionGoal: NutritionGoal): FuelTargets {
  const carbPerKg = carbHeavy(goal) ? 1.2 : nutritionGoal === "lose" ? 0.5 : 1;
  return {
    carbsG: r5(weightKg * carbPerKg),
    proteinG: Math.min(50, Math.max(20, r5(weightKg * 0.35))),
    fluidMl: r50(Math.max(500, weightKg * 8)),
    fatNote: "Fat is fine here — it doesn't stop recovery, just keeps you fuller.",
    summary: "Protein to repair muscle, carbs to refill glycogen, within about 2 hours.",
    examples: [
      { name: "Whey shake & banana", text: "1½ scoops whey in 250 ml milk, a banana", items: [["whey", 1.5], ["banana", 1], ["milk", 1]] },
      { name: "Chocolate milk", text: "About 450 ml", items: [["choc_milk", 1.5]] },
      { name: "Chicken rice bowl", text: "150 g chicken, 1½ cups rice, broccoli", items: [["chicken_breast", 1.5], ["white_rice", 1.5], ["broccoli", 1]] },
      { name: "Yogurt, granola & berries", text: "250 g Greek yogurt, 50 g granola, a cup of berries", items: [["greek_yogurt", 1.5], ["granola", 1], ["berries", 1]] },
      { name: "Eggs on toast & OJ", text: "3 eggs on 2 slices wholegrain toast, a glass of OJ", items: [["eggs", 1.5], ["wholegrain_bread", 2], ["orange_juice", 1]] },
    ],
  };
}

export function exampleMacros(ex: FuelExample): Macros {
  return sumMacros(ex.items.map(([id, n]) => scaleMacros(FOOD_MAP[id], n)));
}


export function dailyProtein(weightKg: number) {
  return { min: Math.round(weightKg * 1.6), max: Math.round(weightKg * 2.2), perMeal: r5(weightKg * 0.4) };
}

export const DURING_TIPS = [
  "Under an hour of lifting: water is all you need — sip 150–250 ml every 15–20 minutes.",
  "Sessions over 75–90 minutes, or hard conditioning: 30–60 g of carbs per hour (a sports drink or a banana).",
  "Training hot or sweating heavily: add electrolytes or a pinch of salt to your bottle.",
];

export const FUEL_TIPS: { title: string; body: string }[] = [
  { title: "Bananas, rice cakes and dates", body: "Fast carbs that are easy on the stomach. Keep a couple in your gym bag." },
  { title: "Keep pre-workout fat and fibre low", body: "Both slow digestion. Save salads, nuts and fried food for after training." },
  { title: "Training early? Don't go in on nothing", body: "If you can't eat 2 hours out, have a banana and a whey shake 30–45 minutes before." },
  { title: "Protein every 3–4 hours", body: "Four servings spread through the day beats one huge serving for muscle growth." },
  { title: "Weigh yourself before and after hard sessions", body: "Every kilogram lost is about 1–1.5 litres of fluid to drink back." },
  { title: "Chocolate milk is a real recovery drink", body: "Roughly 3:1 carbs to protein, cheap, and it's already in the fridge." },
  { title: "Caffeine: ~3 mg per kg, 30–60 min out", body: "It helps performance, but not if it costs you sleep. Avoid it within 8 hours of bed." },
  { title: "Prep two staples on the weekend", body: "Batch-cook one protein and one carb so hitting your numbers takes no thought." },
  { title: "Test new foods in training", body: "Never try a new pre-workout meal or supplement on competition day." },
  { title: "Log as you go", body: "Add food right after you eat. Recent foods sit at the top for one-tap re-adding." },
  { title: "A casein snack before bed", body: "Cottage cheese or Greek yogurt overnight gives your muscles a slow protein drip." },
];
