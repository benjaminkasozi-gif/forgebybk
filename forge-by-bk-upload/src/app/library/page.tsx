"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Heart, Search, ThumbsDown } from "lucide-react";
import {
  EQUIPMENT_LABEL, EXERCISES, JOINT_LABEL, MUSCLE_LABEL, PATTERN_LABEL, alternatives, e1rmSeries, eligibleExercises,
  type Equipment, type Exercise, type Joint, type Muscle,
} from "@/lib/engine";
import { useStore, useWorkouts } from "@/lib/store";
import { Badge, Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { filterExercises } from "@/features/library/exercise-picker";
import { DemoThumb, ExerciseDemo, HowToSteps } from "@/features/demo/exercise-demo";
import { cn } from "@/lib/utils";

const GROUPS: { label: string; muscles: Muscle[] }[] = [
  { label: "All", muscles: [] },
  { label: "Chest", muscles: ["chest"] },
  { label: "Back", muscles: ["lats", "upper_back", "traps"] },
  { label: "Shoulders", muscles: ["front_delts", "side_delts", "rear_delts"] },
  { label: "Biceps", muscles: ["biceps"] },
  { label: "Triceps", muscles: ["triceps"] },
  { label: "Quads", muscles: ["quads"] },
  { label: "Hamstrings", muscles: ["hamstrings"] },
  { label: "Glutes", muscles: ["glutes"] },
  { label: "Calves", muscles: ["calves"] },
  { label: "Core", muscles: ["abs", "obliques"] },
];

export default function LibraryPage() {
  const profile = useStore((s) => s.profile)!;
  const [q, setQ] = useState("");
  const [g, setG] = useState(0);
  const [onlyMine, setOnlyMine] = useState(false);
  const [open, setOpen] = useState<Exercise | null>(null);
  const mine = useMemo(() => new Set(eligibleExercises(profile).map((e) => e.id)), [profile]);
  const list = useMemo(() => filterExercises(onlyMine ? EXERCISES.filter((e) => mine.has(e.id)) : EXERCISES, q, GROUPS[g].muscles), [q, g, onlyMine, mine]);

  return (
    <div>
      <PageHeader title="Library" subtitle={`${EXERCISES.length} exercises · ${mine.size} available to you`} />
      <div className="sticky top-[60px] z-20 -mx-4 space-y-3 bg-bg/90 px-4 pb-3 pt-1 backdrop-blur-xl lg:top-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, muscle or movement" className="pl-9" aria-label="Search exercises" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip selected={onlyMine} onClick={() => setOnlyMine(!onlyMine)} className="shrink-0">My equipment</Chip>
          {GROUPS.map((x, i) => <Chip key={x.label} selected={g === i} onClick={() => setG(i)} className="shrink-0">{x.label}</Chip>)}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="py-16 text-center text-muted">No exercises match your search.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => setOpen(e)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors hover:border-muted/40">
                <div className={cn("h-12 w-12 shrink-0 overflow-hidden rounded-xl", e.mechanics === "compound" ? "bg-accent/10" : "bg-volt/10")}><DemoThumb exerciseId={e.id} className="h-full w-full" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{e.name}</div>
                  <div className="truncate text-xs text-muted">{e.primary.map((m) => MUSCLE_LABEL[m]).join(", ")} · {e.equipment.filter((x) => x !== "bodyweight").map((x) => EQUIPMENT_LABEL[x]).join(", ") || "Bodyweight"}</div>
                </div>
                {!mine.has(e.id) && <Badge>N/A</Badge>}
                {profile.preferredExercises.includes(e.id) && <Heart className="h-4 w-4 fill-accent text-accent" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && <ExerciseDetail ex={open} available={mine.has(open.id)} onClose={() => setOpen(null)} onOpen={setOpen} />}
    </div>
  );
}

function ExerciseDetail({ ex, available, onClose, onOpen }: { ex: Exercise; available: boolean; onClose: () => void; onOpen: (e: Exercise) => void }) {
  const profile = useStore((s) => s.profile)!;
  const setProfile = useStore((s) => s.setProfile);
  const workouts = useWorkouts();
  const history = e1rmSeries(workouts, ex.id);
  const best = history.length ? Math.max(...history.map((h) => h.e1rm)) : 0;
  const alts = alternatives(ex.id, profile, 6);
  const fav = profile.preferredExercises.includes(ex.id);
  const avoid = profile.dislikedExercises.includes(ex.id);
  const stressed = (Object.entries(ex.stress) as [Joint, number][]).filter(([, v]) => v >= 2);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={ex.name} description={`${PATTERN_LABEL[ex.pattern]} · ${ex.mechanics === "compound" ? "Compound" : "Isolation"}`}>
      <div className="space-y-5">
        <ExerciseDemo exercise={ex} />
        <div className="flex flex-wrap gap-1.5">
          {ex.primary.map((m) => <Badge key={m} tone="accent">{MUSCLE_LABEL[m]}</Badge>)}
          {ex.secondary.map((m) => <Badge key={m}>{MUSCLE_LABEL[m]}</Badge>)}
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Info label="Skill" value={["", "Low", "Moderate", "High"][ex.difficulty]} />
          <Info label="Fatigue" value={["", "Low", "Moderate", "High"][ex.fatigue]} />
          <Info label="Your best" value={best ? `${Math.round(best)} kg` : "—"} />
        </dl>
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Equipment</div>
          <p className="text-sm">{ex.equipment.map((e: Equipment) => EQUIPMENT_LABEL[e]).join(" · ")}{!available && <span className="text-warn"> — not available with your setup or profile</span>}</p>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">How to do it</div>
          <HowToSteps exercise={ex} />
        </div>
        {ex.cues.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Coaching cues</div>
            <ul className="space-y-1.5 text-sm">{ex.cues.map((c) => <li key={c} className="flex gap-2"><span className="text-accent">•</span>{c}</li>)}</ul>
          </div>
        )}
        {stressed.length > 0 && (
          <div className="flex gap-2 rounded-xl bg-warn/10 p-3 text-sm text-warn">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            High load on: {stressed.map(([j]) => JOINT_LABEL[j]).join(", ")}. Excluded automatically if you flag these areas.
          </div>
        )}
        {alts.length > 0 && (
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Alternatives</div>
            <div className="flex flex-wrap gap-1.5">{alts.map((a) => <Chip key={a.id} onClick={() => onOpen(a)}>{a.name}</Chip>)}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant={fav ? "primary" : "secondary"} onClick={() => setProfile({ ...profile, preferredExercises: fav ? profile.preferredExercises.filter((x) => x !== ex.id) : [...profile.preferredExercises, ex.id], dislikedExercises: profile.dislikedExercises.filter((x) => x !== ex.id) })}>
            <Heart className="h-4 w-4" /> {fav ? "Favourite" : "Favourite"}
          </Button>
          <Button variant={avoid ? "danger" : "secondary"} onClick={() => setProfile({ ...profile, dislikedExercises: avoid ? profile.dislikedExercises.filter((x) => x !== ex.id) : [...profile.dislikedExercises, ex.id], preferredExercises: profile.preferredExercises.filter((x) => x !== ex.id) })}>
            <ThumbsDown className="h-4 w-4" /> {avoid ? "Avoided" : "Avoid"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-2.5">
      <dt className="text-[10px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
    </div>
  );
}
