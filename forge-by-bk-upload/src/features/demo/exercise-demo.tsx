"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { Exercise } from "@/lib/engine";
import { cn } from "@/lib/utils";
import { Figure, GymBackdrop, SceneItemView } from "./figure";
import { demoFor, VIEW_LABEL, type Demo } from "./motions";
import { H, W, sample, still, type Solved, type V } from "./rig";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function Stage({ demo, s }: { demo: Demo; s: Solved }) {
  return (
    <>
      <GymBackdrop />
      {demo.scene?.map((item, i) => <SceneItemView key={i} s={item} />)}
      <Figure s={s} loads={demo.loads} lines={demo.lines} backpad={demo.backpad} />
    </>
  );
}

/** Looping animated demo with play/pause, half speed and the live coaching cue. */
export function ExerciseDemo({ exercise, className }: { exercise: Pick<Exercise, "id" | "name">; className?: string }) {
  const demo = useMemo(() => demoFor(exercise), [exercise]);
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [slow, setSlow] = useState(false);
  const [time, setTime] = useState(0);
  const last = useRef<number | null>(null);

  useEffect(() => setPlaying(!reduced), [reduced]);
  useEffect(() => setTime(0), [exercise.id]);

  useEffect(() => {
    if (!playing || !demo) return;
    let raf = 0;
    const tick = (now: number) => {
      if (last.current != null) setTime((t) => t + ((now - last.current!) / 1000) * (slow ? 0.5 : 1));
      last.current = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      last.current = null;
    };
  }, [playing, slow, demo]);

  if (!demo) return null;
  const frame = playing || time > 0 ? sample(demo, time) : { solved: still(demo), cue: demo.keys[Math.min(1, demo.keys.length - 1)].cue };

  return (
    <figure className={cn("relative overflow-hidden rounded-2xl border border-border bg-[#14161a]", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Animated demonstration of ${exercise.name}`}>
        <Stage demo={demo} s={frame.solved} />
      </svg>
      <span className="absolute left-2.5 top-2.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">{VIEW_LABEL[demo.view]}</span>
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-8">
        <span className="text-sm font-semibold text-white">{frame.cue}</span>
      </figcaption>
      <div className="absolute right-2 top-2 flex gap-1.5">
        <button type="button" onClick={() => setSlow(!slow)} aria-pressed={slow} aria-label="Half speed" className={cn("h-8 rounded-full px-2.5 text-xs font-bold backdrop-blur", slow ? "bg-accent text-accent-fg" : "bg-black/50 text-white/80")}>
          0.5×
        </button>
        <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause demo" : "Play demo"} className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>
    </figure>
  );
}

/** Numbered how-to steps for an exercise's movement. */
export function HowToSteps({ exercise }: { exercise: Pick<Exercise, "id"> }) {
  const demo = demoFor(exercise);
  if (!demo) return null;
  return (
    <ol className="space-y-2 text-sm">
      {demo.steps.map((step, i) => (
        <li key={step} className="flex gap-3">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">{i + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

/** Static still of the working position, cropped to the athlete, for lists. */
export const DemoThumb = memo(function DemoThumb({ exerciseId, className }: { exerciseId: string; className?: string }) {
  const view = useMemo(() => {
    const demo = demoFor({ id: exerciseId });
    if (!demo) return null;
    const s = still(demo);
    const pts = Object.values(s.j) as V[];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 34;
    return { demo, s, box: `${cx - size / 2} ${cy - size / 2} ${size} ${size}` };
  }, [exerciseId]);
  if (!view) return null;
  return (
    <svg viewBox={view.box} className={className} aria-hidden="true">
      <Figure s={view.s} loads={view.demo.loads} lines={[]} />
    </svg>
  );
});
