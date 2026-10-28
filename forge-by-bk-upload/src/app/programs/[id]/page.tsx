"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, MoreHorizontal, Pencil, Play, Plus, RefreshCw, Repeat2, SlidersHorizontal, Trash2 } from "lucide-react";
import {
  EXERCISE_MAP, GOAL_LABEL, alternatives, basePrescription, eligibleExercises, estimateMinutes, newId, regenerateSession, reportVolume, startWorkoutFromSession,
  type DayPlan, type Prescription, type Program, type ProgramExercise, type ProgramSession,
} from "@/lib/engine";
import { useStore, useWorkouts } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { toast } from "@/components/ui/toast";
import { ExercisePicker } from "@/features/library/exercise-picker";
import { FocusPicker, ObjectivePicker, WeekdayPicker } from "@/features/generate/day-editor";
import { PhaseLegend, SessionCard, VolumeReport, WeekTimeline } from "@/features/programs/program-parts";
import { cn } from "@/lib/utils";

type PickerState = { sessionId: string; peId?: string } | null;

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const program = useStore((s) => s.programs.find((p) => p.id === id && !p.deleted));
  const profile = useStore((s) => s.profile)!;
  const activeId = useStore((s) => s.activeProgramId);
  const updateProgram = useStore((s) => s.updateProgram);
  const saveProgram = useStore((s) => s.saveProgram);
  const deleteProgram = useStore((s) => s.deleteProgram);
  const setActiveProgram = useStore((s) => s.setActiveProgram);
  const startWorkout = useStore((s) => s.startWorkout);
  const activeWorkout = useStore((s) => s.activeWorkout);
  const workouts = useWorkouts();

  const doneCount = workouts.filter((w) => w.programId === id && w.finishedAt).length;
  const [week, setWeek] = useState(() => (program ? Math.min(program.weeks - 1, Math.floor(doneCount / Math.max(1, program.sessions.length))) : 0));
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState<PickerState>(null);
  const [rxEdit, setRxEdit] = useState<{ sessionId: string; pe: ProgramExercise } | null>(null);
  const [dayEdit, setDayEdit] = useState<{ session: ProgramSession | null } | null>(null);
  const [rename, setRename] = useState<string | null>(null);

  const pool = useMemo(() => eligibleExercises(profile), [profile]);
  const volume = useMemo(() => (program ? reportVolume(program.sessions, program.goal, profile) : []), [program, profile]);

  if (!program) {
    return <EmptyState className="mt-10" icon={<Trash2 className="h-6 w-6" />} title="Program not found" body="It may have been deleted on another device." action={<Button asChild><Link href="/programs">Back to programs</Link></Button>} />;
  }

  const mutateSession = (sid: string, f: (s: ProgramSession) => ProgramSession) =>
    updateProgram(program.id, (p) => ({
      ...p,
      sessions: p.sessions.map((s) => {
        if (s.id !== sid) return s;
        const next = f(s);
        return { ...next, estMinutes: estimateMinutes(next.exercises.map((x) => x.rx)) };
      }),
    }));

  const moveIn = <T,>(list: T[], i: number, dir: -1 | 1): T[] => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    const out = [...list];
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  };

  const startSession = (s: ProgramSession) => {
    if (activeWorkout && !confirm("You have a workout in progress. Replace it with this session?")) return;
    startWorkout(startWorkoutFromSession(program, s, week, workouts, profile.oneRepMaxes));
    router.push("/train");
  };

  const pickExercise = (exerciseId: string) => {
    if (!picker) return;
    const ex = EXERCISE_MAP[exerciseId];
    mutateSession(picker.sessionId, (s) => {
      if (picker.peId) {
        return { ...s, exercises: s.exercises.map((pe) => (pe.id === picker.peId ? { ...pe, exerciseId, rx: pe.rx.workSec && !ex.timed ? basePrescription(ex, pe.role, s.objective, profile.experience) : pe.rx } : pe)) };
      }
      const role = ex.mechanics === "compound" ? "secondary" : "accessory";
      return { ...s, exercises: [...s.exercises, { id: newId(), exerciseId, role, rx: basePrescription(ex, role, s.objective, profile.experience) }] };
    });
    toast(picker.peId ? `Swapped to ${ex.name}` : `Added ${ex.name}`);
    setPicker(null);
  };

  const pickerPe = picker?.peId ? program.sessions.find((s) => s.id === picker.sessionId)?.exercises.find((e) => e.id === picker.peId) : undefined;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="-ml-2"><Link href="/programs"><ArrowLeft className="h-4 w-4" /> Programs</Link></Button>
        <div className="relative">
          <Button variant="ghost" size="icon" aria-label="Program options" aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal className="h-5 w-5" /></Button>
          {menu && (
            <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-2xl animate-fade-up" onMouseLeave={() => setMenu(false)}>
              <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => { setRename(program.name); setMenu(false); }}>Rename</MenuItem>
              <MenuItem icon={<Copy className="h-4 w-4" />} onClick={() => {
                const copy: Program = JSON.parse(JSON.stringify(program));
                copy.id = newId();
                copy.name = `${program.name} (copy)`;
                copy.createdAt = new Date().toISOString();
                saveProgram(copy);
                setMenu(false);
                toast("Program duplicated");
                router.push(`/programs/${copy.id}`);
              }}>Duplicate</MenuItem>
              <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => {
                if (!confirm(`Delete “${program.name}”? Logged workouts are kept.`)) return;
                deleteProgram(program.id);
                toast("Program deleted");
                router.replace("/programs");
              }}>Delete</MenuItem>
            </div>
          )}
        </div>
      </div>

      <header className="animate-fade-up">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="accent">{GOAL_LABEL[program.goal]}{program.customGoal ? ` · ${program.customGoal}` : ""}</Badge>
          <Badge>{program.sessions.length}×/week</Badge>
          <Badge>{program.weeks} weeks</Badge>
        </div>
        <h1 className="mt-2 font-display text-[34px] font-bold uppercase leading-none">{program.name}</h1>
        <p className="mt-1 text-sm text-muted">{doneCount} of {program.weeks * program.sessions.length} sessions completed</p>
      </header>

      <div className="flex gap-2">
        {activeId === program.id ? (
          <Button variant="secondary" className="flex-1" onClick={() => setActiveProgram(null)}>Active program ✓</Button>
        ) : (
          <Button className="flex-1" onClick={() => { setActiveProgram(program.id); toast("Set as active program"); }}>Set as active</Button>
        )}
        <Button variant={editing ? "primary" : "outline"} className="flex-1" onClick={() => setEditing(!editing)} aria-pressed={editing}>
          <SlidersHorizontal className="h-4 w-4" /> {editing ? "Done editing" : "Edit program"}
        </Button>
      </div>

      <section className="space-y-2">
        <WeekTimeline weeks={program.weekPlans} current={week} onSelect={setWeek} />
        <PhaseLegend />
        <p className="text-sm text-muted">{program.weekPlans[week]?.note}</p>
      </section>

      {program.sessions.map((s, i) => (
        <SessionCard
          key={s.id}
          session={s}
          index={i}
          week={program.weekPlans[week]}
          header={editing ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <SmallBtn onClick={() => setDayEdit({ session: s })}><Pencil className="h-3.5 w-3.5" /> Edit day</SmallBtn>
              <SmallBtn onClick={() => updateProgram(program.id, (p) => ({ ...p, sessions: moveIn(p.sessions, i, -1) }))} disabled={i === 0} label="Move day up"><ArrowUp className="h-3.5 w-3.5" /></SmallBtn>
              <SmallBtn onClick={() => updateProgram(program.id, (p) => ({ ...p, sessions: moveIn(p.sessions, i, 1) }))} disabled={i === program.sessions.length - 1} label="Move day down"><ArrowDown className="h-3.5 w-3.5" /></SmallBtn>
              <SmallBtn danger disabled={program.sessions.length <= 1} onClick={() => confirm(`Remove ${s.label}?`) && updateProgram(program.id, (p) => ({ ...p, sessions: p.sessions.filter((x) => x.id !== s.id) }))}><Trash2 className="h-3.5 w-3.5" /> Remove</SmallBtn>
            </div>
          ) : null}
          renderActions={editing ? (pe, j) => (
            <div className="flex shrink-0 gap-1">
              <IconBtn label="Edit sets and reps" onClick={() => setRxEdit({ sessionId: s.id, pe })}><SlidersHorizontal className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn label="Swap exercise" onClick={() => setPicker({ sessionId: s.id, peId: pe.id })}><Repeat2 className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn label="Move up" disabled={j === 0} onClick={() => mutateSession(s.id, (x) => ({ ...x, exercises: moveIn(x.exercises, j, -1) }))}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn label="Remove exercise" onClick={() => mutateSession(s.id, (x) => ({ ...x, exercises: x.exercises.filter((e) => e.id !== pe.id) }))}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
            </div>
          ) : undefined}
          footer={
            editing ? (
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setPicker({ sessionId: s.id })}><Plus className="h-4 w-4" /> Add exercise</Button>
            ) : (
              <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => startSession(s)}><Play className="h-4 w-4" /> Start this session (week {week + 1})</Button>
            )
          }
        />
      ))}

      {editing && program.sessions.length < 7 && (
        <Button variant="outline" className="w-full" onClick={() => setDayEdit({ session: null })}><Plus className="h-4 w-4" /> Add training day</Button>
      )}

      <VolumeReport rows={volume} />

      <ExercisePicker
        open={picker !== null}
        onOpenChange={(o) => !o && setPicker(null)}
        title={picker?.peId ? `Swap ${EXERCISE_MAP[pickerPe?.exerciseId ?? ""]?.name ?? "exercise"}` : "Add exercise"}
        pool={pool}
        suggestions={pickerPe ? alternatives(pickerPe.exerciseId, profile, 5) : undefined}
        onPick={pickExercise}
      />

      {rxEdit && (
        <RxSheet
          pe={rxEdit.pe}
          onClose={() => setRxEdit(null)}
          onSave={(rx, notes) => {
            mutateSession(rxEdit.sessionId, (s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === rxEdit.pe.id ? { ...e, rx, notes } : e)) }));
            setRxEdit(null);
            toast("Prescription updated for every week");
          }}
        />
      )}

      {dayEdit && (
        <DaySheet
          session={dayEdit.session}
          onClose={() => setDayEdit(null)}
          onSave={(day, rebuild) => {
            if (!dayEdit.session) {
              const built = regenerateSession(program, day.id, day, profile);
              updateProgram(program.id, (p) => ({ ...p, sessions: [...p.sessions, built] }));
              toast("Day added and built");
            } else if (rebuild) {
              const built = regenerateSession(program, dayEdit.session.id, { ...day, id: dayEdit.session.id }, profile);
              mutateSession(dayEdit.session.id, () => built);
              toast("Exercises rebuilt for the new focus");
            } else {
              mutateSession(dayEdit.session.id, (s) => ({ ...s, weekday: day.weekday, label: day.label || s.label, focuses: day.focuses, objective: day.objective }));
              toast("Day updated");
            }
            setDayEdit(null);
          }}
        />
      )}

      {rename !== null && (
        <Sheet open onOpenChange={(o) => !o && setRename(null)} title="Rename program">
          <form onSubmit={(e) => { e.preventDefault(); if (rename.trim()) { updateProgram(program.id, (p) => ({ ...p, name: rename.trim() })); setRename(null); } }} className="space-y-3">
            <Input autoFocus value={rename} onChange={(e) => setRename(e.target.value)} maxLength={50} aria-label="Program name" />
            <Button type="submit" className="w-full" disabled={!rename.trim()}>Save</Button>
          </form>
        </Sheet>
      )}
    </div>
  );
}

function RxSheet({ pe, onClose, onSave }: { pe: ProgramExercise; onClose: () => void; onSave: (rx: Prescription, notes?: string) => void }) {
  const [rx, setRx] = useState<Prescription>(pe.rx);
  const [notes, setNotes] = useState(pe.notes ?? "");
  const ex = EXERCISE_MAP[pe.exerciseId];
  const row = (label: string, el: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="font-medium">{label}</span>
      {el}
    </div>
  );
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={ex?.name ?? "Edit"} description="Base prescription — weekly periodisation is applied on top.">
      <div className="divide-y divide-border">
        {row("Sets", <Stepper label="Sets" value={rx.sets} min={1} max={10} onChange={(sets) => setRx({ ...rx, sets })} />)}
        {rx.workSec ? (
          row("Work (sec)", <Stepper label="Work seconds" value={rx.workSec} min={5} max={600} step={5} onChange={(workSec) => setRx({ ...rx, workSec })} />)
        ) : (
          <>
            {row("Min reps", <Stepper label="Minimum reps" value={rx.repsMin} min={1} max={rx.repsMax} onChange={(repsMin) => setRx({ ...rx, repsMin })} />)}
            {row("Max reps", <Stepper label="Maximum reps" value={rx.repsMax} min={rx.repsMin} max={50} onChange={(repsMax) => setRx({ ...rx, repsMax })} />)}
            {row("Reps in reserve", <Stepper label="Reps in reserve" value={rx.rir} min={0} max={5} onChange={(rir) => setRx({ ...rx, rir })} />)}
          </>
        )}
        {row("Rest (sec)", <Stepper label="Rest seconds" value={rx.restSec} min={15} max={600} step={15} onChange={(restSec) => setRx({ ...rx, restSec })} />)}
      </div>
      <Input className="mt-3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Coaching note (optional)" aria-label="Coaching note" maxLength={120} />
      <Button className="mt-4 w-full" size="lg" onClick={() => onSave(rx, notes || undefined)}>Save</Button>
    </Sheet>
  );
}

function DaySheet({ session, onClose, onSave }: { session: ProgramSession | null; onClose: () => void; onSave: (d: DayPlan, rebuild: boolean) => void }) {
  const [day, setDay] = useState<DayPlan>(
    session ? { id: session.id, weekday: session.weekday, label: session.label, focuses: session.focuses, objective: session.objective } : { id: newId(), weekday: null, label: "", focuses: [], objective: "hypertrophy" },
  );
  const changedFocus = session && (JSON.stringify(session.focuses) !== JSON.stringify(day.focuses) || session.objective !== day.objective);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={session ? "Edit day" : "New training day"}>
      <div className="space-y-5">
        <WeekdayPicker value={day.weekday} onChange={(weekday) => setDay({ ...day, weekday })} />
        <FocusPicker value={day.focuses} onChange={(focuses) => setDay({ ...day, focuses })} />
        {day.focuses.includes("sport") && <Input value={day.sport ?? ""} onChange={(e) => setDay({ ...day, sport: e.target.value })} placeholder="Which sport?" aria-label="Sport" />}
        <ObjectivePicker value={day.objective} onChange={(objective) => setDay({ ...day, objective })} compact />
        <Input value={day.label} onChange={(e) => setDay({ ...day, label: e.target.value })} placeholder="Session name (optional)" aria-label="Session name" maxLength={40} />
        {!day.focuses.length && <p className="text-sm text-warn">Pick at least one focus.</p>}
        {session ? (
          <div className="grid gap-2">
            <Button size="lg" disabled={!day.focuses.length} onClick={() => onSave(day, true)}><RefreshCw className="h-4 w-4" /> Save & rebuild exercises</Button>
            <Button variant="secondary" disabled={!day.focuses.length} onClick={() => onSave(day, false)}>Save details only{changedFocus ? " (keep current exercises)" : ""}</Button>
          </div>
        ) : (
          <Button size="lg" className="w-full" disabled={!day.focuses.length} onClick={() => onSave(day, true)}>Build this day</Button>
        )}
      </div>
    </Sheet>
  );
}

function MenuItem({ children, icon, onClick, danger }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium hover:bg-border/50", danger && "text-danger")}>
      {icon}
      {children}
    </button>
  );
}

function SmallBtn({ children, onClick, disabled, danger, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean; label?: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className={cn("inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 text-xs font-semibold disabled:opacity-30", danger && "text-danger")}>
      {children}
    </button>
  );
}

function IconBtn({ children, onClick, label, disabled }: { children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-2 text-muted hover:text-fg disabled:opacity-30">
      {children}
    </button>
  );
}

