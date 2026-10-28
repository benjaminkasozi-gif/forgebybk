import type { Exercise } from "@/lib/engine";
import { FLOOR, G, type JointName, type Keyframe, type LimbSpec, type Rig, type V, type View } from "./rig";

export type LoadKind = "slide" | "barbell" | "dumbbell" | "kettlebell" | "medball" | "handle" | "rope" | "trapbar" | "wheel" | "ball" | "pad" | "platform" | "yoke" | "landmine" | "jumprope";

export interface Load {
  kind: LoadKind;
  /** Which joint(s) it rides on. "hands" = both hands (one item between them in side view). */
  at?: JointName | "hands";
  angle?: number;
}

export interface Line {
  from: JointName;
  to: V | JointName;
  kind: "cable" | "band" | "chain";
}

export type SceneItem =
  | { k: "bench"; x1: number; x2: number; y: number }
  | { k: "seat"; x: number; w: number; y: number }
  | { k: "box"; x: number; w: number; top: number }
  | { k: "rack"; x: number }
  | { k: "smith"; x: number }
  | { k: "pullbar"; x: number; y: number }
  | { k: "dipbars"; x1: number; x2: number; y: number }
  | { k: "stack"; x: number; pulley: number }
  | { k: "pad"; x: number; y: number; angle: number; len: number }
  | { k: "plate"; x: number; y: number; angle: number }
  | { k: "rail"; x1: number; y1: number; x2: number; y2: number }
  | { k: "bike"; cx: number; cy: number; seat: V; bars: V }
  | { k: "rower" }
  | { k: "sled"; x: number }
  | { k: "mat"; x: number; w: number };

export interface Motion extends Rig {
  loads?: Load[];
  lines?: Line[];
  scene?: SceneItem[];
  /** Pad drawn behind the back (or chest), following the torso. */
  backpad?: "back" | "front";
  steps: string[];
}

const fk = (a: number, b: number, o: Partial<{ rel: boolean; k: number; kb: number }> = {}): LimbSpec => ({ a, b, ...o });
const ik = (x: number, y: number, bend?: 1 | -1): LimbSpec => ({ to: [x, y], bend });
const k = (o: Keyframe) => o;

const FEET = ik(150, G);
const STAND: Keyframe = { at: [150, 133], torso: 0, leg: FEET };
const FLAT_BENCH: SceneItem = { k: "bench", x1: 78, x2: 192, y: 180 };
const LYING: Keyframe = { at: [160, 170], torso: -90, leg: fk(97, -5) };
const SEATED_SIDE: Keyframe = { torso: -6, leg: fk(88, -3) };

/* ─────────────────────────── Movement library ─────────────────────────── */

export const MOTIONS = {
  // ── Pressing ───────────────────────────────────────────────
  bench: {
    view: "side", anchor: "hip", scene: [{ k: "rack", x: 100 }, FLAT_BENCH], loads: [{ kind: "barbell" }],
    keys: [k({ ...LYING, arm: fk(172, 178), cue: "Press to lockout" }), k({ arm: fk(72, 180), t: 1.6, cue: "Lower to lower chest" })],
    steps: ["Lie with eyes under the bar, feet flat, shoulder blades pinched", "Lower under control to your lower chest, elbows ~45° from your sides", "Press up and slightly back until your arms are straight"],
  },
  incline_press: {
    view: "side", anchor: "hip", scene: [{ k: "seat", x: 140, w: 50, y: 186 }], backpad: "back", loads: [{ kind: "barbell" }],
    keys: [k({ at: [168, 176], torso: -45, leg: fk(88, -2), arm: fk(176, 180), cue: "Press up" }), k({ arm: fk(52, 176), t: 1.6, cue: "Lower to upper chest" })],
    steps: ["Set the bench to 30–45° and plant your feet", "Lower to your upper chest with forearms vertical", "Press up over your shoulders"],
  },
  machine_press: {
    view: "side", anchor: "hip", scene: [{ k: "stack", x: 30, pulley: 60 }, { k: "seat", x: 92, w: 55, y: 184 }], backpad: "back", loads: [{ kind: "handle" }],
    keys: [k({ at: [125, 174], ...SEATED_SIDE, arm: ik(132, 140), cue: "Handles at chest" }), k({ arm: ik(174, 128), t: 1, cue: "Press forward" })],
    steps: ["Set the seat so the handles line up with mid-chest", "Keep your back on the pad and press until arms are straight", "Return slowly until you feel a chest stretch"],
  },
  incline_machine_press: {
    view: "side", anchor: "hip", scene: [{ k: "stack", x: 30, pulley: 60 }, { k: "seat", x: 92, w: 55, y: 184 }], backpad: "back", loads: [{ kind: "handle" }],
    keys: [k({ at: [125, 174], torso: -22, leg: fk(88, -3), arm: ik(126, 124), cue: "Handles at upper chest" }), k({ arm: ik(144, 86), t: 1, cue: "Press up and forward" })],
    steps: ["Adjust the seat so the handles start at upper-chest height", "Press up and forward along the machine's path", "Lower slowly, keeping shoulders down"],
  },
  pushup: {
    view: "side", anchor: "hip",
    keys: [
      k({ at: [154, 174], torso: 70, arm: ik(205, 213), leg: ik(77, 202), cue: "Push the floor away" }),
      k({ at: [157, 196], torso: 86, t: 1.4, cue: "Lower as one unit" }),
    ],
    steps: ["Hands under shoulders, body in a straight line from head to heels", "Lower your chest to just above the floor, elbows ~45°", "Push back up without letting your hips sag"],
  },
  plyo_pushup: {
    view: "side", anchor: "hip",
    keys: [
      k({ at: [154, 174], torso: 70, arm: ik(205, 213), leg: ik(77, 202), hold: 0.3, cue: "Reset in a plank" }),
      k({ at: [157, 196], torso: 86, t: 0.9, cue: "Lower under control" }),
      k({ at: [154, 160], torso: 64, arm: ik(206, 194), t: 0.3, hold: 0.05, cue: "Explode — hands leave the floor" }),
    ],
    steps: ["Start in a strong push-up plank", "Lower quickly but under control", "Push explosively so your hands leave the floor; land soft and repeat"],
  },
  dips: {
    view: "side", anchor: "shoulder", scene: [{ k: "dipbars", x1: 118, x2: 206, y: 132 }],
    keys: [k({ at: [158, 72], torso: 12, arm: ik(162, 130), leg: fk(8, -100), cue: "Lock out" }), k({ at: [172, 102], torso: 30, t: 1.5, cue: "Lean forward and lower" })],
    steps: ["Support yourself on straight arms, knees bent behind you", "Lean slightly forward and lower until upper arms are parallel to the floor", "Press back up to straight arms"],
  },
  bench_dip: {
    view: "side", anchor: "shoulder", scene: [{ k: "bench", x1: 48, x2: 124, y: 180 }],
    keys: [k({ at: [130, 122], torso: 0, arm: ik(120, 178), leg: ik(200, G), cue: "Press up" }), k({ at: [138, 150], torso: 4, t: 1.3, cue: "Bend elbows straight back" })],
    steps: ["Hands on the bench edge behind you, legs out in front", "Lower by bending your elbows straight back, hips close to the bench", "Press up until your arms are straight"],
  },
  ohp: {
    view: "side", anchor: "hip", loads: [{ kind: "barbell" }],
    keys: [k({ ...STAND, arm: ik(164, 86), cue: "Bar on front of shoulders" }), k({ torso: -3, arm: ik(151, 24), t: 1.1, cue: "Press up, head through" })],
    steps: ["Bar on your front delts, grip just outside shoulders, glutes squeezed", "Press straight up, moving your head back then through", "Lock out overhead and lower to your shoulders"],
  },
  push_press: {
    view: "side", anchor: "hip", loads: [{ kind: "barbell" }],
    keys: [
      k({ ...STAND, arm: ik(164, 86), hold: 0.3, cue: "Bar in the rack position" }),
      k({ at: [148, 145], torso: 2, arm: ik(163, 97), t: 0.45, hold: 0.02, cue: "Dip — knees forward" }),
      k({ at: [150, 128], torso: -3, arm: ik(151, 24), t: 0.35, hold: 0.4, cue: "Drive and press" }),
    ],
    steps: ["Start with the bar on your shoulders, feet hip-width", "Dip a few inches by bending your knees, torso upright", "Drive hard through the legs and press the bar to lockout"],
  },
  seated_press: {
    view: "side", anchor: "hip", scene: [{ k: "seat", x: 100, w: 50, y: 184 }], backpad: "back", loads: [{ kind: "dumbbell" }],
    keys: [k({ at: [128, 174], ...SEATED_SIDE, torso: -4, arm: ik(138, 116), cue: "Weights at shoulder height" }), k({ arm: ik(130, 66), t: 1.1, cue: "Press overhead" })],
    steps: ["Sit tall with your back against the pad", "Start with the weights level with your ears", "Press up until your arms are straight, then lower under control"],
  },
  landmine_press: {
    view: "side", anchor: "hip", loads: [{ kind: "landmine", at: "hand" }],
    keys: [k({ at: [146, 133], torso: 8, leg: ik(170, G), leg2: ik(124, G), arm: ik(164, 88), arm2: fk(8, 8), cue: "Bar end at shoulder" }), k({ arm: ik(204, 46), t: 1, cue: "Press up and forward" })],
    steps: ["Hold the end of the bar at your shoulder in a split stance", "Press up and forward along the bar's arc", "Lower back to your shoulder with control"],
  },
  one_arm_press: {
    view: "side", anchor: "hip", loads: [{ kind: "kettlebell", at: "hand" }],
    keys: [k({ ...STAND, arm: ik(162, 86), arm2: fk(4, 4), cue: "Bell racked at shoulder" }), k({ torso: -3, arm: ik(151, 24), t: 1.1, cue: "Press to lockout" })],
    steps: ["Rack the bell against your forearm at shoulder height", "Brace your trunk and press straight up", "Lock out with your bicep by your ear, then lower"],
  },
  pike_pushup: {
    view: "side", anchor: "hip",
    keys: [k({ at: [128, 138], torso: 125, arm: ik(195, 213), leg: ik(100, G), cue: "Push back up" }), k({ at: [136, 146], torso: 148, t: 1.3, cue: "Lower head toward hands" })],
    steps: ["Start in an inverted V, hips high, hands shoulder-width", "Bend your elbows to bring your head toward the floor", "Press back up to straight arms"],
  },

  // ── Flys & raises (front view) ─────────────────────────────
  fly_front: {
    view: "front", anchor: "hip", lines: [{ from: "hand", to: [286, 66], kind: "cable" }, { from: "hand2", to: [14, 66], kind: "cable" }], loads: [{ kind: "handle", at: "hand" }, { kind: "handle", at: "hand2" }],
    scene: [{ k: "stack", x: 274, pulley: 66 }, { k: "stack", x: 2, pulley: 66 }],
    keys: [k({ at: [150, 133], leg: fk(8, 2), arm: fk(95, 84), cue: "Open wide, slight elbow bend" }), k({ arm: fk(95, 84, { k: -0.28 }), t: 1.1, cue: "Hug the arms together" })],
    steps: ["Stand between the pulleys with a slight forward lean", "Keep a soft bend in the elbows and open until you feel a chest stretch", "Bring your hands together in a wide arc, squeezing the chest"],
  },
  pec_deck: {
    view: "front", anchor: "hip", scene: [{ k: "seat", x: 120, w: 60, y: 168 }], loads: [{ kind: "handle", at: "hand" }, { kind: "handle", at: "hand2" }],
    keys: [k({ at: [150, 160], leg: fk(10, 0, { k: 0.35, kb: 1 }), arm: fk(92, 88), cue: "Open, feel the stretch" }), k({ arm: fk(92, 88, { k: -0.26 }), t: 1.1, cue: "Squeeze together" })],
    steps: ["Sit with handles at chest height, back flat on the pad", "Bring the handles together in an arc, squeezing your chest", "Open slowly until you feel a stretch"],
  },
  db_fly: {
    view: "side", anchor: "hip", scene: [FLAT_BENCH], loads: [{ kind: "dumbbell" }],
    keys: [k({ ...LYING, arm: fk(176, 178), cue: "Bring them together" }), k({ arm: fk(98, 92, { k: 0.75 }), t: 1.5, cue: "Open wide, soft elbows" })],
    steps: ["Lie on a flat bench, weights over your chest, palms facing", "Lower out to the sides in a wide arc with a slight elbow bend", "Bring them back together over your chest"],
  },
  lateral_raise: {
    view: "front", anchor: "hip", loads: [{ kind: "dumbbell", at: "hand" }, { kind: "dumbbell", at: "hand2" }],
    keys: [k({ at: [150, 133], leg: fk(4, 0), arm: fk(10, 8), cue: "Lower slowly" }), k({ arm: fk(86, 90), t: 1, cue: "Raise out to the sides" })],
    steps: ["Stand tall, weights at your sides, slight bend in the elbows", "Raise your arms out to the side until they reach shoulder height", "Lower under control without swinging"],
  },
  cable_lateral: {
    view: "front", anchor: "hip", scene: [{ k: "stack", x: 4, pulley: 212 }], lines: [{ from: "hand", to: [26, 212], kind: "cable" }], loads: [{ kind: "handle", at: "hand" }],
    keys: [k({ at: [160, 133], leg: fk(4, 0), arm: fk(-12, -8), arm2: fk(30, -40), cue: "Lower across your body" }), k({ arm: fk(86, 90), t: 1, cue: "Raise out to the side" })],
    steps: ["Stand side-on to a low pulley, handle in the far hand", "Raise your arm out to the side up to shoulder height", "Lower slowly across your body"],
  },
  machine_lateral: {
    view: "front", anchor: "hip", scene: [{ k: "seat", x: 120, w: 60, y: 168 }], loads: [{ kind: "pad", at: "elbow" }, { kind: "pad", at: "elbow2" }],
    keys: [k({ at: [150, 160], leg: fk(10, 0, { k: 0.35, kb: 1 }), arm: fk(12, 60), cue: "Lower with control" }), k({ arm: fk(88, 100), t: 1, cue: "Lead with the elbows" })],
    steps: ["Sit with the pads against the outside of your upper arms", "Raise by driving your elbows out to shoulder height", "Lower slowly"],
  },
  rear_fly_front: {
    view: "front", anchor: "hip", scene: [{ k: "seat", x: 120, w: 60, y: 168 }], loads: [{ kind: "handle", at: "hand" }, { kind: "handle", at: "hand2" }],
    keys: [k({ at: [150, 160], leg: fk(10, 0, { k: 0.35, kb: 1 }), arm: fk(92, 92, { k: -0.24 }), cue: "Return slowly" }), k({ arm: fk(92, 92), t: 1, cue: "Sweep arms back" })],
    steps: ["Face the pad with handles at shoulder height", "Sweep your arms back in a wide arc, squeezing the rear shoulders", "Return slowly without letting the stack touch"],
  },
  pull_apart: {
    view: "front", anchor: "hip", lines: [{ from: "hand", to: "hand2", kind: "band" }],
    keys: [k({ at: [150, 133], leg: fk(4, 0), arm: fk(90, 90, { k: -0.2 }), cue: "Return with control" }), k({ arm: fk(90, 90), t: 0.9, cue: "Pull the band apart" })],
    steps: ["Hold a band at shoulder height, arms straight in front", "Pull it apart until it touches your chest, squeezing your shoulder blades", "Return slowly"],
  },
  bent_rear_fly: {
    view: "front", anchor: "hip", loads: [{ kind: "dumbbell", at: "hand" }, { kind: "dumbbell", at: "hand2" }],
    keys: [k({ at: [150, 133], tk: 0.55, leg: fk(6, -4), arm: fk(4, 2), cue: "Lower slowly" }), k({ arm: fk(84, 88), t: 1, cue: "Raise out wide" })],
    steps: ["Hinge forward with a flat back, weights hanging", "Raise them out to the sides, leading with the backs of your hands", "Lower slowly"],
  },

  // ── Pulling ────────────────────────────────────────────────
  pullup: {
    view: "side", anchor: "shoulder", scene: [{ k: "pullbar", x: 152, y: 14 }],
    keys: [k({ at: [148, 72], torso: -6, arm: ik(152, 14), leg: fk(8, -55), cue: "Lower to a dead hang" }), k({ at: [144, 40], torso: -18, t: 1.1, cue: "Pull your chest to the bar" })],
    steps: ["Hang from the bar with straight arms and shoulders set", "Pull your elbows down to your sides until your chin clears the bar", "Lower all the way to straight arms"],
  },
  assisted_pullup: {
    view: "side", anchor: "shoulder", scene: [{ k: "pullbar", x: 152, y: 14 }], loads: [{ kind: "pad", at: "knee" }],
    keys: [k({ at: [148, 72], torso: -6, arm: ik(152, 14), leg: fk(0, -90), cue: "Lower to straight arms" }), k({ at: [144, 40], torso: -16, t: 1.1, cue: "Pull up" })],
    steps: ["Kneel on the assist pad and grip the handles", "Pull your elbows down until your chin clears the handles", "Lower to straight arms"],
  },
  pulldown: {
    view: "side", anchor: "hip", scene: [{ k: "seat", x: 106, w: 55, y: 184 }, { k: "pad", x: 182, y: 164, angle: 0, len: 22 }], lines: [{ from: "hand", to: [150, 6], kind: "cable" }], loads: [{ kind: "handle", at: "hand" }],
    keys: [k({ at: [138, 173], torso: -12, leg: fk(88, 0), arm: ik(148, 66), cue: "Arms long, feel the stretch" }), k({ arm: ik(150, 122), t: 1, cue: "Pull to upper chest" })],
    steps: ["Sit with thighs under the pad and grip the bar wide", "Lean back slightly and pull the bar to your upper chest", "Let it rise until your arms are straight"],
  },
  bent_row: {
    view: "side", anchor: "hip", loads: [{ kind: "barbell" }],
    keys: [k({ at: [128, 164], torso: 70, leg: FEET, arm: ik(180, 202), cue: "Arms long" }), k({ arm: ik(156, 170), t: 0.9, cue: "Row to your belly" })],
    steps: ["Hinge to about 45°, flat back, bar hanging under your shoulders", "Row the bar to your lower ribs, driving the elbows back", "Lower until your arms are straight without moving your torso"],
  },
  db_row: {
    view: "side", anchor: "hip", scene: [{ k: "bench", x1: 60, x2: 190, y: 180 }], loads: [{ kind: "dumbbell", at: "hand" }],
    keys: [k({ at: [118, 136], torso: 80, leg: ik(102, G), leg2: fk(0, -90), arm2: ik(172, 178), arm: ik(173, 188), cue: "Let it hang and stretch" }), k({ arm: ik(150, 150), t: 0.9, cue: "Row to your hip" })],
    steps: ["Knee and hand on the bench, back flat", "Row the weight toward your hip, elbow close to your side", "Lower until your arm is straight"],
  },
  chest_supported_row: {
    view: "side", anchor: "hip", scene: [{ k: "seat", x: 98, w: 40, y: 180 }], backpad: "front", loads: [{ kind: "dumbbell" }],
    keys: [k({ at: [118, 170], torso: 45, leg: ik(92, 206), foot: 30, arm: ik(160, 190), cue: "Arms long" }), k({ arm: ik(138, 160), t: 0.9, cue: "Row, squeeze shoulder blades" })],
    steps: ["Lie chest-down on an incline bench", "Row the weights up, driving your elbows back", "Lower to a full stretch"],
  },
  cable_row: {
    view: "side", anchor: "hip", scene: [{ k: "bench", x1: 52, x2: 132, y: 208 }, { k: "plate", x: 174, y: 204, angle: 15 }, { k: "stack", x: 236, pulley: 196 }],
    lines: [{ from: "hand", to: [236, 196], kind: "cable" }], loads: [{ kind: "handle", at: "hand" }],
    keys: [k({ at: [100, 198], torso: 15, leg: ik(168, 198), arm: ik(166, 170), cue: "Reach forward" }), k({ torso: -6, arm: ik(124, 172), t: 1, cue: "Pull to your stomach" })],
    steps: ["Sit with feet on the platform and knees soft", "Pull the handle to your stomach, chest up, elbows back", "Reach forward until you feel a stretch between the shoulder blades"],
  },
  machine_row: {
    view: "side", anchor: "hip", scene: [{ k: "seat", x: 92, w: 50, y: 184 }, { k: "stack", x: 236, pulley: 140 }], backpad: "front", loads: [{ kind: "handle", at: "hand" }],
    keys: [k({ at: [118, 174], torso: 2, leg: fk(88, 2), arm: ik(172, 140), cue: "Arms long" }), k({ arm: ik(142, 140), t: 0.9, cue: "Row, elbows back" })],
    steps: ["Set the chest pad so you can just reach the handles", "Pull your elbows back and squeeze your shoulder blades", "Return slowly to straight arms"],
  },
  inverted_row: {
    view: "side", anchor: "ankle", scene: [{ k: "rack", x: 92 }], loads: [{ kind: "barbell" }],
    keys: [k({ at: [232, G], torso: -80, leg: fk(80, 80), arm: ik(100, 134), cue: "Lower to straight arms" }), k({ torso: -62, leg: fk(62, 62), t: 1, cue: "Pull your chest to the bar" })],
    steps: ["Hang under a bar set at hip height, body straight, heels down", "Pull your chest to the bar keeping hips up", "Lower to straight arms"],
  },
  band_row: {
    view: "side", anchor: "hip", scene: [{ k: "rack", x: 262 }], lines: [{ from: "hand", to: [262, 112], kind: "band" }],
    keys: [k({ ...STAND, torso: 3, arm: ik(204, 112), cue: "Arms long" }), k({ arm: ik(162, 118), t: 0.9, cue: "Row back" })],
    steps: ["Anchor a band at chest height and step back to tension", "Row your hands to your ribs, elbows close", "Return slowly"],
  },
  face_pull: {
    view: "side", anchor: "hip", scene: [{ k: "stack", x: 252, pulley: 72 }], lines: [{ from: "hand", to: [252, 72], kind: "cable" }], loads: [{ kind: "rope", at: "hand" }],
    keys: [k({ ...STAND, torso: -6, arm: ik(204, 76, -1), cue: "Arms long" }), k({ arm: ik(160, 64, -1), t: 0.9, cue: "Pull to your face, elbows high" })],
    steps: ["Set a rope at face height and step back", "Pull toward your face, splitting the rope and keeping elbows high", "Return slowly"],
  },
  pullover_cable: {
    view: "side", anchor: "hip", scene: [{ k: "stack", x: 240, pulley: 34 }], lines: [{ from: "hand", to: [240, 34], kind: "cable" }], loads: [{ kind: "handle", at: "hand" }],
    keys: [k({ at: [140, 135], torso: 22, leg: ik(152, G), arm: fk(148, 150), cue: "Let the arms rise" }), k({ arm: fk(14, 14), t: 1, cue: "Sweep down to your thighs" })],
    steps: ["Face the high pulley, hinge slightly, arms straight", "Sweep the bar down to your thighs keeping arms straight", "Let it rise until you feel a lat stretch"],
  },
  db_pullover: {
    view: "side", anchor: "hip", scene: [FLAT_BENCH], loads: [{ kind: "dumbbell" }],
    keys: [k({ ...LYING, arm: fk(178, 178), cue: "Pull back over your chest" }), k({ arm: fk(258, 258), t: 1.4, cue: "Lower behind your head" })],
    steps: ["Lie on a bench holding one dumbbell over your chest", "Lower it behind your head with nearly straight arms", "Pull it back over your chest"],
  },
  shrug: {
    view: "side", anchor: "hip", loads: [{ kind: "dumbbell" }],
    keys: [k({ ...STAND, arm: fk(0, 0), cue: "Lower fully" }), k({ shrug: 7, t: 0.7, hold: 0.4, cue: "Shrug straight up" })],
    steps: ["Stand tall holding the weight at your sides", "Shrug your shoulders straight up toward your ears", "Pause, then lower fully"],
  },

  // ── Arms ───────────────────────────────────────────────────
  curl: {
    view: "side", anchor: "hip", loads: [{ kind: "dumbbell" }],
    keys: [k({ ...STAND, arm: fk(4, 4), cue: "Lower all the way" }), k({ arm: fk(4, 155), t: 0.9, cue: "Curl up, elbows still" })],
    steps: ["Stand tall, elbows at your sides", "Curl the weight up without moving your upper arms", "Lower slowly to straight arms"],
  },
  incline_curl: {
    view: "side", anchor: "hip", scene: [{ k: "seat", x: 128, w: 46, y: 186 }], backpad: "back", loads: [{ kind: "dumbbell" }],
    keys: [k({ at: [150, 176], torso: -40, leg: fk(88, -4), arm: fk(-8, -8), cue: "Let the arms hang behind" }), k({ arm: fk(-8, 140), t: 1, cue: "Curl up" })],
    steps: ["Lie back on an incline bench with arms hanging straight down", "Curl up keeping your upper arms still", "Lower to a full stretch"],
  },
  preacher_curl: {
    view: "side", anchor: "hip", scene: [{ k: "seat", x: 100, w: 46, y: 186 }, { k: "pad", x: 148, y: 148, angle: 45, len: 34 }], loads: [{ kind: "barbell" }],
    keys: [k({ at: [120, 176], torso: 8, leg: fk(88, -4), arm: fk(48, 52), cue: "Lower to almost straight" }), k({ arm: fk(48, 172), t: 1, cue: "Curl up" })],
    steps: ["Sit with the backs of your upper arms on the pad", "Curl up without lifting your elbows", "Lower until your arms are almost straight"],
  },
  pushdown: {
    view: "side", anchor: "hip", scene: [{ k: "stack", x: 212, pulley: 30 }], lines: [{ from: "hand", to: [212, 30], kind: "cable" }], loads: [{ kind: "rope", at: "hand" }],
    keys: [k({ ...STAND, torso: 10, arm: fk(-4, 150), cue: "Let it rise to chest" }), k({ arm: fk(-4, 2), t: 0.8, cue: "Push down, elbows pinned" })],
    steps: ["Face the high pulley, elbows tucked at your sides", "Push down until your arms are straight", "Let your forearms rise without moving your elbows"],
  },
  overhead_ext: {
    view: "side", anchor: "hip", loads: [{ kind: "dumbbell" }],
    keys: [k({ ...STAND, arm: fk(176, 178), cue: "Extend overhead" }), k({ arm: fk(176, 345), t: 1.2, cue: "Lower behind your head" })],
    steps: ["Hold the weight overhead with both hands", "Lower it behind your head, elbows pointing up", "Extend back to straight arms"],
  },
  overhead_cable_ext: {
    view: "side", anchor: "hip", scene: [{ k: "stack", x: 30, pulley: 58 }], lines: [{ from: "hand", to: [30, 58], kind: "cable" }], loads: [{ kind: "rope", at: "hand" }],
    keys: [k({ at: [150, 133], torso: 30, leg: ik(170, G), leg2: ik(128, G), arm: fk(150, 158), cue: "Extend forward" }), k({ arm: fk(150, 318), t: 1.1, cue: "Let the hands come back" })],
    steps: ["Face away from the pulley in a split stance, rope behind your head", "Extend your arms forward and up", "Let your hands return behind your head with elbows fixed"],
  },
  skull_crusher: {
    view: "side", anchor: "hip", scene: [FLAT_BENCH], loads: [{ kind: "barbell" }],
    keys: [k({ ...LYING, arm: fk(192, 190), cue: "Extend" }), k({ arm: fk(192, 290), t: 1.2, cue: "Lower to your forehead" })],
    steps: ["Lie on a bench, bar over your forehead, arms angled slightly back", "Bend only at the elbows to lower the bar toward your head", "Extend back up"],
  },

  // ── Squats & lunges ────────────────────────────────────────
  squat_back: {
    view: "side", anchor: "hip", scene: [{ k: "rack", x: 106 }], loads: [{ kind: "barbell" }],
    keys: [k({ ...STAND, torso: 6, arm: fk(-35, 160, { rel: true }), cue: "Drive up, hips and chest together" }), k({ at: [127, 174], torso: 42, t: 1.6, cue: "Sit down between your heels" })],
    steps: ["Bar on your upper back, feet shoulder-width, brace your trunk", "Sit down and back until your hips are at or below knee height", "Drive up through your whole foot"],
  },
  squat_front: {
    view: "side", anchor: "hip", scene: [{ k: "rack", x: 106 }], loads: [{ kind: "barbell" }],
    keys: [k({ ...STAND, torso: 4, arm: fk(100, -100, { rel: true }), cue: "Stand up, elbows high" }), k({ at: [133, 176], torso: 24, t: 1.6, cue: "Squat down, chest tall" })],
    steps: ["Bar on the front of your shoulders, elbows high", "Squat straight down keeping your torso upright", "Stand up leading with your elbows"],
  },
  squat_goblet: {
    view: "side", anchor: "hip", loads: [{ kind: "dumbbell" }],
    keys: [k({ ...STAND, torso: 4, arm: fk(15, 165, { rel: true }), cue: "Stand tall" }), k({ at: [132, 175], torso: 28, t: 1.5, cue: "Sit between your knees" })],
    steps: ["Hold the weight against your chest, feet a little wider than hips", "Sit down between your knees, elbows inside them", "Stand up, keeping your chest tall"],
  },
  squat_bw: {
    view: "side", anchor: "hip",
    keys: [k({ ...STAND, torso: 3, arm: fk(4, 4), cue: "Stand up" }), k({ at: [129, 174], torso: 36, arm: fk(85, 88), t: 1.4, cue: "Sit back, arms forward" })],
    steps: ["Feet shoulder-width, toes slightly out", "Sit back and down, reaching your arms forward for balance", "Stand up by pushing the floor away"],
  },
  box_squat: {
    view: "side", anchor: "hip", scene: [{ k: "rack", x: 106 }, { k: "box", x: 86, w: 36, top: 182 }], loads: [{ kind: "barbell" }],
    keys: [k({ ...STAND, torso: 6, arm: fk(-35, 160, { rel: true }), cue: "Drive up" }), k({ at: [116, 170], torso: 44, t: 1.6, hold: 0.4, cue: "Sit back to the box, pause" })],
    steps: ["Set a box behind you at about knee height", "Sit back until you lightly touch the box, shins near vertical", "Pause, stay tight, and drive up"],
  },
  smith_squat: {
    view: "side", anchor: "hip", scene: [{ k: "smith", x: 151 }], loads: [{ kind: "barbell" }],
    keys: [k({ ...STAND, torso: 6, arm: fk(-35, 160, { rel: true }), cue: "Drive up" }), k({ at: [127, 174], torso: 40, t: 1.5, cue: "Squat down" })],
    steps: ["Set the bar on your upper back and unhook it", "Squat until your thighs are about parallel", "Drive up and re-rack by twisting the bar"],
  },
  hack_squat: {
    view: "side", anchor: "hip", scene: [{ k: "rail", x1: 100, y1: 64, x2: 162, y2: 214 }, { k: "plate", x: 178, y: 214, angle: -20 }], backpad: "back",
    keys: [k({ at: [130, 136], torso: -22, leg: ik(172, 208), arm: fk(-30, 160, { rel: true }), cue: "Push the platform away" }), k({ at: [145, 173], t: 1.5, cue: "Lower deep" })],
    steps: ["Shoulders under the pads, back flat against the sled", "Lower until your thighs are at least parallel", "Push through your whole foot to stand back up"],
  },
  leg_press: {
    view: "side", anchor: "hip", scene: [{ k: "rail", x1: 110, y1: 214, x2: 236, y2: 88 }, { k: "seat", x: 74, w: 52, y: 188 }], backpad: "back", loads: [{ kind: "platform", at: "ankle", angle: 45 }],
    keys: [k({ at: [100, 178], torso: -62, arm: fk(40, 60), leg: ik(157, 121), cue: "Press, don't lock knees" }), k({ leg: ik(126, 152), t: 1.4, cue: "Lower knees toward chest" })],
    steps: ["Sit with your back flat and feet shoulder-width on the platform", "Lower until your knees come toward your chest without your lower back lifting", "Press back up, stopping just short of locking out"],
  },
  split_squat: {
    view: "side", anchor: "hip", scene: [{ k: "bench", x1: 52, x2: 116, y: 182 }], loads: [{ kind: "dumbbell" }],
    keys: [k({ at: [148, 132], torso: 10, leg: ik(176, G), leg2: ik(104, 172), foot2: -95, arm: fk(0, 0), cue: "Drive up through the front foot" }), k({ at: [142, 166], torso: 16, t: 1.4, cue: "Drop the back knee" })],
    steps: ["Rear foot laces-down on a bench, front foot well forward", "Lower straight down until your front thigh is about parallel", "Drive up through your front heel"],
  },
  bw_split_squat: {
    view: "side", anchor: "hip",
    keys: [k({ at: [146, 136], torso: 6, leg: ik(176, G), leg2: ik(112, 207), foot2: 50, arm: fk(4, 4), cue: "Stand up" }), k({ at: [142, 172], t: 1.3, cue: "Lower the back knee" })],
    steps: ["Split stance, back heel raised", "Lower your back knee toward the floor", "Push through your front foot to rise"],
  },
  reverse_lunge: {
    view: "side", anchor: "hip", loads: [{ kind: "dumbbell" }],
    keys: [k({ ...STAND, torso: 3, leg: ik(152, G), leg2: ik(148, G), foot2: 90, arm: fk(0, 0), cue: "Return to standing" }), k({ at: [138, 170], torso: 8, leg2: ik(98, 207), foot2: 50, t: 1.2, cue: "Step back and drop" })],
    steps: ["Stand tall with weights at your sides", "Step one foot back and lower your back knee toward the floor", "Push through your front foot to return"],
  },
  walking_lunge: {
    view: "side", anchor: "hip", loads: [{ kind: "dumbbell" }],
    keys: [k({ ...STAND, torso: 3, leg: ik(152, G), leg2: ik(148, G), foot2: 90, arm: fk(0, 0), cue: "Bring the back foot through" }), k({ at: [168, 170], torso: 6, leg: ik(198, G), leg2: ik(150, 207), foot2: 50, t: 1.2, cue: "Step forward and drop" })],
    steps: ["Take a long step forward", "Lower your back knee toward the floor, torso upright", "Drive through your front foot and step into the next rep"],
  },
  step_up: {
    view: "side", anchor: "hip", scene: [{ k: "box", x: 160, w: 62, top: 177 }], loads: [{ kind: "dumbbell" }],
    keys: [k({ at: [148, 140], torso: 12, leg: ik(182, 172), leg2: ik(140, G), foot2: 90, arm: fk(0, 0), cue: "Step down" }), k({ at: [180, 93], torso: 3, leg2: ik(176, 158), t: 1.2, cue: "Drive up through the box foot" })],
    steps: ["Put your whole foot on a knee-high box", "Drive through that foot to stand on the box", "Step down slowly with the other leg"],
  },
  leg_extension: {
    view: "side", anchor: "hip", scene: [{ k: "stack", x: 24, pulley: 60 }, { k: "seat", x: 94, w: 72, y: 180 }], backpad: "back", loads: [{ kind: "pad", at: "ankle" }],
    keys: [k({ at: [128, 170], torso: -10, arm: fk(15, 15), leg: fk(90, 2), cue: "Lower slowly" }), k({ leg: fk(90, 84), t: 0.9, hold: 0.3, cue: "Straighten your legs" })],
    steps: ["Sit with the pad on your lower shins, knees in line with the pivot", "Straighten your legs and squeeze your quads", "Lower slowly"],
  },
  spanish_squat: {
    view: "side", anchor: "hip", scene: [{ k: "rack", x: 238 }], lines: [{ from: "knee", to: [238, 172], kind: "band" }],
    keys: [k({ ...STAND, torso: 2, arm: fk(80, 85), cue: "Stand up" }), k({ at: [128, 172], torso: 12, t: 1.4, hold: 0.4, cue: "Sit back into the band" })],
    steps: ["Loop a heavy band behind your knees, anchored in front", "Sit back with shins vertical and torso upright", "Hold or pulse, then stand"],
  },
  leg_curl_lying: {
    view: "side", anchor: "hip", scene: [{ k: "bench", x1: 82, x2: 200, y: 181 }], loads: [{ kind: "pad", at: "ankle" }],
    keys: [k({ at: [118, 168], torso: 92, arm: fk(25, 35), leg: fk(-90, -92), cue: "Lower slowly" }), k({ leg: fk(-90, -172), t: 0.9, hold: 0.2, cue: "Curl heels to glutes" })],
    steps: ["Lie face down with the pad just above your heels", "Curl your heels toward your glutes, hips pressed down", "Lower slowly to straight legs"],
  },
  leg_curl_seated: {
    view: "side", anchor: "hip", scene: [{ k: "seat", x: 90, w: 64, y: 180 }, { k: "pad", x: 150, y: 158, angle: 0, len: 30 }], backpad: "back", loads: [{ kind: "pad", at: "ankle" }],
    keys: [k({ at: [125, 170], torso: -14, arm: fk(20, 20), leg: fk(90, 78), cue: "Extend slowly" }), k({ leg: fk(90, -14), t: 0.9, hold: 0.2, cue: "Curl under" })],
    steps: ["Sit with the thigh pad snug and the lower pad above your heels", "Curl your heels down and under", "Return slowly to straight legs"],
  },
  nordic_curl: {
    view: "side", anchor: "knee", scene: [{ k: "mat", x: 50, w: 100 }], loads: [{ kind: "pad", at: "ankle" }],
    keys: [k({ at: [120, 210], torso: 0, leg: fk(0, -90), foot: -90, arm: fk(10, 20), cue: "Pull yourself back up" }), k({ torso: 62, leg: fk(-62, -90), arm: fk(70, 75), t: 2, cue: "Lower slowly, hips straight" })],
    steps: ["Kneel with your ankles anchored", "Lower your body forward as slowly as you can, keeping hips straight", "Catch yourself with your hands and pull back up with your hamstrings"],
  },
  ball_curl: {
    view: "side", anchor: "shoulder", loads: [{ kind: "ball", at: "ankle" }],
    keys: [k({ at: [92, 203], torso: -100, arm: fk(88, 88), leg: ik(222, 190), cue: "Roll it back out" }), k({ torso: -122, head: 30, leg: ik(184, 188), t: 1, cue: "Lift hips and curl" })],
    steps: ["Lie on your back with heels on a ball and hips lifted", "Curl the ball toward you, keeping hips high", "Roll it back out slowly"],
  },
  band_leg_curl: {
    view: "side", anchor: "hip", lines: [{ from: "ankle", to: [24, 212], kind: "band" }], scene: [{ k: "rack", x: 24 }],
    keys: [k({ at: [130, 206], torso: 90, arm: fk(80, -90), leg: fk(-90, -90), cue: "Lower slowly" }), k({ leg: fk(-90, -168), t: 0.9, cue: "Curl heels up" })],
    steps: ["Lie face down with a band around your ankles anchored behind you", "Curl your heels toward your glutes", "Lower slowly"],
  },

  // ── Hinges & hip extension ────────────────────────────────
  deadlift: {
    view: "side", anchor: "hip", loads: [{ kind: "barbell" }],
    keys: [
      k({ at: [113, 168], torso: 65, leg: FEET, arm: ik(156, 204), hold: 0.4, cue: "Brace, bar over mid-foot" }),
      k({ at: [126, 160], torso: 44, arm: ik(155, 172), t: 0.7, hold: 0, cue: "Push the floor away" }),
      k({ at: [148, 133], torso: 2, arm: ik(154, 138), t: 0.7, hold: 0.4, cue: "Lock out with glutes" }),
      k({ at: [126, 160], torso: 44, arm: ik(155, 172), t: 0.7, hold: 0, cue: "Hips back" }),
    ],
    steps: ["Bar over mid-foot, shins touching, flat back", "Push the floor away, keeping the bar against your legs", "Stand tall, then lower by pushing your hips back"],
  },
  trap_bar_deadlift: {
    view: "side", anchor: "hip", loads: [{ kind: "trapbar" }],
    keys: [k({ at: [122, 176], torso: 40, leg: FEET, arm: ik(152, 194), hold: 0.3, cue: "Sit down to the handles" }), k({ at: [148, 133], torso: 1, arm: ik(152, 138), t: 1, hold: 0.3, cue: "Stand up tall" })],
    steps: ["Stand inside the bar, grip the handles at your sides", "Brace and push through the floor to stand", "Lower by sitting your hips back and down"],
  },
  rdl: {
    view: "side", anchor: "hip", loads: [{ kind: "barbell" }],
    keys: [k({ ...STAND, torso: 3, arm: ik(154, 136), cue: "Squeeze glutes to stand" }), k({ at: [126, 141], torso: 72, arm: ik(178, 178), t: 1.5, cue: "Push hips back, bar close" })],
    steps: ["Stand with soft knees, weight in front of your thighs", "Push your hips back, sliding the weight down your legs with a flat back", "Stop at a deep hamstring stretch and drive your hips forward"],
  },
  good_morning: {
    view: "side", anchor: "hip", scene: [{ k: "rack", x: 106 }], loads: [{ kind: "barbell" }],
    keys: [k({ ...STAND, torso: 3, arm: fk(-35, 160, { rel: true }), cue: "Drive hips forward" }), k({ at: [126, 139], torso: 75, t: 1.5, cue: "Hinge, flat back" })],
    steps: ["Bar on your upper back, soft knees", "Push your hips back until your torso is near parallel", "Drive your hips forward to stand"],
  },
  single_leg_rdl: {
    view: "side", anchor: "hip", loads: [{ kind: "dumbbell" }],
    keys: [k({ ...STAND, torso: 3, leg: ik(152, G), leg2: fk(2, 2), arm: fk(0, 0), cue: "Stand tall" }), k({ at: [140, 137], torso: 80, leg2: fk(-78, -80), t: 1.5, cue: "Hinge, back leg long" })],
    steps: ["Stand on one leg with a soft knee", "Hinge forward as your free leg reaches back, hips square", "Drive through the standing heel to return"],
  },
  kb_swing: {
    view: "side", anchor: "hip", loads: [{ kind: "kettlebell" }],
    keys: [k({ at: [128, 145], torso: 62, leg: FEET, arm: fk(-20, -28), t: 0.5, hold: 0.05, cue: "Hike it back" }), k({ at: [150, 133], torso: -4, arm: fk(95, 95), t: 0.45, hold: 0.15, cue: "Snap hips forward" })],
    steps: ["Hike the bell back between your legs with a flat back", "Snap your hips forward so the bell floats to chest height", "Let it fall back and hinge into the next rep"],
  },
  back_extension: {
    view: "side", anchor: "hip", scene: [{ k: "pad", x: 160, y: 162, angle: -45, len: 34 }, { k: "plate", x: 88, y: 214, angle: 45 }],
    keys: [k({ at: [150, 150], torso: 45, leg: fk(-45, -45), foot: 45, arm: fk(40, 150, { rel: true }), cue: "Raise to a straight line" }), k({ torso: 138, t: 1.3, cue: "Lower with a flat back" })],
    steps: ["Set the pad just below your hip bones, feet locked in", "Lower your torso by hinging at the hips", "Raise up until your body forms a straight line"],
  },
  hip_thrust: {
    view: "side", anchor: "shoulder", scene: [{ k: "bench", x1: 46, x2: 112, y: 184 }], loads: [{ kind: "barbell" }],
    keys: [k({ at: [110, 176], torso: -55, leg: ik(184, G), arm: ik(158, 198), cue: "Lower hips" }), k({ torso: -92, arm: ik(162, 164), t: 0.9, hold: 0.4, cue: "Drive hips up, squeeze" })],
    steps: ["Upper back on a bench, bar over your hips, feet flat", "Drive your hips up until your body is flat from knees to shoulders", "Pause with glutes squeezed, then lower"],
  },
  glute_bridge: {
    view: "side", anchor: "shoulder",
    keys: [k({ at: [92, 203], torso: -96, leg: ik(162, G), arm: fk(88, 88), cue: "Lower" }), k({ torso: -116, head: 22, t: 0.8, hold: 0.4, cue: "Squeeze glutes up" })],
    steps: ["Lie on your back, knees bent, feet flat", "Drive through your heels to lift your hips", "Squeeze at the top, then lower"],
  },
  kickback: {
    view: "side", anchor: "hip", scene: [{ k: "stack", x: 236, pulley: 212 }], lines: [{ from: "ankle2", to: [236, 212], kind: "cable" }],
    keys: [k({ at: [146, 133], torso: 25, leg: ik(150, G), leg2: fk(4, 2), arm: fk(75, 80), cue: "Return slowly" }), k({ leg2: fk(-40, -38), t: 0.8, hold: 0.2, cue: "Kick back, squeeze" })],
    steps: ["Strap the cuff to one ankle and hold the machine", "Kick your leg back without arching your lower back", "Return slowly"],
  },

  // ── Hips (front view) ─────────────────────────────────────
  abduction: {
    view: "front", anchor: "hip", scene: [{ k: "seat", x: 116, w: 68, y: 168 }], loads: [{ kind: "pad", at: "knee" }, { kind: "pad", at: "knee2" }],
    keys: [k({ at: [150, 154], arm: fk(14, 4), leg: fk(6, 0, { k: 0.5, kb: 1 }), cue: "Return slowly" }), k({ leg: fk(55, 14, { k: 0.5, kb: 1 }), t: 0.9, hold: 0.2, cue: "Push knees out" })],
    steps: ["Sit tall with the pads on the outside of your knees", "Push your knees out as far as you can", "Return slowly"],
  },
  adduction: {
    view: "front", anchor: "hip", scene: [{ k: "seat", x: 116, w: 68, y: 168 }], loads: [{ kind: "pad", at: "knee" }, { kind: "pad", at: "knee2" }],
    keys: [k({ at: [150, 154], arm: fk(14, 4), leg: fk(55, 14, { k: 0.5, kb: 1 }), cue: "Open slowly" }), k({ leg: fk(6, 0, { k: 0.5, kb: 1 }), t: 0.9, hold: 0.2, cue: "Squeeze knees together" })],
    steps: ["Sit with the pads on the inside of your knees", "Squeeze your knees together", "Open slowly to a comfortable stretch"],
  },
  band_abduction: {
    view: "front", anchor: "hip", lines: [{ from: "knee", to: "knee2", kind: "band" }],
    keys: [k({ at: [150, 136], torso: 0, arm: fk(30, 100), leg: fk(4, -8, { k: 0.8, kb: 1 }), cue: "Return slowly" }), k({ leg: fk(24, -8, { k: 0.8, kb: 1 }), t: 0.8, hold: 0.2, cue: "Push knees out" })],
    steps: ["Band just above your knees, quarter-squat stance", "Push your knees out against the band", "Return slowly, keeping tension"],
  },
  side_plank: {
    view: "front", anchor: "ankle2",
    keys: [k({ at: [234, 212], rot: -75, torso: 0, leg: fk(1, 1), arm2: fk(75, 165), arm: fk(28, -20), cue: "Hips up, breathe" }), k({ rot: -73, t: 1.5, hold: 0.6, cue: "Hold a straight line" })],
    steps: ["Lie on your side, elbow under your shoulder", "Lift your hips until your body is straight", "Hold and breathe"],
  },
  copenhagen: {
    view: "front", anchor: "ankle", scene: [{ k: "bench", x1: 214, x2: 290, y: 186 }],
    keys: [k({ at: [238, 180], rot: -70, torso: 0, leg: fk(2, 2), leg2: fk(-14, 10), arm2: fk(70, 160), arm: fk(28, -20), cue: "Hips up, breathe" }), k({ rot: -68, t: 1.5, hold: 0.6, cue: "Hold, top leg drives down" })],
    steps: ["Side plank with your top leg on a bench", "Lift your hips so your body is straight, bottom leg free", "Hold, pressing the top leg into the bench"],
  },

  // ── Calves ────────────────────────────────────────────────
  calf_raise: {
    view: "side", anchor: "toe", scene: [{ k: "box", x: 158, w: 40, top: 210 }], loads: [{ kind: "yoke", at: "shoulder" }],
    keys: [k({ at: [168, 205], torso: 0, leg: fk(0, 0), arm: fk(-20, 160), foot: 110, cue: "Lower to a deep stretch" }), k({ foot: 40, t: 0.8, hold: 0.4, cue: "Rise onto your toes" })],
    steps: ["Balls of your feet on the step, heels hanging", "Lower your heels for a deep stretch", "Rise as high as you can and pause"],
  },
  calf_raise_free: {
    view: "side", anchor: "toe", scene: [{ k: "rack", x: 216 }, { k: "box", x: 158, w: 40, top: 210 }], loads: [{ kind: "dumbbell", at: "hand" }],
    keys: [k({ at: [168, 205], torso: 0, leg: fk(0, 0), arm: fk(0, 0), arm2: fk(72, 86), foot: 110, cue: "Lower to a deep stretch" }), k({ foot: 40, t: 0.8, hold: 0.4, cue: "Rise onto your toes" })],
    steps: ["Stand on the edge of a step, holding support", "Lower your heels for a deep stretch", "Rise as high as you can and pause"],
  },
  seated_calf: {
    view: "side", anchor: "toe", scene: [{ k: "box", x: 168, w: 40, top: 210 }, { k: "seat", x: 98, w: 50, y: 180 }], loads: [{ kind: "pad", at: "knee" }],
    keys: [k({ at: [182, 205], torso: 0, leg: fk(90, 0), arm: fk(40, 60), foot: 110, cue: "Lower heels" }), k({ foot: 40, t: 0.8, hold: 0.4, cue: "Push up onto toes" })],
    steps: ["Sit with the pad on your lower thighs, balls of feet on the step", "Lower your heels for a stretch", "Push up as high as you can"],
  },
  leg_press_calf: {
    view: "side", anchor: "hip", scene: [{ k: "rail", x1: 110, y1: 214, x2: 236, y2: 88 }, { k: "seat", x: 74, w: 52, y: 188 }], backpad: "back", loads: [{ kind: "platform", at: "toe", angle: 45 }],
    keys: [k({ at: [100, 178], torso: -62, arm: fk(40, 60), leg: ik(155, 123), foot: 236, cue: "Lower heels" }), k({ foot: 196, t: 0.8, hold: 0.4, cue: "Press through your toes" })],
    steps: ["Legs straight, balls of your feet on the platform edge", "Let your toes come back toward you", "Press through your toes as far as you can"],
  },

  // ── Core ──────────────────────────────────────────────────
  plank: {
    view: "side", anchor: "elbow",
    keys: [k({ at: [190, 212], torso: 81, leg: fk(-81, -81), arm: fk(0, 90), cue: "Squeeze glutes, ribs down" }), k({ torso: 80.3, leg: fk(-80.3, -80.3), t: 1.6, hold: 0.4, cue: "Breathe, hold the line" })],
    steps: ["Forearms under your shoulders, legs straight", "Squeeze your glutes and brace your abs", "Hold a straight line and breathe"],
  },
  ab_wheel: {
    view: "side", anchor: "knee", scene: [{ k: "mat", x: 50, w: 80 }], loads: [{ kind: "wheel", at: "hand" }],
    keys: [k({ at: [100, 212], torso: 70, leg: fk(0, -90), foot: -90, arm: ik(152, 207), cue: "Pull back with your abs" }), k({ torso: 84, leg: fk(-55, -90), arm: ik(236, 207), t: 1.5, cue: "Roll out, back flat" })],
    steps: ["Kneel with the wheel under your shoulders", "Roll forward as far as you can without your back sagging", "Pull back using your abs"],
  },
  dead_bug: {
    view: "side", anchor: "hip",
    keys: [
      k({ at: [150, 206], torso: -90, arm: fk(180, 180), arm2: fk(180, 180), leg: fk(180, 90), leg2: fk(180, 90), cue: "Back to start" }),
      k({ arm: fk(258, 258), leg2: fk(95, 95), t: 1, hold: 0.3, cue: "Reach opposite arm and leg" }),
      k({ arm: fk(180, 180), leg2: fk(180, 90), t: 0.9, cue: "Back to start" }),
      k({ arm2: fk(258, 258), leg: fk(95, 95), t: 1, hold: 0.3, cue: "Switch sides" }),
    ],
    steps: ["Lie on your back, arms up, knees over hips", "Lower one arm and the opposite leg toward the floor, back pressed down", "Return and switch sides"],
  },
  hanging_leg_raise: {
    view: "side", anchor: "shoulder", scene: [{ k: "pullbar", x: 150, y: 14 }],
    keys: [k({ at: [150, 72], torso: 0, arm: ik(150, 14), leg: fk(0, -6), cue: "Lower slowly" }), k({ torso: -12, leg: fk(96, 94), t: 1.1, hold: 0.2, cue: "Raise your legs" })],
    steps: ["Hang from a bar with straight arms", "Raise your legs to hip height without swinging", "Lower slowly"],
  },
  cable_crunch: {
    view: "side", anchor: "knee", scene: [{ k: "stack", x: 52, pulley: 30 }, { k: "mat", x: 80, w: 100 }], lines: [{ from: "hand", to: [52, 30], kind: "cable" }], loads: [{ kind: "rope", at: "hand" }],
    keys: [k({ at: [130, 212], torso: 22, leg: fk(-8, -90), foot: -90, arm: fk(140, 20, { rel: true }), cue: "Rise slowly" }), k({ torso: 74, t: 1, hold: 0.2, cue: "Curl down, ribs to hips" })],
    steps: ["Kneel facing the pulley, rope beside your head", "Crunch your ribs toward your hips, hips still", "Rise slowly"],
  },
  reverse_crunch: {
    view: "side", anchor: "hip", scene: [FLAT_BENCH],
    keys: [k({ at: [148, 170], torso: -90, arm: fk(-90, -90), leg: fk(175, 88), cue: "Lower slowly" }), k({ at: [148, 164], torso: -112, leg: fk(215, 150), t: 0.9, hold: 0.2, cue: "Curl hips off the bench" })],
    steps: ["Lie on a bench holding behind your head, knees bent", "Curl your hips off the bench, knees toward your chest", "Lower slowly"],
  },
  pallof: {
    view: "side", anchor: "hip", scene: [{ k: "stack", x: 26, pulley: 102 }], lines: [{ from: "hand", to: [26, 102], kind: "cable" }], loads: [{ kind: "handle", at: "hand" }],
    keys: [k({ at: [150, 136], torso: 4, leg: ik(162, G), leg2: ik(140, G), arm: ik(168, 104), cue: "Back to chest" }), k({ arm: ik(206, 102), t: 0.9, hold: 0.6, cue: "Press out, resist the twist" })],
    steps: ["Stand side-on to the anchor, handle at your chest", "Press straight out and resist being pulled round", "Hold, then return to your chest"],
  },
  woodchop: {
    view: "front", anchor: "hip", scene: [{ k: "stack", x: 252, pulley: 30 }], lines: [{ from: "hand", to: [252, 30], kind: "cable" }], loads: [{ kind: "handle", at: "hand" }],
    keys: [k({ at: [150, 133], torso: 12, sw: 0.5, leg: fk(12, 2), arm: ik(190, 46), arm2: ik(190, 46), cue: "Return under control" }), k({ at: [146, 148], torso: -14, leg: fk(14, 0, { k: 0.62, kb: 1 }), arm: ik(118, 146), arm2: ik(118, 146), t: 0.9, cue: "Chop across your body" })],
    steps: ["Stand side-on to a high pulley, both hands on the handle", "Pull diagonally across your body, rotating through your trunk", "Return slowly"],
  },

  // ── Carries ───────────────────────────────────────────────
  carry: {
    view: "side", anchor: "hip", loads: [{ kind: "dumbbell" }],
    keys: [
      k({ at: [150, 133], torso: 0, arm: fk(0, 0), leg: fk(16, 4), leg2: fk(-16, -30), foot: 90, foot2: 70, t: 0.45, hold: 0, cue: "Walk tall, short steps" }),
      k({ leg: fk(-16, -30), leg2: fk(16, 4), foot: 70, foot2: 90, t: 0.45, hold: 0, cue: "Walk tall, short steps" }),
    ],
    steps: ["Pick up heavy weights and stand tall", "Walk with short, quick steps, shoulders back", "Don't let the weights pull you sideways"],
  },

  // ── Power ─────────────────────────────────────────────────
  box_jump: {
    view: "side", anchor: "hip", scene: [{ k: "box", x: 182, w: 60, top: 176 }],
    keys: [
      k({ at: [132, 170], torso: 38, leg: ik(150, G), arm: fk(-55, -60), cut: true, hold: 0.25, cue: "Load hips, arms back" }),
      k({ at: [168, 96], torso: 8, leg: ik(176, 152), arm: fk(120, 128), t: 0.4, hold: 0, cue: "Explode up" }),
      k({ at: [192, 133], torso: 30, leg: ik(210, 171), arm: fk(70, 80), t: 0.35, hold: 0.2, cue: "Land soft" }),
      k({ at: [208, 90], torso: 2, arm: fk(4, 4), t: 0.6, hold: 0.5, cue: "Stand tall, step down" }),
    ],
    steps: ["Stand a short step from the box", "Swing your arms and jump, landing softly in a half squat", "Stand up, then step (don't jump) down"],
  },
  broad_jump: {
    view: "side", anchor: "hip",
    keys: [
      k({ at: [62, 170], torso: 40, leg: ik(80, G), arm: fk(-55, -60), cut: true, hold: 0.25, cue: "Load hips, arms back" }),
      k({ at: [132, 110], torso: 20, leg: ik(140, 168), arm: fk(120, 128), t: 0.4, hold: 0, cue: "Jump out" }),
      k({ at: [202, 172], torso: 40, leg: ik(222, G), arm: fk(80, 85), t: 0.4, hold: 0.2, cue: "Stick the landing" }),
      k({ at: [220, 133], torso: 0, arm: fk(4, 4), t: 0.6, hold: 0.4, cue: "Stand, reset" }),
    ],
    steps: ["Feet hip-width, swing your arms back as you hinge", "Jump forward as far as you can, driving the arms", "Land softly in a squat and hold"],
  },
  cmj: {
    view: "side", anchor: "hip",
    keys: [
      k({ ...STAND, arm: fk(4, 4), hold: 0.3, cue: "Stand tall" }),
      k({ at: [136, 166], torso: 34, arm: fk(-50, -55), t: 0.4, hold: 0, cue: "Quick dip" }),
      k({ at: [150, 100], torso: 0, leg: ik(150, 186), arm: fk(135, 140), t: 0.35, hold: 0, cue: "Jump as high as you can" }),
      k({ at: [140, 160], torso: 25, leg: ik(150, G), arm: fk(40, 60), t: 0.35, hold: 0.25, cue: "Land soft" }),
    ],
    steps: ["Stand tall", "Dip quickly and swing your arms", "Jump as high as you can and land softly"],
  },
  trap_bar_jump: {
    view: "side", anchor: "hip", loads: [{ kind: "trapbar" }],
    keys: [
      k({ ...STAND, arm: fk(0, 0), hold: 0.3, cue: "Stand tall" }),
      k({ at: [134, 164], torso: 32, t: 0.4, hold: 0, cue: "Dip" }),
      k({ at: [150, 112], torso: 0, leg: ik(150, 200), t: 0.3, hold: 0, cue: "Jump" }),
      k({ at: [140, 160], torso: 25, leg: ik(150, G), t: 0.35, hold: 0.25, cue: "Land soft" }),
    ],
    steps: ["Stand in the trap bar holding light weight", "Dip and jump explosively", "Land softly, reset and repeat"],
  },
  slam: {
    view: "side", anchor: "hip", loads: [{ kind: "medball" }],
    keys: [k({ at: [150, 130], torso: -8, leg: FEET, arm: fk(170, 178), t: 0.6, hold: 0.15, cue: "Reach tall" }), k({ at: [136, 150], torso: 58, arm: fk(55, 50), t: 0.3, hold: 0.2, cue: "Slam it down" })],
    steps: ["Lift the ball overhead, rising onto your toes", "Slam it into the floor with your whole body", "Pick it up and repeat"],
  },
  chest_pass: {
    view: "side", anchor: "hip", loads: [{ kind: "medball" }],
    keys: [k({ at: [148, 140], torso: 15, leg: ik(165, G), leg2: ik(132, G), arm: ik(170, 104), hold: 0.3, cue: "Ball at chest" }), k({ at: [156, 137], torso: 10, arm: ik(214, 100), t: 0.3, hold: 0.25, cue: "Throw hard" })],
    steps: ["Athletic stance, ball at your chest", "Step and push the ball explosively forward", "Follow through with straight arms"],
  },
  rot_throw: {
    view: "front", anchor: "hip", loads: [{ kind: "medball", at: "hands" }],
    keys: [k({ at: [150, 138], torso: -10, sw: 0.35, leg: fk(16, 2, { k: 0.9, kb: 1 }), arm: ik(122, 142), arm2: ik(122, 142), hold: 0.3, cue: "Load the back hip" }), k({ at: [150, 134], torso: 10, leg: fk(12, 2), arm: ik(206, 72), arm2: ik(206, 72), t: 0.35, hold: 0.25, cue: "Rotate and throw" })],
    steps: ["Stand side-on to a wall, ball at your back hip", "Rotate hard from your hips and throw into the wall", "Catch and reset"],
  },
  hang_clean: {
    view: "side", anchor: "hip", loads: [{ kind: "barbell" }],
    keys: [
      k({ at: [140, 140], torso: 28, leg: FEET, arm: ik(164, 150), cut: true, hold: 0.35, cue: "Hinge, bar at mid-thigh" }),
      k({ at: [150, 128], torso: -6, shrug: 6, arm: ik(152, 126), t: 0.3, hold: 0, cue: "Jump and shrug" }),
      k({ at: [140, 152], torso: 10, shrug: 0, arm: ik(165, 98), t: 0.3, hold: 0.2, cue: "Catch on your shoulders" }),
      k({ at: [150, 133], torso: 2, arm: ik(166, 84), t: 0.7, hold: 0.5, cue: "Stand up" }),
    ],
    steps: ["Hold the bar at mid-thigh with a flat back", "Jump and shrug, pulling yourself under the bar", "Catch it on your shoulders in a quarter squat, elbows high"],
  },
  kb_snatch: {
    view: "side", anchor: "hip", loads: [{ kind: "kettlebell", at: "hand" }],
    keys: [k({ at: [128, 145], torso: 62, leg: FEET, arm: fk(-20, -28), arm2: fk(30, 40), t: 0.6, hold: 0.05, cue: "Hike it back" }), k({ at: [150, 133], torso: -3, arm: fk(176, 178), arm2: fk(6, 6), t: 0.55, hold: 0.4, cue: "Punch through to lockout" })],
    steps: ["Hike the bell back between your legs", "Drive your hips forward and let the bell travel up close to your body", "Punch your hand through to lock out overhead"],
  },

  // ── Conditioning ──────────────────────────────────────────
  bike: {
    view: "side", anchor: "hip", scene: [{ k: "bike", cx: 156, cy: 198, seat: [126, 160], bars: [196, 120] }],
    keys: Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      const p = (s: number): V => [156 + 16 * Math.cos(a + s), 198 + 16 * Math.sin(a + s)];
      return k({ at: [128, 152], torso: 38, arm: ik(194, 122), leg: ik(...p(0)), leg2: ik(...p(Math.PI)), t: 0.11, hold: 0, cue: i < 4 ? "Push hard" : "Steady rhythm" });
    }),
    steps: ["Set the seat so your knee is slightly bent at the bottom", "Pedal hard during the work interval", "Ease off to recover, then repeat"],
  },
  rower: {
    view: "side", anchor: "hip", scene: [{ k: "rower" }], lines: [{ from: "hand", to: [226, 184], kind: "chain" }], loads: [{ kind: "slide", at: "hip" }, { kind: "handle", at: "hand" }],
    keys: [
      k({ at: [124, 196], torso: 22, leg: ik(176, 198), arm: ik(194, 176), hold: 0.05, cue: "Catch: shins vertical" }),
      k({ at: [96, 196], arm: ik(166, 176), t: 0.4, hold: 0, cue: "Legs drive" }),
      k({ torso: -22, arm: ik(118, 168), t: 0.3, hold: 0.05, cue: "Lean back, pull" }),
      k({ torso: 22, arm: ik(166, 176), t: 0.4, hold: 0, cue: "Arms, body, then legs" }),
    ],
    steps: ["Start at the catch: shins vertical, arms long", "Drive with the legs, then lean back and pull to your ribs", "Return in reverse: arms, body, then legs"],
  },
  sled_push: {
    view: "side", anchor: "hip", scene: [{ k: "sled", x: 196 }],
    keys: [
      k({ at: [122, 160], torso: 58, arm: ik(186, 150), leg: ik(134, 207), leg2: ik(92, 207), foot: 60, t: 0.35, hold: 0, cue: "Low and drive" }),
      k({ leg: ik(114, 196), leg2: ik(112, 207), t: 0.2, hold: 0, cue: "Low and drive" }),
      k({ leg: ik(92, 207), leg2: ik(134, 207), t: 0.2, hold: 0, cue: "Low and drive" }),
      k({ leg: ik(112, 207), leg2: ik(114, 196), t: 0.2, hold: 0, cue: "Low and drive" }),
    ],
    steps: ["Lean into the sled with arms bent, body at about 45°", "Drive with short, powerful steps", "Keep your hips low and back flat"],
  },
  burpee: {
    view: "side", anchor: "hip",
    keys: [
      k({ ...STAND, arm: fk(4, 4), foot: 90, hold: 0.1, cue: "Land and stand tall" }),
      k({ at: [134, 176], torso: 58, arm: fk(15, 5), t: 0.4, hold: 0, cue: "Squat, hands down" }),
      k({ at: [150, 176], torso: 72, arm: fk(2, 2), leg: ik(76, 204), foot: 20, t: 0.3, hold: 0.1, cue: "Kick feet back" }),
      k({ at: [134, 176], torso: 58, arm: fk(15, 5), leg: FEET, foot: 90, t: 0.3, hold: 0, cue: "Jump feet in" }),
      k({ at: [150, 112], torso: 0, arm: fk(170, 175), leg: ik(150, 194), t: 0.35, hold: 0, cue: "Jump up" }),
    ],
    steps: ["Squat and put your hands on the floor", "Jump your feet back to a plank, then back in", "Stand and jump, reaching overhead"],
  },
  jump_rope: {
    view: "side", anchor: "hip", loads: [{ kind: "jumprope", at: "hand" }],
    keys: [k({ ...STAND, arm: fk(18, 70), t: 0.22, hold: 0, cue: "Small hops, wrists turn" }), k({ at: [150, 124], leg: ik(150, 206), t: 0.22, hold: 0, cue: "Small hops, wrists turn" })],
    steps: ["Elbows by your sides, rope behind you", "Turn the rope with your wrists", "Hop just high enough to clear it, landing on the balls of your feet"],
  },
  mountain_climber: {
    view: "side", anchor: "hip",
    keys: [
      k({ at: [150, 174], torso: 70, arm: ik(205, 213), leg: ik(156, 200), leg2: ik(80, 202), t: 0.28, hold: 0, cue: "Drive knees fast" }),
      k({ leg: ik(80, 202), leg2: ik(156, 200), t: 0.28, hold: 0, cue: "Drive knees fast" }),
    ],
    steps: ["Start in a high plank, hands under shoulders", "Drive one knee toward your chest, then switch quickly", "Keep your hips level"],
  },
} satisfies Record<string, Motion>;

export type MotionId = keyof typeof MOTIONS;

/* ─────────────────────────── Exercise mapping ─────────────────────────── */

interface DemoSpec {
  m: MotionId;
  /** Replace the motion's loads (null = none). */
  load?: LoadKind | null;
  loadAt?: JointName | "hands";
  lines?: Line[];
  scene?: SceneItem[];
}

const D = (m: MotionId, o: Omit<DemoSpec, "m"> = {}): DemoSpec => ({ m, ...o });
const toFeet: Line[] = [{ from: "hand", to: "toe", kind: "band" }];

const DEMOS: Record<string, DemoSpec> = {
  bb_bench: D("bench"),
  db_bench: D("bench", { load: "dumbbell" }),
  machine_chest_press: D("machine_press"),
  pushup: D("pushup"),
  dips: D("dips"),
  smith_bench: D("bench", { scene: [{ k: "smith", x: 112 }, FLAT_BENCH] }),
  incline_bb_bench: D("incline_press"),
  incline_db_press: D("incline_press", { load: "dumbbell" }),
  incline_machine_press: D("incline_machine_press"),
  deficit_pushup: D("pushup", { load: "handle", loadAt: "hand" }),
  cable_fly: D("fly_front"),
  pec_deck: D("pec_deck"),
  db_fly: D("db_fly"),
  band_fly: D("fly_front", { load: null, lines: [{ from: "hand", to: [292, 92], kind: "band" }, { from: "hand2", to: [8, 92], kind: "band" }], scene: [] }),
  ohp: D("ohp"),
  db_shoulder_press: D("seated_press"),
  machine_shoulder_press: D("seated_press", { load: "handle", loadAt: "hand" }),
  landmine_press: D("landmine_press"),
  pike_pushup: D("pike_pushup"),
  kb_press: D("one_arm_press"),
  db_lateral_raise: D("lateral_raise"),
  cable_lateral_raise: D("cable_lateral"),
  machine_lateral_raise: D("machine_lateral"),
  band_lateral_raise: D("lateral_raise", { load: null, lines: [{ from: "hand", to: "ankle", kind: "band" }, { from: "hand2", to: "ankle2", kind: "band" }] }),
  reverse_pec_deck: D("rear_fly_front"),
  face_pull: D("face_pull"),
  db_rear_delt_fly: D("bent_rear_fly"),
  band_pull_apart: D("pull_apart"),
  pullup: D("pullup"),
  chinup: D("pullup"),
  lat_pulldown: D("pulldown"),
  neutral_pulldown: D("pulldown"),
  assisted_pullup: D("assisted_pullup"),
  band_pulldown: D("pulldown", { load: null, lines: [{ from: "hand", to: [150, 6], kind: "band" }] }),
  bb_row: D("bent_row"),
  db_row: D("db_row"),
  chest_supported_row: D("chest_supported_row"),
  seated_cable_row: D("cable_row"),
  machine_row: D("machine_row"),
  inverted_row: D("inverted_row"),
  band_row: D("band_row"),
  kb_row: D("bent_row", { load: "kettlebell", loadAt: "hand" }),
  cable_pullover: D("pullover_cable"),
  db_pullover: D("db_pullover"),
  db_shrug: D("shrug"),
  bb_shrug: D("shrug", { load: "barbell" }),
  bb_curl: D("curl", { load: "barbell" }),
  db_curl: D("curl"),
  incline_db_curl: D("incline_curl"),
  hammer_curl: D("curl"),
  cable_curl: D("curl", { load: "handle", lines: [{ from: "hand", to: [214, 212], kind: "cable" }], scene: [{ k: "stack", x: 214, pulley: 212 }] }),
  preacher_curl: D("preacher_curl"),
  band_curl: D("curl", { load: null, lines: toFeet }),
  cable_pushdown: D("pushdown"),
  overhead_cable_ext: D("overhead_cable_ext"),
  skull_crusher: D("skull_crusher"),
  db_overhead_ext: D("overhead_ext"),
  close_grip_bench: D("bench"),
  bench_dip: D("bench_dip"),
  band_pushdown: D("pushdown", { load: null, lines: [{ from: "hand", to: [212, 30], kind: "band" }], scene: [{ k: "rack", x: 212 }] }),
  diamond_pushup: D("pushup"),
  back_squat: D("squat_back"),
  front_squat: D("squat_front"),
  hack_squat: D("hack_squat"),
  leg_press: D("leg_press"),
  goblet_squat: D("squat_goblet"),
  smith_squat: D("smith_squat"),
  kb_goblet_squat: D("squat_goblet", { load: "kettlebell" }),
  bw_squat: D("squat_bw"),
  box_squat: D("box_squat"),
  bulgarian_split_squat: D("split_squat"),
  walking_lunge: D("walking_lunge"),
  reverse_lunge: D("reverse_lunge"),
  step_up: D("step_up"),
  bw_split_squat: D("bw_split_squat"),
  leg_extension: D("leg_extension"),
  spanish_squat: D("spanish_squat"),
  lying_leg_curl: D("leg_curl_lying"),
  seated_leg_curl: D("leg_curl_seated"),
  nordic_curl: D("nordic_curl"),
  swiss_ball_curl: D("ball_curl"),
  band_leg_curl: D("band_leg_curl"),
  deadlift: D("deadlift"),
  trap_bar_deadlift: D("trap_bar_deadlift"),
  rdl: D("rdl"),
  db_rdl: D("rdl", { load: "dumbbell" }),
  single_leg_rdl: D("single_leg_rdl"),
  kb_swing: D("kb_swing"),
  good_morning: D("good_morning"),
  back_extension: D("back_extension"),
  hip_thrust: D("hip_thrust"),
  machine_hip_thrust: D("hip_thrust", { load: "pad", loadAt: "hand", scene: [{ k: "bench", x1: 46, x2: 112, y: 184 }, { k: "stack", x: 250, pulley: 60 }] }),
  glute_bridge: D("glute_bridge"),
  db_hip_thrust: D("hip_thrust", { load: "dumbbell" }),
  cable_kickback: D("kickback"),
  hip_abduction_machine: D("abduction"),
  band_abduction: D("band_abduction"),
  copenhagen_plank: D("copenhagen"),
  adductor_machine: D("adduction"),
  standing_calf_raise: D("calf_raise"),
  seated_calf_raise: D("seated_calf"),
  db_calf_raise: D("calf_raise_free"),
  leg_press_calf: D("leg_press_calf"),
  bw_calf_raise: D("calf_raise_free", { load: null }),
  plank: D("plank"),
  ab_wheel: D("ab_wheel"),
  dead_bug: D("dead_bug"),
  hanging_leg_raise: D("hanging_leg_raise"),
  cable_crunch: D("cable_crunch"),
  reverse_crunch: D("reverse_crunch"),
  pallof_press: D("pallof"),
  band_pallof: D("pallof", { load: null, lines: [{ from: "hand", to: [26, 102], kind: "band" }], scene: [{ k: "rack", x: 26 }] }),
  cable_woodchop: D("woodchop"),
  side_plank: D("side_plank"),
  farmer_carry: D("carry"),
  suitcase_carry: D("carry", { load: "kettlebell", loadAt: "hand" }),
  box_jump: D("box_jump"),
  broad_jump: D("broad_jump"),
  cmj: D("cmj"),
  trap_bar_jump: D("trap_bar_jump"),
  med_ball_slam: D("slam"),
  med_ball_chest_pass: D("chest_pass"),
  rotational_throw: D("rot_throw"),
  hang_power_clean: D("hang_clean"),
  push_press: D("push_press"),
  kb_snatch: D("kb_snatch"),
  plyo_pushup: D("plyo_pushup"),
  bike_intervals: D("bike"),
  row_intervals: D("rower"),
  sled_push: D("sled_push"),
  burpee: D("burpee"),
  kb_complex: D("kb_swing"),
  jump_rope: D("jump_rope"),
  mountain_climber: D("mountain_climber"),
};

export interface Demo extends Motion {
  id: MotionId;
}

/** The animated demo for an exercise, or null if it has none. */
export function demoFor(ex: Pick<Exercise, "id">): Demo | null {
  const spec = DEMOS[ex.id];
  if (!spec) return null;
  const base = MOTIONS[spec.m] as Motion;
  const loads = spec.load === null ? [] : spec.load ? [{ kind: spec.load, at: spec.loadAt ?? base.loads?.[0]?.at, angle: base.loads?.[0]?.angle }] : base.loads;
  return {
    ...base,
    id: spec.m,
    loads,
    lines: spec.lines ?? (spec.load === null ? [] : base.lines),
    scene: spec.scene ?? base.scene,
  };
}

export const DEMO_IDS = Object.keys(DEMOS);
export const VIEW_LABEL: Record<View, string> = { side: "Side view", front: "Front view" };
export { FLOOR };
