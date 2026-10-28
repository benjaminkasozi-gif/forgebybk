import { describe, expect, it } from "vitest";
import { EXERCISES } from "@/lib/engine";
import { DEMO_IDS, MOTIONS, demoFor, type Motion } from "@/features/demo/motions";
import { FLOOR, W, anchorIsValid, isIk, resolveKeys, sample, solve, solveIk, timeline, type JointName } from "@/features/demo/rig";

const motions = Object.entries(MOTIONS) as [string, Motion][];

function frames(m: Motion, n = 48) {
  const { total } = timeline(m);
  return Array.from({ length: n }, (_, i) => sample(m, (i / n) * total));
}

describe("exercise demos", () => {
  it("covers every exercise in the library", () => {
    const missing = EXERCISES.filter((e) => !demoFor(e)).map((e) => e.id);
    expect(missing).toEqual([]);
    expect(DEMO_IDS.filter((id) => !EXERCISES.some((e) => e.id === id))).toEqual([]);
  });

  it("every motion has steps and cues", () => {
    for (const [id, m] of motions) {
      expect(m.steps.length, id).toBeGreaterThanOrEqual(3);
      expect(m.keys.length, id).toBeGreaterThanOrEqual(1);
      expect(resolveKeys(m.keys).every((k) => k.cue), id).toBe(true);
    }
  });

  it("anchors are driven by forward kinematics, and limbs keep one kind across keys", () => {
    for (const [id, m] of motions) {
      expect(anchorIsValid(m), id).toBe(true);
      const keys = resolveKeys(m.keys);
      for (const limb of ["arm", "arm2", "leg", "leg2"] as const) {
        const kinds = new Set(keys.map((k) => { const s = k[limb] ?? (limb === "arm2" ? k.arm : limb === "leg2" ? k.leg : undefined); return s ? isIk(s) : "none"; }));
        expect(kinds.size, `${id}.${limb}`).toBe(1);
      }
    }
  });

  it("keeps the figure above the floor and inside the frame", () => {
    const joints: JointName[] = ["hip", "shoulder", "head", "elbow", "hand", "elbow2", "hand2", "knee", "ankle", "toe", "knee2", "ankle2", "toe2"];
    const problems: string[] = [];
    for (const [id, m] of motions) {
      for (const f of frames(m)) {
        for (const j of joints) {
          const [x, y] = f.solved.j[j];
          const limit = j === "head" ? FLOOR - 9 : FLOOR + 1;
          if (y > limit || x < -4 || x > W + 4 || y < 0) problems.push(`${id}: ${j} at ${x.toFixed(0)},${y.toFixed(0)}`);
        }
      }
    }
    expect([...new Set(problems)].slice(0, 20)).toEqual([]);
  });

  it("IK limbs reach their targets at every key", () => {
    const bad: string[] = [];
    for (const [id, m] of motions) {
      resolveKeys(m.keys).forEach((k, i) => {
        const err = solve(m.view, m.anchor, k).reachErr;
        if (err > 7) bad.push(`${id} key ${i}: ${err.toFixed(1)}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it("solves two-bone IK exactly when reachable", () => {
    const r = solveIk([0, 0], [30, 30], 30, 28, 1);
    expect(Math.hypot(r.end[0] - 30, r.end[1] - 30)).toBeLessThan(1e-6);
    expect(Math.hypot(r.mid[0], r.mid[1])).toBeCloseTo(30, 6);
    expect(30 * r.mid[1] - 30 * r.mid[0]).toBeGreaterThan(0);
  });
});
