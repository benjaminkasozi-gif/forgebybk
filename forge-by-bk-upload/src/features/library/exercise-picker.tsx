"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EXERCISES, MUSCLE_LABEL, PATTERN_LABEL, type Exercise, type Muscle } from "@/lib/engine";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import { DemoThumb } from "@/features/demo/exercise-demo";

const FILTERS: { label: string; muscles: Muscle[] }[] = [
  { label: "All", muscles: [] },
  { label: "Chest", muscles: ["chest"] },
  { label: "Back", muscles: ["lats", "upper_back", "traps"] },
  { label: "Shoulders", muscles: ["front_delts", "side_delts", "rear_delts"] },
  { label: "Arms", muscles: ["biceps", "triceps", "forearms"] },
  { label: "Legs", muscles: ["quads", "hamstrings", "glutes", "adductors", "calves"] },
  { label: "Core", muscles: ["abs", "obliques", "lower_back"] },
];

export function filterExercises(list: Exercise[], q: string, muscles: Muscle[]): Exercise[] {
  const needle = q.trim().toLowerCase();
  return list.filter(
    (e) =>
      (!muscles.length || e.primary.some((m) => muscles.includes(m))) &&
      (!needle || e.name.toLowerCase().includes(needle) || PATTERN_LABEL[e.pattern].toLowerCase().includes(needle) || e.primary.some((m) => MUSCLE_LABEL[m].toLowerCase().includes(needle))),
  );
}

export function ExercisePicker({
  open, onOpenChange, onPick, title = "Choose exercise", pool = EXERCISES, selected = [], suggestions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (id: string) => void;
  title?: string;
  pool?: Exercise[];
  selected?: string[];
  suggestions?: Exercise[];
}) {
  const [q, setQ] = useState("");
  const [f, setF] = useState(0);
  const list = useMemo(() => filterExercises(pool, q, FILTERS[f].muscles), [pool, q, f]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="sticky top-0 z-10 -mx-5 space-y-3 bg-surface px-5 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" className="pl-9" aria-label="Search exercises" />
        </div>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {FILTERS.map((x, i) => (
            <Chip key={x.label} selected={f === i} onClick={() => setF(i)} className="shrink-0">
              {x.label}
            </Chip>
          ))}
        </div>
      </div>
      {suggestions && suggestions.length > 0 && !q && f === 0 && (
        <div className="mb-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">Best alternatives</div>
          <ExerciseRows list={suggestions} onPick={onPick} selected={selected} />
        </div>
      )}
      {list.length ? (
        <ExerciseRows list={list} onPick={onPick} selected={selected} />
      ) : (
        <p className="py-10 text-center text-sm text-muted">No exercises match “{q}”.</p>
      )}
    </Sheet>
  );
}

function ExerciseRows({ list, onPick, selected }: { list: Exercise[]; onPick: (id: string) => void; selected: string[] }) {
  return (
    <ul className="divide-y divide-border/60">
      {list.map((e) => (
        <li key={e.id}>
          <button type="button" onClick={() => onPick(e.id)} className={cn("flex w-full items-center gap-3 py-2.5 text-left", selected.includes(e.id) && "text-accent")}>
            <DemoThumb exerciseId={e.id} className="h-10 w-10 shrink-0 rounded-lg bg-surface-2" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{e.name}</div>
              <div className="truncate text-xs text-muted">
                {e.primary.map((m) => MUSCLE_LABEL[m]).join(", ")} · {PATTERN_LABEL[e.pattern]}
              </div>
            </div>
            {selected.includes(e.id) && <span className="text-xs font-semibold">Selected</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
