"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Apple, ArrowRight, CalendarDays, Clock, Flame, Play, Sparkles, Trophy } from "lucide-react";
import { useActiveProgram, useFoods, useStore, useWorkouts } from "@/lib/store";
import { dayKey, dayTotals } from "@/lib/nutrition";
import {
  EXERCISE_MAP, FOCUS_LABEL, OBJECTIVE_LABEL, PHASE_LABEL, nextSession, personalBests, startWorkoutFromSession, summarize, weekKey, weekStreak, workoutVolume,
} from "@/lib/engine";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle, Stat } from "@/components/ui/card";
import { Badge } from "@/components/ui/chip";
import { EmptyState, ProgressRing } from "@/components/ui/misc";
import { cn, formatNumber, relativeDay, todayWeekday, WEEKDAY_SHORT } from "@/lib/utils";

export default function Dashboard() {
  const router = useRouter();
  const profile = useStore((s) => s.profile)!;
  const program = useActiveProgram();
  const workouts = useWorkouts();
  const active = useStore((s) => s.activeWorkout);
  const startWorkout = useStore((s) => s.startWorkout);

  const done = workouts.filter((w) => w.finishedAt);
  const thisWeek = done.filter((w) => weekKey(w.startedAt) === weekKey(new Date().toISOString()));
  const next = program ? nextSession(program, done) : null;
  const programDone = program ? done.filter((w) => w.programId === program.id).length : 0;
  const programTotal = program ? program.weeks * program.sessions.length : 0;
  const week = next ? program!.weekPlans[next.week] : null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const start = () => {
    if (!program || !next) return;
    if (!active) startWorkout(startWorkoutFromSession(program, next.session, next.week, done, profile.oneRepMaxes));
    router.push("/train");
  };

  return (
    <div className="space-y-7">
      <header className="animate-fade-up pt-2">
        <p className="text-sm text-muted">{greeting},</p>
        <h1 className="font-display text-[40px] font-bold uppercase leading-none tracking-tight">{profile.name || "Athlete"}</h1>
      </header>

      {active ? (
        <Card className="card-gradient glow animate-fade-up">
          <Badge tone="volt">In progress</Badge>
          <h2 className="mt-2 text-xl font-bold">{active.name}</h2>
          <p className="text-sm text-muted">
            {active.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)} sets logged · started {new Date(active.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
          <Button asChild size="lg" className="mt-4 w-full"><Link href="/train"><Play className="h-5 w-5" /> Resume workout</Link></Button>
        </Card>
      ) : program && next ? (
        <Card className="card-gradient animate-fade-up overflow-hidden p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="accent">Up next</Badge>
                <Badge>Week {next.week + 1}</Badge>
                {week && <Badge tone={week.phase === "deload" ? "volt" : "default"}>{PHASE_LABEL[week.phase]}</Badge>}
              </div>
              <h2 className="mt-3 font-display text-3xl font-bold uppercase leading-none">{next.session.label}</h2>
              <p className="mt-2 text-sm text-muted">
                {next.session.focuses.map((f) => FOCUS_LABEL[f]).join(" + ")} · {OBJECTIVE_LABEL[next.session.objective]}
              </p>
            </div>
            <ProgressRing value={programTotal ? programDone / programTotal : 0} size={68}>
              <span className="text-xs font-bold tabular">{Math.round((programDone / Math.max(1, programTotal)) * 100)}%</span>
            </ProgressRing>
          </div>
          <div className="mt-4 flex gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> ~{next.session.estMinutes} min</span>
            <span className="flex items-center gap-1.5"><Flame className="h-4 w-4" /> {next.session.exercises.length} exercises</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {next.session.exercises.slice(0, 4).map((pe) => (
              <li key={pe.id} className="flex justify-between gap-2">
                <span className="truncate">{EXERCISE_MAP[pe.exerciseId]?.name}</span>
                <span className="shrink-0 text-muted tabular">{pe.rx.sets} × {pe.rx.workSec ? `${pe.rx.workSec}s` : `${pe.rx.repsMin}–${pe.rx.repsMax}`}</span>
              </li>
            ))}
            {next.session.exercises.length > 4 && <li className="text-muted">+{next.session.exercises.length - 4} more</li>}
          </ul>
          {week?.note && <p className="mt-3 rounded-xl bg-bg/40 p-3 text-xs text-muted">{week.note}</p>}
          <Button size="lg" className="mt-4 w-full" onClick={start}><Play className="h-5 w-5" /> Start session</Button>
        </Card>
      ) : (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="Build your first program"
          body="Pick your goal, choose exactly what each day trains, and FORGE designs the sessions, sets, reps and progression."
          action={<Button asChild size="lg"><Link href="/generate">Generate program <ArrowRight className="h-4 w-4" /></Link></Button>}
        />
      )}

      <WeekStrip program={program} doneThisWeek={thisWeek.map((w) => (new Date(w.startedAt).getDay() + 6) % 7)} />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Streak" value={weekStreak(done)} unit="wk" />
        <Stat label="This week" value={thisWeek.length} unit={`/${program?.sessions.length ?? profile.availableDays.length}`} />
        <Stat label="Volume" value={formatNumber(Math.round(thisWeek.reduce((a, w) => a + workoutVolume(w), 0)))} unit="kg" />
      </div>

      <NutritionToday />

      <RecentAndPRs />
    </div>
  );
}

function NutritionToday() {
  const plan = useStore((s) => s.profile?.nutrition);
  const totals = dayTotals(useFoods(), dayKey());
  const left = plan ? plan.calories - totals.kcal : 0;
  return (
    <section>
      <SectionTitle action={<Link href="/nutrition?tab=fuel" className="text-xs font-semibold text-accent">Pre &amp; post training</Link>}>Nutrition today</SectionTitle>
      <Link href="/nutrition" className="block">
        <Card className="flex items-center gap-4 transition-colors hover:border-muted/40">
          <ProgressRing value={plan ? totals.kcal / plan.calories : 0} size={56} stroke={5}>
            <Apple className="h-5 w-5 text-accent" />
          </ProgressRing>
          <div className="min-w-0 flex-1">
            {plan ? (
              <>
                <div className="font-semibold tabular">{formatNumber(totals.kcal)} / {formatNumber(plan.calories)} kcal</div>
                <div className={cn("text-sm tabular", left < 0 ? "text-warn" : "text-muted")}>{left < 0 ? `${formatNumber(-left)} over` : `${formatNumber(left)} left`} · protein {Math.round(totals.proteinG)}/{plan.proteinG} g</div>
              </>
            ) : (
              <>
                <div className="font-semibold">Set a calorie target</div>
                <div className="text-sm text-muted">Log food as you go and see what&apos;s left.</div>
              </>
            )}
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
        </Card>
      </Link>
    </section>
  );
}

function WeekStrip({ program, doneThisWeek }: { program: ReturnType<typeof useActiveProgram>; doneThisWeek: number[] }) {
  const today = todayWeekday();
  const planned = new Map(program?.sessions.filter((s) => s.weekday != null).map((s) => [s.weekday!, s]) ?? []);
  return (
    <section>
      <SectionTitle action={program && <Link href={`/programs/${program.id}`} className="text-xs font-semibold text-accent">View program</Link>}>This week</SectionTitle>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_SHORT.map((d, i) => {
          const s = planned.get(i as never);
          const done = doneThisWeek.includes(i);
          return (
            <div key={d} className={cn("flex flex-col items-center gap-1.5 rounded-xl border py-2.5", i === today ? "border-accent/60 bg-accent/5" : "border-border bg-surface")} title={s?.label}>
              <span className={cn("text-[11px] font-semibold", i === today ? "text-accent" : "text-muted")}>{d}</span>
              <span className={cn("h-2 w-2 rounded-full", done ? "bg-accent" : s ? "border border-muted" : "bg-transparent")} aria-label={done ? "Trained" : s ? `Planned: ${s.label}` : "Rest"} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RecentAndPRs() {
  const workouts = useWorkouts();
  const done = workouts.filter((w) => w.finishedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const prs = personalBests(done, 4);
  if (!done.length) {
    return (
      <Card className="flex items-center gap-3 text-sm text-muted">
        <CalendarDays className="h-5 w-5 shrink-0" /> Your finished workouts, PRs and trends will appear here.
      </Card>
    );
  }
  return (
    <>
      {prs.length > 0 && (
        <section>
          <SectionTitle action={<Link href="/progress" className="text-xs font-semibold text-accent">All progress</Link>}>Best lifts (est. 1RM)</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {prs.map((p) => (
              <Card key={p.exerciseId} className="p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted"><Trophy className="h-3.5 w-3.5 text-warn" /> <span className="truncate">{EXERCISE_MAP[p.exerciseId]?.name}</span></div>
                <div className="mt-1 font-display text-2xl font-bold tabular">{Math.round(p.e1rm)}<span className="ml-1 text-sm text-muted">kg</span></div>
              </Card>
            ))}
          </div>
        </section>
      )}
      <section>
        <SectionTitle>Recent sessions</SectionTitle>
        <div className="space-y-2">
          {done.slice(0, 4).map((w) => {
            const s = summarize(w, done);
            return (
              <Card key={w.id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{w.name}</div>
                  <div className="text-xs text-muted">{relativeDay(w.startedAt)} · {s.durationMin} min · {s.sets} sets</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl font-bold tabular">{formatNumber(s.volumeKg)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">kg volume</div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}
