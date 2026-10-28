/**
 * 2D figure rig for exercise demos. Pure maths, no React.
 *
 * Side view faces +x. Angles are absolute degrees, 0 = pointing down, 90 = forward, 180 = up,
 * except the torso, whose `torso` lean is measured from vertical (+ = leaning forward).
 * Front view: limb angles are measured outward from straight down, mirrored for the left side.
 * A limb is either forward-kinematic ({a, b}) or reaches for a world target ({to}) via 2-bone IK.
 */

export type V = [number, number];
export type View = "side" | "front";

export const W = 300;
export const H = 240;
export const FLOOR = 220;
/** Ankle height when a foot is flat on the floor. */
export const G = 215;

export const LEN = { torso: 52, upper: 30, fore: 28, thigh: 42, shin: 40, foot: 13, neck: 19, shoulderW: 17, hipW: 9 };

export type FkLimb = { a: number; b: number; rel?: boolean; k?: number; kb?: number };
export type IkLimb = { to: V; bend?: 1 | -1 };
export type LimbSpec = FkLimb | IkLimb;

export interface Pose {
  torso?: number;
  head?: number;
  shrug?: number;
  /** Torso length scale (foreshortening). */
  tk?: number;
  /** Front view: shoulder width scale, to suggest trunk rotation. */
  sw?: number;
  /** Whole-figure rotation, degrees clockwise, about the hip. Applied before IK. */
  rot?: number;
  arm?: LimbSpec;
  arm2?: LimbSpec;
  leg?: LimbSpec;
  leg2?: LimbSpec;
  foot?: number;
  foot2?: number;
  /** World position of the rig's anchor joint. */
  at?: V;
}

export interface Keyframe extends Pose {
  /** Seconds to travel into this key. */
  t?: number;
  /** Seconds to pause on this key. */
  hold?: number;
  cue?: string;
  /** Arrive instantly (jump-cut) instead of interpolating. */
  cut?: boolean;
}

export type JointName =
  | "hip" | "hip1" | "hip2" | "shoulder" | "shoulder2" | "head"
  | "elbow" | "hand" | "elbow2" | "hand2"
  | "knee" | "ankle" | "toe" | "knee2" | "ankle2" | "toe2";

export type Joints = Record<JointName, V>;

export interface Solved {
  view: View;
  j: Joints;
  lean: number;
  rot: number;
  /** Largest distance an IK limb fell short of its target. */
  reachErr: number;
}

export interface Rig {
  view: View;
  anchor: JointName;
  keys: Keyframe[];
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s];
const len = (a: V) => Math.hypot(a[0], a[1]);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const dirOf = (theta: number): V => [Math.sin(rad(theta)), Math.cos(rad(theta))];
/** Inverse of dirOf. */
export const angleOf = (v: V) => deg(Math.atan2(v[0], v[1]));
const rotate = (p: V, r: number): V => {
  const c = Math.cos(rad(r));
  const s = Math.sin(rad(r));
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
};

export const isIk = (l: LimbSpec): l is IkLimb => "to" in l;

/** Two-bone IK. bend = +1 puts the middle joint on the side where cross(target − base, joint − base) > 0. */
export function solveIk(base: V, target: V, l1: number, l2: number, bend: 1 | -1) {
  const v = sub(target, base);
  const raw = len(v) || 1e-6;
  const d = Math.min(Math.max(raw, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.001);
  const phi = Math.atan2(v[1], v[0]);
  const cosA = Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const A = Math.acos(cosA);
  const pick = (s: number): V => add(base, [l1 * Math.cos(phi + s * A), l1 * Math.sin(phi + s * A)]);
  let mid = pick(1);
  const m = sub(mid, base);
  if (Math.sign(v[0] * m[1] - v[1] * m[0]) !== bend) mid = pick(-1);
  const reach = add(base, mul(v, d / raw));
  const end = add(mid, mul(sub(reach, mid), l2 / (len(sub(reach, mid)) || 1)));
  return { mid, end, err: Math.max(0, raw - d) };
}

type Full = Required<Omit<Pose, "arm2" | "leg2" | "foot" | "foot2">> & Pick<Pose, "arm2" | "leg2" | "foot" | "foot2">;

const DEFAULT: Full = { torso: 0, head: 0, shrug: 0, tk: 1, sw: 1, rot: 0, arm: { a: 0, b: 0 }, leg: { a: 0, b: 0 }, at: [150, 133] };

/** Each key inherits whatever the previous key set. */
export function resolveKeys(keys: Keyframe[]): (Full & Keyframe)[] {
  const out: (Full & Keyframe)[] = [];
  let prev: Full = DEFAULT;
  for (const k of keys) {
    const { t, hold, cue, cut, ...pose } = k;
    const next = { ...prev, ...pose } as Full;
    out.push({ ...next, t, hold, cue, cut });
    prev = next;
  }
  return out;
}

function lerpLimb(a: LimbSpec | undefined, b: LimbSpec | undefined, u: number): LimbSpec | undefined {
  if (!a || !b) return u < 0.5 ? a : b;
  if (isIk(a) && isIk(b)) return { to: [lerp(a.to[0], b.to[0], u), lerp(a.to[1], b.to[1], u)], bend: b.bend };
  if (!isIk(a) && !isIk(b)) {
    return { a: lerp(a.a, b.a, u), b: lerp(a.b, b.b, u), rel: b.rel, k: lerp(a.k ?? 1, b.k ?? 1, u), kb: a.kb == null && b.kb == null ? undefined : lerp(a.kb ?? a.k ?? 1, b.kb ?? b.k ?? 1, u) };
  }
  return u < 0.5 ? a : b;
}

const lerpOpt = (a: number | undefined, b: number | undefined, u: number) => (a == null || b == null ? (u < 0.5 ? a : b) : lerp(a, b, u));

export function lerpPose(A: Full, B: Full, u: number): Full {
  return {
    torso: lerp(A.torso, B.torso, u),
    head: lerp(A.head, B.head, u),
    shrug: lerp(A.shrug, B.shrug, u),
    tk: lerp(A.tk, B.tk, u),
    sw: lerp(A.sw, B.sw, u),
    rot: lerp(A.rot, B.rot, u),
    at: [lerp(A.at[0], B.at[0], u), lerp(A.at[1], B.at[1], u)],
    arm: lerpLimb(A.arm, B.arm, u)!,
    leg: lerpLimb(A.leg, B.leg, u)!,
    arm2: lerpLimb(A.arm2 ?? A.arm, B.arm2 ?? B.arm, u),
    leg2: lerpLimb(A.leg2 ?? A.leg, B.leg2 ?? B.leg, u),
    foot: lerpOpt(A.foot, B.foot, u),
    foot2: lerpOpt(A.foot2, B.foot2, u),
  };
}

const TORSO_JOINTS = new Set<JointName>(["hip", "hip1", "hip2", "shoulder", "shoulder2", "head"]);

export function solve(view: View, anchor: JointName, p: Full): Solved {
  const l = p.torso;
  const up: V = [Math.sin(rad(l)), -Math.cos(rad(l))];
  const tl = LEN.torso * p.tk;
  const rel: Partial<Joints> = { hip: [0, 0] };

  if (view === "side") {
    rel.hip1 = rel.hip2 = [0, 0];
    rel.shoulder = rel.shoulder2 = mul(up, tl + p.shrug);
    rel.head = add(rel.shoulder, mul(dirOf(180 - (l + p.head)), LEN.neck));
  } else {
    const perp: V = [Math.cos(rad(l)), Math.sin(rad(l))];
    rel.hip1 = mul(perp, LEN.hipW);
    rel.hip2 = mul(perp, -LEN.hipW);
    const top = mul(up, tl);
    rel.shoulder = add(add(top, mul(up, p.shrug)), mul(perp, LEN.shoulderW * p.sw));
    rel.shoulder2 = add(add(top, mul(up, p.shrug)), mul(perp, -LEN.shoulderW * p.sw));
    rel.head = add(top, mul(dirOf(180 - (l + p.head)), LEN.neck));
  }

  // Forward-kinematic limbs, in the body frame (before rotation).
  const fk = (base: V, spec: FkLimb, l1: number, l2: number, side: 1 | -1): [V, V] => {
    const k1 = spec.k ?? 1;
    const k2 = spec.kb ?? k1;
    const relA = spec.rel ? (view === "side" ? l : side * l) : 0;
    const d = (theta: number): V => {
      const v = dirOf(theta + relA);
      return view === "front" ? [side * v[0], v[1]] : v;
    };
    const mid = add(base, mul(d(spec.a), l1 * k1));
    return [mid, add(mid, mul(d(spec.b), l2 * k2))];
  };

  const limbs: { spec: LimbSpec; base: JointName; mid: JointName; end: JointName; l1: number; l2: number; side: 1 | -1; leg: boolean }[] = [
    { spec: p.arm, base: "shoulder", mid: "elbow", end: "hand", l1: LEN.upper, l2: LEN.fore, side: 1, leg: false },
    { spec: p.arm2 ?? p.arm, base: "shoulder2", mid: "elbow2", end: "hand2", l1: LEN.upper, l2: LEN.fore, side: -1, leg: false },
    { spec: p.leg, base: "hip1", mid: "knee", end: "ankle", l1: LEN.thigh, l2: LEN.shin, side: 1, leg: true },
    { spec: p.leg2 ?? p.leg, base: "hip2", mid: "knee2", end: "ankle2", l1: LEN.thigh, l2: LEN.shin, side: -1, leg: true },
  ];

  const footDir = (knee: V, ankle: V, side: 1 | -1, world: boolean): V => {
    if (view === "front") return world ? rotate([side * 5, 4], p.rot) : [side * 5, 4];
    const angle = side === 1 ? p.foot : p.foot2 ?? p.foot;
    const shin = angleOf(sub(ankle, knee));
    return mul(dirOf(angle ?? (Math.abs(shin) < 70 ? 90 : shin + 90)), LEN.foot);
  };

  for (const L of limbs) {
    if (isIk(L.spec)) continue;
    [rel[L.mid], rel[L.end]] = fk(rel[L.base]!, L.spec, L.l1, L.l2, L.side);
    if (L.leg) rel[L.side === 1 ? "toe" : "toe2"] = add(rel[L.end]!, footDir(rel[L.mid]!, rel[L.end]!, L.side, false));
  }

  // Rotate the body frame, then place it so the anchor joint lands on `at`.
  const j = {} as Joints;
  for (const [k, v] of Object.entries(rel) as [JointName, V][]) j[k] = rotate(v, p.rot);
  if (!j[anchor]) throw new Error(`Anchor ${anchor} is driven by IK`);
  const offset = sub(p.at, j[anchor]);
  for (const k of Object.keys(j) as JointName[]) j[k] = add(j[k], offset);

  let reachErr = 0;
  for (const L of limbs) {
    if (!isIk(L.spec)) continue;
    const bend = L.spec.bend ?? (L.leg ? -1 : 1);
    const r = solveIk(j[L.base], L.spec.to, L.l1, L.l2, view === "front" && L.side === -1 ? (-bend as 1 | -1) : bend);
    j[L.mid] = r.mid;
    j[L.end] = r.end;
    reachErr = Math.max(reachErr, r.err);
  }

  for (const L of limbs.slice(2)) {
    if (isIk(L.spec)) j[L.side === 1 ? "toe" : "toe2"] = add(j[L.end], footDir(j[L.mid], j[L.end], L.side, true));
  }

  return { view, j, lean: l + (view === "side" ? p.rot : 0), rot: p.rot, reachErr };
}

export function anchorIsValid(rig: Rig) {
  if (TORSO_JOINTS.has(rig.anchor)) return true;
  const limbOf: Partial<Record<JointName, "arm" | "arm2" | "leg" | "leg2">> = {
    elbow: "arm", hand: "arm", elbow2: "arm2", hand2: "arm2", knee: "leg", ankle: "leg", toe: "leg", knee2: "leg2", ankle2: "leg2", toe2: "leg2",
  };
  const limb = limbOf[rig.anchor]!;
  return resolveKeys(rig.keys).every((k) => {
    const spec = k[limb] ?? (limb === "arm2" ? k.arm : limb === "leg2" ? k.leg : undefined);
    return spec && !isIk(spec);
  });
}

/** Timeline: key i is reached after travelling `t` from key i−1 (key 0 from the last key), then held. */
export function timeline(rig: Rig) {
  const keys = resolveKeys(rig.keys);
  const n = keys.length;
  const segs = keys.map((k, i) => ({ from: (i - 1 + n) % n, to: i, travel: k.cut ? 0.001 : k.t ?? 1, hold: k.hold ?? 0.15 }));
  // Start the loop at key 0 being held.
  const ordered = [...segs.slice(1), segs[0]];
  const total = ordered.reduce((s, x) => s + x.travel + x.hold, 0);
  return { keys, ordered, total };
}

const ease = (u: number) => 0.5 - Math.cos(Math.PI * u) / 2;

/** Pose at `time` seconds into the loop, with the cue for the current phase. */
export function sample(rig: Rig, time: number) {
  const { keys, ordered, total } = timeline(rig);
  if (keys.length === 1) return { solved: solve(rig.view, rig.anchor, keys[0]), cue: keys[0].cue, phase: 0 };
  let t = ((time % total) + total) % total;
  for (let i = 0; i < ordered.length; i++) {
    const s = ordered[i];
    if (t < s.travel + s.hold || i === ordered.length - 1) {
      const u = s.travel > 0 ? Math.min(1, t / s.travel) : 1;
      const pose = lerpPose(keys[s.from], keys[s.to], ease(u));
      return { solved: solve(rig.view, rig.anchor, pose), cue: keys[s.to].cue, phase: s.to };
    }
    t -= s.travel + s.hold;
  }
  return { solved: solve(rig.view, rig.anchor, keys[0]), cue: keys[0].cue, phase: 0 };
}

/** A representative still: the first working position. */
export function still(rig: Rig, key = 1) {
  const keys = resolveKeys(rig.keys);
  const k = keys[Math.min(key, keys.length - 1)];
  return solve(rig.view, rig.anchor, k);
}
