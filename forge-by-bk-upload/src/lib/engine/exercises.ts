import type { Equipment, Exercise, Joint, Mechanics, Muscle, Pattern } from "./types";

type Opts = {
  sec?: Muscle[];
  mech?: Mechanics;
  diff?: 1 | 2 | 3;
  fat?: 1 | 2 | 3;
  stress?: Partial<Record<Joint, 1 | 2 | 3>>;
  uni?: boolean;
  loaded?: boolean;
  timed?: boolean;
  inc?: number;
  cues?: string[];
};

function ex(id: string, name: string, pattern: Pattern, primary: Muscle[], equipment: Equipment[], o: Opts = {}): Exercise {
  const mechanics = o.mech ?? "compound";
  return {
    id,
    name,
    pattern,
    primary,
    secondary: o.sec ?? [],
    equipment,
    mechanics,
    difficulty: o.diff ?? 1,
    fatigue: o.fat ?? (mechanics === "compound" ? 2 : 1),
    stress: o.stress ?? {},
    unilateral: o.uni,
    loaded: o.loaded ?? !equipment.every((e) => e === "bodyweight" || e === "pullup_bar" || e === "dip_station" || e === "box"),
    timed: o.timed,
    increment: o.inc ?? (equipment.includes("barbell") || equipment.includes("trap_bar") ? 2.5 : equipment.includes("dumbbell") ? 2 : 2.5),
    cues: o.cues ?? [],
  };
}

const ISO: Pick<Opts, "mech" | "fat"> = { mech: "isolation", fat: 1 };

export const EXERCISES: Exercise[] = [
  // ── Horizontal push ──────────────────────────────────────────
  ex("bb_bench", "Barbell Bench Press", "horizontal_push", ["chest"], ["barbell", "bench", "rack"], {
    sec: ["triceps", "front_delts"], diff: 2, stress: { shoulder: 2, elbow: 1, wrist: 1 },
    cues: ["Shoulder blades pinned back and down", "Bar to lower chest, forearms vertical", "Drive feet into floor"],
  }),
  ex("db_bench", "Dumbbell Bench Press", "horizontal_push", ["chest"], ["dumbbell", "bench"], {
    sec: ["triceps", "front_delts"], stress: { shoulder: 1 }, cues: ["Neutral-to-pronated grip", "Deep stretch at the bottom", "Press up and slightly in"],
  }),
  ex("machine_chest_press", "Machine Chest Press", "horizontal_push", ["chest"], ["machine"], {
    sec: ["triceps", "front_delts"], stress: { shoulder: 1 }, cues: ["Handles at mid-chest", "Control the eccentric"],
  }),
  ex("pushup", "Push-Up", "horizontal_push", ["chest"], ["bodyweight"], {
    sec: ["triceps", "front_delts", "abs"], stress: { wrist: 1, shoulder: 1 }, cues: ["Rigid plank from head to heels", "Elbows ~45° from torso"],
  }),
  ex("dips", "Chest Dip", "horizontal_push", ["chest", "triceps"], ["dip_station"], {
    sec: ["front_delts"], diff: 2, stress: { shoulder: 3, elbow: 1 }, cues: ["Lean torso forward", "Stop at comfortable shoulder depth"],
  }),
  ex("smith_bench", "Smith Machine Bench Press", "horizontal_push", ["chest"], ["smith", "bench"], {
    sec: ["triceps", "front_delts"], stress: { shoulder: 2 }, cues: ["Bar path to lower chest", "Full lockout"],
  }),
  // ── Incline push ────────────────────────────────────────────
  ex("incline_bb_bench", "Incline Barbell Press", "incline_push", ["chest", "front_delts"], ["barbell", "bench", "rack"], {
    sec: ["triceps"], diff: 2, stress: { shoulder: 2 }, cues: ["30–45° bench", "Bar to upper chest"],
  }),
  ex("incline_db_press", "Incline Dumbbell Press", "incline_push", ["chest", "front_delts"], ["dumbbell", "bench"], {
    sec: ["triceps"], stress: { shoulder: 1 }, cues: ["30° bench angle", "Elbows slightly tucked"],
  }),
  ex("incline_machine_press", "Incline Machine Press", "incline_push", ["chest", "front_delts"], ["machine"], {
    sec: ["triceps"], stress: { shoulder: 1 },
  }),
  ex("deficit_pushup", "Feet-Elevated Push-Up", "incline_push", ["chest", "front_delts"], ["bodyweight", "box"], {
    sec: ["triceps"], stress: { wrist: 1, shoulder: 1 },
  }),
  // ── Fly ─────────────────────────────────────────────────────
  ex("cable_fly", "Cable Fly", "chest_fly", ["chest"], ["cable"], { ...ISO, stress: { shoulder: 1 }, cues: ["Soft elbows", "Hug a tree, squeeze at midline"] }),
  ex("pec_deck", "Pec Deck", "chest_fly", ["chest"], ["machine"], { ...ISO, stress: { shoulder: 1 } }),
  ex("db_fly", "Dumbbell Fly", "chest_fly", ["chest"], ["dumbbell", "bench"], { ...ISO, stress: { shoulder: 2 } }),
  ex("band_fly", "Band Chest Fly", "chest_fly", ["chest"], ["bands"], { ...ISO }),
  // ── Vertical push ───────────────────────────────────────────
  ex("ohp", "Standing Overhead Press", "vertical_push", ["front_delts"], ["barbell", "rack"], {
    sec: ["triceps", "side_delts", "abs"], diff: 2, stress: { shoulder: 2, lower_back: 1 }, cues: ["Glutes and abs braced", "Head through at lockout"],
  }),
  ex("db_shoulder_press", "Seated Dumbbell Shoulder Press", "vertical_push", ["front_delts"], ["dumbbell", "bench"], {
    sec: ["triceps", "side_delts"], stress: { shoulder: 2 }, cues: ["Forearms vertical", "Press slightly in front of head"],
  }),
  ex("machine_shoulder_press", "Machine Shoulder Press", "vertical_push", ["front_delts"], ["machine"], { sec: ["triceps", "side_delts"], stress: { shoulder: 1 } }),
  ex("landmine_press", "Half-Kneeling Landmine Press", "vertical_push", ["front_delts"], ["landmine", "barbell"], {
    sec: ["chest", "triceps", "abs"], uni: true, cues: ["Shoulder-friendly angled press", "Ribs down"],
  }),
  ex("pike_pushup", "Pike Push-Up", "vertical_push", ["front_delts"], ["bodyweight"], { sec: ["triceps"], diff: 2, stress: { shoulder: 2, wrist: 1 } }),
  ex("kb_press", "Kettlebell Press", "vertical_push", ["front_delts"], ["kettlebell"], { sec: ["triceps"], uni: true, stress: { shoulder: 1 }, inc: 4 }),
  // ── Lateral / rear delt ─────────────────────────────────────
  ex("db_lateral_raise", "Dumbbell Lateral Raise", "lateral_raise", ["side_delts"], ["dumbbell"], { ...ISO, inc: 1, cues: ["Lead with elbows", "Stop at shoulder height"] }),
  ex("cable_lateral_raise", "Cable Lateral Raise", "lateral_raise", ["side_delts"], ["cable"], { ...ISO, uni: true, inc: 1.25 }),
  ex("machine_lateral_raise", "Machine Lateral Raise", "lateral_raise", ["side_delts"], ["machine"], { ...ISO }),
  ex("band_lateral_raise", "Band Lateral Raise", "lateral_raise", ["side_delts"], ["bands"], { ...ISO }),
  ex("reverse_pec_deck", "Reverse Pec Deck", "rear_delt", ["rear_delts"], ["machine"], { ...ISO, sec: ["upper_back"] }),
  ex("face_pull", "Cable Face Pull", "rear_delt", ["rear_delts"], ["cable"], { ...ISO, sec: ["upper_back", "traps"], cues: ["Pull to forehead", "Externally rotate at the end"] }),
  ex("db_rear_delt_fly", "Bent-Over Rear Delt Fly", "rear_delt", ["rear_delts"], ["dumbbell"], { ...ISO, sec: ["upper_back"], stress: { lower_back: 1 }, inc: 1 }),
  ex("band_pull_apart", "Band Pull-Apart", "rear_delt", ["rear_delts"], ["bands"], { ...ISO, sec: ["upper_back"] }),
  // ── Vertical pull ───────────────────────────────────────────
  ex("pullup", "Pull-Up", "vertical_pull", ["lats"], ["pullup_bar"], {
    sec: ["biceps", "upper_back"], diff: 2, stress: { shoulder: 1, elbow: 1 }, cues: ["Full hang to chin over bar", "Drive elbows to hips"],
  }),
  ex("chinup", "Chin-Up", "vertical_pull", ["lats", "biceps"], ["pullup_bar"], { sec: ["upper_back"], diff: 2, stress: { elbow: 1 } }),
  ex("lat_pulldown", "Lat Pulldown", "vertical_pull", ["lats"], ["cable"], { sec: ["biceps", "upper_back"], cues: ["Chest up to the bar", "Control the stretch"] }),
  ex("neutral_pulldown", "Neutral-Grip Pulldown", "vertical_pull", ["lats"], ["cable"], { sec: ["biceps", "upper_back"] }),
  ex("assisted_pullup", "Assisted Pull-Up", "vertical_pull", ["lats"], ["machine"], { sec: ["biceps", "upper_back"] }),
  ex("band_pulldown", "Band Lat Pulldown", "vertical_pull", ["lats"], ["bands"], { sec: ["biceps"] }),
  // ── Horizontal pull ─────────────────────────────────────────
  ex("bb_row", "Barbell Row", "horizontal_pull", ["upper_back", "lats"], ["barbell"], {
    sec: ["biceps", "rear_delts", "lower_back"], diff: 2, fat: 2, stress: { lower_back: 2 }, cues: ["Hinge to ~45°", "Pull to lower ribs"],
  }),
  ex("db_row", "One-Arm Dumbbell Row", "horizontal_pull", ["lats", "upper_back"], ["dumbbell", "bench"], { sec: ["biceps", "rear_delts"], uni: true, cues: ["Pull elbow to hip", "Square hips"] }),
  ex("chest_supported_row", "Chest-Supported Row", "horizontal_pull", ["upper_back", "lats"], ["dumbbell", "bench"], { sec: ["biceps", "rear_delts"] }),
  ex("seated_cable_row", "Seated Cable Row", "horizontal_pull", ["upper_back", "lats"], ["cable"], { sec: ["biceps", "rear_delts"] }),
  ex("machine_row", "Machine Row", "horizontal_pull", ["upper_back", "lats"], ["machine"], { sec: ["biceps", "rear_delts"] }),
  ex("inverted_row", "Inverted Row", "horizontal_pull", ["upper_back", "lats"], ["rack", "barbell"], { sec: ["biceps", "rear_delts"], loaded: false }),
  ex("band_row", "Band Row", "horizontal_pull", ["upper_back", "lats"], ["bands"], { sec: ["biceps"] }),
  ex("kb_row", "Kettlebell Gorilla Row", "horizontal_pull", ["upper_back", "lats"], ["kettlebell"], { sec: ["biceps"], uni: true, stress: { lower_back: 1 }, inc: 4 }),
  // ── Pullover / shrug ────────────────────────────────────────
  ex("cable_pullover", "Straight-Arm Cable Pulldown", "pullover", ["lats"], ["cable"], { ...ISO }),
  ex("db_pullover", "Dumbbell Pullover", "pullover", ["lats", "chest"], ["dumbbell", "bench"], { ...ISO, stress: { shoulder: 1 } }),
  ex("db_shrug", "Dumbbell Shrug", "shrug", ["traps"], ["dumbbell"], { ...ISO }),
  ex("bb_shrug", "Barbell Shrug", "shrug", ["traps"], ["barbell"], { ...ISO }),
  // ── Elbow flexion ───────────────────────────────────────────
  ex("bb_curl", "Barbell Curl", "elbow_flexion", ["biceps"], ["barbell"], { ...ISO, sec: ["forearms"], stress: { wrist: 1, elbow: 1 }, inc: 1.25 }),
  ex("db_curl", "Dumbbell Curl", "elbow_flexion", ["biceps"], ["dumbbell"], { ...ISO, sec: ["forearms"], inc: 1, cues: ["Supinate as you curl", "No swinging"] }),
  ex("incline_db_curl", "Incline Dumbbell Curl", "elbow_flexion", ["biceps"], ["dumbbell", "bench"], { ...ISO, inc: 1, cues: ["Arms hang behind torso for a long-length stretch"] }),
  ex("hammer_curl", "Hammer Curl", "elbow_flexion", ["biceps", "forearms"], ["dumbbell"], { ...ISO, inc: 1 }),
  ex("cable_curl", "Cable Curl", "elbow_flexion", ["biceps"], ["cable"], { ...ISO, inc: 1.25 }),
  ex("preacher_curl", "Preacher Curl", "elbow_flexion", ["biceps"], ["machine"], { ...ISO, stress: { elbow: 1 } }),
  ex("band_curl", "Band Curl", "elbow_flexion", ["biceps"], ["bands"], { ...ISO }),
  // ── Elbow extension ─────────────────────────────────────────
  ex("cable_pushdown", "Cable Triceps Pushdown", "elbow_extension", ["triceps"], ["cable"], { ...ISO, inc: 1.25, cues: ["Elbows pinned", "Full lockout"] }),
  ex("overhead_cable_ext", "Overhead Cable Triceps Extension", "elbow_extension", ["triceps"], ["cable"], { ...ISO, stress: { elbow: 1, shoulder: 1 }, inc: 1.25 }),
  ex("skull_crusher", "EZ-Bar Skull Crusher", "elbow_extension", ["triceps"], ["barbell", "bench"], { ...ISO, stress: { elbow: 2 }, inc: 1.25 }),
  ex("db_overhead_ext", "Dumbbell Overhead Extension", "elbow_extension", ["triceps"], ["dumbbell"], { ...ISO, stress: { elbow: 1, shoulder: 1 }, inc: 1 }),
  ex("close_grip_bench", "Close-Grip Bench Press", "elbow_extension", ["triceps", "chest"], ["barbell", "bench", "rack"], { mech: "compound", fat: 2, sec: ["front_delts"], diff: 2, stress: { wrist: 1, elbow: 1 } }),
  ex("bench_dip", "Bench Dip", "elbow_extension", ["triceps"], ["bench"], { ...ISO, stress: { shoulder: 2 }, loaded: false }),
  ex("band_pushdown", "Band Pushdown", "elbow_extension", ["triceps"], ["bands"], { ...ISO }),
  ex("diamond_pushup", "Diamond Push-Up", "elbow_extension", ["triceps", "chest"], ["bodyweight"], { mech: "compound", stress: { wrist: 2, elbow: 1 } }),
  // ── Squat / knee dominant ───────────────────────────────────
  ex("back_squat", "Back Squat", "squat", ["quads", "glutes"], ["barbell", "rack"], {
    sec: ["adductors", "lower_back"], diff: 2, fat: 3, stress: { knee: 2, lower_back: 2, hip: 1 },
    cues: ["Brace before descending", "Knees track over toes", "Hit depth with a neutral spine"],
  }),
  ex("front_squat", "Front Squat", "squat", ["quads"], ["barbell", "rack"], { sec: ["glutes", "abs"], diff: 3, fat: 3, stress: { knee: 2, wrist: 1 } }),
  ex("hack_squat", "Hack Squat", "squat", ["quads"], ["machine"], { sec: ["glutes"], fat: 2, stress: { knee: 2 } }),
  ex("leg_press", "Leg Press", "squat", ["quads", "glutes"], ["machine"], { sec: ["adductors"], fat: 2, stress: { knee: 1 }, inc: 5, cues: ["Lower back stays on the pad", "Full controlled depth"] }),
  ex("goblet_squat", "Goblet Squat", "squat", ["quads", "glutes"], ["dumbbell"], { sec: ["abs"], stress: { knee: 1 } }),
  ex("smith_squat", "Smith Machine Squat", "squat", ["quads", "glutes"], ["smith"], { fat: 2, stress: { knee: 2 } }),
  ex("kb_goblet_squat", "Kettlebell Goblet Squat", "squat", ["quads", "glutes"], ["kettlebell"], { stress: { knee: 1 }, inc: 4 }),
  ex("bw_squat", "Tempo Bodyweight Squat", "squat", ["quads", "glutes"], ["bodyweight"], { fat: 1, stress: { knee: 1 } }),
  ex("box_squat", "Box Squat", "squat", ["quads", "glutes"], ["barbell", "rack", "box"], { sec: ["hamstrings"], diff: 2, fat: 2, stress: { lower_back: 1 } }),
  // ── Lunge ───────────────────────────────────────────────────
  ex("bulgarian_split_squat", "Bulgarian Split Squat", "lunge", ["quads", "glutes"], ["dumbbell", "bench"], { sec: ["adductors"], uni: true, diff: 2, stress: { knee: 1 }, cues: ["Front shin slightly forward", "Drop the back knee straight down"] }),
  ex("walking_lunge", "Walking Lunge", "lunge", ["quads", "glutes"], ["dumbbell"], { sec: ["adductors"], uni: true, stress: { knee: 2 } }),
  ex("reverse_lunge", "Reverse Lunge", "lunge", ["glutes", "quads"], ["dumbbell"], { uni: true, stress: { knee: 1 } }),
  ex("step_up", "Step-Up", "lunge", ["quads", "glutes"], ["dumbbell", "box"], { uni: true, stress: { knee: 1 } }),
  ex("bw_split_squat", "Split Squat", "lunge", ["quads", "glutes"], ["bodyweight"], { uni: true, fat: 1, stress: { knee: 1 } }),
  // ── Knee extension / flexion ────────────────────────────────
  ex("leg_extension", "Leg Extension", "knee_extension", ["quads"], ["machine"], { ...ISO, stress: { knee: 2 } }),
  ex("spanish_squat", "Band Spanish Squat", "knee_extension", ["quads"], ["bands"], { ...ISO, cues: ["Knee-friendly quad isometric/eccentric"] }),
  ex("lying_leg_curl", "Lying Leg Curl", "knee_flexion", ["hamstrings"], ["machine"], { ...ISO }),
  ex("seated_leg_curl", "Seated Leg Curl", "knee_flexion", ["hamstrings"], ["machine"], { ...ISO, cues: ["Lean forward to lengthen the hamstrings"] }),
  ex("nordic_curl", "Nordic Hamstring Curl", "knee_flexion", ["hamstrings"], ["bodyweight"], { mech: "isolation", diff: 3, fat: 2, stress: { knee: 1 } }),
  ex("swiss_ball_curl", "Slider Leg Curl", "knee_flexion", ["hamstrings"], ["bodyweight"], { ...ISO }),
  ex("band_leg_curl", "Band Leg Curl", "knee_flexion", ["hamstrings"], ["bands"], { ...ISO }),
  // ── Hinge ───────────────────────────────────────────────────
  ex("deadlift", "Conventional Deadlift", "hinge", ["hamstrings", "glutes", "lower_back"], ["barbell"], {
    sec: ["upper_back", "traps", "forearms", "quads"], diff: 3, fat: 3, stress: { lower_back: 3, hip: 1 }, inc: 5,
    cues: ["Bar over mid-foot", "Pull the slack out", "Push the floor away"],
  }),
  ex("trap_bar_deadlift", "Trap Bar Deadlift", "hinge", ["glutes", "quads", "hamstrings"], ["trap_bar"], { sec: ["upper_back", "traps"], diff: 2, fat: 3, stress: { lower_back: 2 }, inc: 5 }),
  ex("rdl", "Romanian Deadlift", "hinge", ["hamstrings", "glutes"], ["barbell"], { sec: ["lower_back", "forearms"], diff: 2, fat: 2, stress: { lower_back: 2 }, cues: ["Soft knees, hips back", "Bar stays on thighs", "Stop when hips stop moving"] }),
  ex("db_rdl", "Dumbbell Romanian Deadlift", "hinge", ["hamstrings", "glutes"], ["dumbbell"], { sec: ["lower_back"], stress: { lower_back: 1 } }),
  ex("single_leg_rdl", "Single-Leg RDL", "hinge", ["hamstrings", "glutes"], ["dumbbell"], { uni: true, diff: 2, fat: 1 }),
  ex("kb_swing", "Kettlebell Swing", "hinge", ["glutes", "hamstrings"], ["kettlebell"], { sec: ["lower_back"], stress: { lower_back: 1 }, inc: 4, cues: ["Hike then snap hips", "Bell floats, arms are ropes"] }),
  ex("good_morning", "Good Morning", "hinge", ["hamstrings", "lower_back"], ["barbell", "rack"], { sec: ["glutes"], diff: 3, stress: { lower_back: 3 } }),
  ex("back_extension", "45° Back Extension", "hinge", ["glutes", "hamstrings", "lower_back"], ["bench"], { mech: "isolation", fat: 1, stress: { lower_back: 1 }, loaded: false }),
  // ── Hip extension / abduction ───────────────────────────────
  ex("hip_thrust", "Barbell Hip Thrust", "hip_extension", ["glutes"], ["barbell", "bench"], { sec: ["hamstrings"], stress: {}, inc: 5, cues: ["Chin tucked, ribs down", "Shins vertical at the top", "Pause and squeeze"] }),
  ex("machine_hip_thrust", "Machine Hip Thrust", "hip_extension", ["glutes"], ["machine"], { sec: ["hamstrings"] }),
  ex("glute_bridge", "Glute Bridge", "hip_extension", ["glutes"], ["bodyweight"], { mech: "isolation", fat: 1, sec: ["hamstrings"] }),
  ex("db_hip_thrust", "Dumbbell Hip Thrust", "hip_extension", ["glutes"], ["dumbbell", "bench"], { sec: ["hamstrings"] }),
  ex("cable_kickback", "Cable Glute Kickback", "hip_extension", ["glutes"], ["cable"], { ...ISO, uni: true }),
  ex("hip_abduction_machine", "Hip Abduction Machine", "hip_abduction", ["glutes"], ["machine"], { ...ISO }),
  ex("band_abduction", "Banded Lateral Walk", "hip_abduction", ["glutes"], ["bands"], { ...ISO }),
  ex("copenhagen_plank", "Copenhagen Plank", "hip_adduction", ["adductors"], ["bench"], { ...ISO, timed: true, loaded: false }),
  ex("adductor_machine", "Hip Adduction Machine", "hip_adduction", ["adductors"], ["machine"], { ...ISO }),
  // ── Calves ──────────────────────────────────────────────────
  ex("standing_calf_raise", "Standing Calf Raise", "calf_raise", ["calves"], ["machine"], { ...ISO, stress: { ankle: 1 }, cues: ["Pause in the deep stretch", "Full rise onto big toe"] }),
  ex("seated_calf_raise", "Seated Calf Raise", "calf_raise", ["calves"], ["machine"], { ...ISO }),
  ex("db_calf_raise", "Single-Leg Dumbbell Calf Raise", "calf_raise", ["calves"], ["dumbbell"], { ...ISO, uni: true, stress: { ankle: 1 } }),
  ex("leg_press_calf", "Leg Press Calf Raise", "calf_raise", ["calves"], ["machine"], { ...ISO, inc: 5 }),
  ex("bw_calf_raise", "Bodyweight Calf Raise", "calf_raise", ["calves"], ["bodyweight"], { ...ISO, stress: { ankle: 1 } }),
  // ── Core ────────────────────────────────────────────────────
  ex("plank", "Plank", "anti_extension", ["abs"], ["bodyweight"], { ...ISO, timed: true, sec: ["obliques"] }),
  ex("ab_wheel", "Ab Wheel Rollout", "anti_extension", ["abs"], ["bodyweight"], { ...ISO, diff: 2, stress: { lower_back: 1 }, loaded: false }),
  ex("dead_bug", "Dead Bug", "anti_extension", ["abs"], ["bodyweight"], { ...ISO }),
  ex("hanging_leg_raise", "Hanging Leg Raise", "trunk_flexion", ["abs"], ["pullup_bar"], { ...ISO, diff: 2, sec: ["obliques"], stress: { shoulder: 1 } }),
  ex("cable_crunch", "Cable Crunch", "trunk_flexion", ["abs"], ["cable"], { ...ISO }),
  ex("reverse_crunch", "Reverse Crunch", "trunk_flexion", ["abs"], ["bench"], { ...ISO, loaded: false }),
  ex("pallof_press", "Pallof Press", "rotation", ["obliques", "abs"], ["cable"], { ...ISO, uni: true }),
  ex("band_pallof", "Band Pallof Press", "rotation", ["obliques", "abs"], ["bands"], { ...ISO, uni: true }),
  ex("cable_woodchop", "Cable Woodchop", "rotation", ["obliques"], ["cable"], { ...ISO, uni: true, sec: ["abs"] }),
  ex("side_plank", "Side Plank", "rotation", ["obliques"], ["bodyweight"], { ...ISO, timed: true, uni: true }),
  ex("farmer_carry", "Farmer's Carry", "carry", ["forearms", "traps"], ["dumbbell"], { sec: ["abs", "obliques"], timed: true, fat: 2 }),
  ex("suitcase_carry", "Suitcase Carry", "carry", ["obliques", "forearms"], ["kettlebell"], { sec: ["abs"], timed: true, uni: true, inc: 4 }),
  // ── Power ───────────────────────────────────────────────────
  ex("box_jump", "Box Jump", "jump", ["quads", "glutes"], ["box"], { sec: ["calves"], fat: 1, stress: { knee: 1, ankle: 1 }, cues: ["Max intent each rep", "Step down, don't jump down"] }),
  ex("broad_jump", "Broad Jump", "jump", ["glutes", "quads"], ["bodyweight"], { sec: ["hamstrings", "calves"], fat: 1, stress: { knee: 2, ankle: 1 } }),
  ex("cmj", "Countermovement Jump", "jump", ["quads", "glutes"], ["bodyweight"], { sec: ["calves"], fat: 1, stress: { knee: 1, ankle: 1 } }),
  ex("trap_bar_jump", "Trap Bar Jump", "jump", ["quads", "glutes"], ["trap_bar"], { diff: 2, stress: { knee: 1, lower_back: 1 } }),
  ex("med_ball_slam", "Medicine Ball Slam", "throw", ["abs", "lats"], ["medball"], { sec: ["front_delts"], fat: 1, loaded: true }),
  ex("med_ball_chest_pass", "Med Ball Chest Pass", "throw", ["chest", "triceps"], ["medball"], { sec: ["front_delts"], fat: 1 }),
  ex("rotational_throw", "Rotational Med Ball Throw", "throw", ["obliques"], ["medball"], { sec: ["glutes"], fat: 1, uni: true }),
  ex("hang_power_clean", "Hang Power Clean", "olympic", ["glutes", "hamstrings", "traps"], ["barbell"], { sec: ["quads", "upper_back"], diff: 3, fat: 2, stress: { wrist: 2, lower_back: 1 } }),
  ex("push_press", "Push Press", "olympic", ["front_delts", "triceps"], ["barbell", "rack"], { sec: ["quads", "glutes"], diff: 2, fat: 2, stress: { shoulder: 2 } }),
  ex("kb_snatch", "Kettlebell Snatch", "olympic", ["glutes", "hamstrings", "front_delts"], ["kettlebell"], { diff: 3, uni: true, stress: { shoulder: 1, wrist: 1 }, inc: 4 }),
  ex("plyo_pushup", "Plyometric Push-Up", "throw", ["chest", "triceps"], ["bodyweight"], { diff: 2, fat: 1, stress: { wrist: 2, shoulder: 1 } }),
  // ── Conditioning ────────────────────────────────────────────
  ex("bike_intervals", "Air Bike Intervals", "conditioning", ["quads"], ["cardio_machine"], { timed: true, fat: 2, loaded: false }),
  ex("row_intervals", "Rower Intervals", "conditioning", ["lats", "quads"], ["cardio_machine"], { timed: true, fat: 2, loaded: false, stress: { lower_back: 1 } }),
  ex("sled_push", "Sled Push", "conditioning", ["quads", "glutes"], ["sled"], { timed: true, fat: 2, sec: ["calves"] }),
  ex("burpee", "Burpee", "conditioning", ["quads", "chest"], ["bodyweight"], { timed: true, fat: 2, stress: { wrist: 1, knee: 1 } }),
  ex("kb_complex", "Kettlebell Swing EMOM", "conditioning", ["glutes", "hamstrings"], ["kettlebell"], { timed: true, fat: 2, stress: { lower_back: 1 }, inc: 4 }),
  ex("jump_rope", "Jump Rope", "conditioning", ["calves"], ["bodyweight"], { timed: true, fat: 1, stress: { ankle: 1 } }),
  ex("mountain_climber", "Mountain Climbers", "conditioning", ["abs", "quads"], ["bodyweight"], { timed: true, fat: 1, stress: { wrist: 1 } }),
];

export const EXERCISE_MAP: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return EXERCISE_MAP[id];
}

export const MUSCLE_LABEL: Record<string, string> = {
  chest: "Chest", lats: "Lats", upper_back: "Upper back", traps: "Traps", front_delts: "Front delts",
  side_delts: "Side delts", rear_delts: "Rear delts", biceps: "Biceps", triceps: "Triceps", forearms: "Forearms",
  quads: "Quads", hamstrings: "Hamstrings", glutes: "Glutes", adductors: "Adductors", calves: "Calves",
  abs: "Abs", obliques: "Obliques", lower_back: "Lower back",
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: "Barbell", dumbbell: "Dumbbells", kettlebell: "Kettlebells", cable: "Cable stack", machine: "Machines",
  smith: "Smith machine", bench: "Bench", rack: "Squat rack", pullup_bar: "Pull-up bar", dip_station: "Dip station",
  bands: "Resistance bands", trap_bar: "Trap bar", landmine: "Landmine", sled: "Sled", medball: "Medicine ball",
  box: "Plyo box", cardio_machine: "Bike / rower", bodyweight: "Bodyweight",
};

export const PATTERN_LABEL: Record<Pattern, string> = {
  horizontal_push: "Horizontal press", incline_push: "Incline press", vertical_push: "Overhead press", chest_fly: "Chest fly",
  horizontal_pull: "Row", vertical_pull: "Vertical pull", pullover: "Pullover", shrug: "Shrug", lateral_raise: "Lateral raise",
  rear_delt: "Rear delt", elbow_flexion: "Curl", elbow_extension: "Triceps extension", squat: "Squat", lunge: "Lunge / split squat",
  knee_extension: "Knee extension", hinge: "Hinge", knee_flexion: "Leg curl", hip_extension: "Hip extension",
  hip_abduction: "Hip abduction", hip_adduction: "Hip adduction", calf_raise: "Calf raise", anti_extension: "Anti-extension",
  rotation: "Rotation / anti-rotation", trunk_flexion: "Trunk flexion", carry: "Loaded carry", jump: "Jump", throw: "Throw",
  olympic: "Olympic / ballistic", conditioning: "Conditioning",
};

export const JOINT_LABEL: Record<Joint, string> = {
  shoulder: "Shoulder", elbow: "Elbow", wrist: "Wrist", neck: "Neck", lower_back: "Lower back", hip: "Hip", knee: "Knee", ankle: "Ankle",
};
