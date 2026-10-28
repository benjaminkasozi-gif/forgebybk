"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Trophy } from "lucide-react";
import { EXERCISE_MAP, e1rmSeries, personalBests, setsByGroup, trainedExercises, volumeTargets, weekStreak, weeklyVolumeSeries } from "@/lib/engine";
import { useActiveProgram, useStore, useWorkouts } from "@/lib/store";
import { Card, SectionTitle, Stat } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatNumber } from "@/lib/utils";

const AXIS = { stroke: "hsl(var(--muted))", fontSize: 11, tickLine: false, axisLine: false } as const;
const GRID = <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="0" vertical={false} strokeOpacity={0.6} />;
const shortDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function ChartTooltip({ active, payload, label, unit, labelFmt }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string; labelFmt?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs shadow-xl">
      <div className="text-muted">{label && labelFmt ? labelFmt(label) : label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular text-fg">{formatNumber(Math.round(payload[0].value * 10) / 10)} {unit}</div>
    </div>
  );
}

export default function ProgressPage() {
  const workouts = useWorkouts();
  const profile = useStore((s) => s.profile)!;
  const program = useActiveProgram();
  const done = useMemo(() => workouts.filter((w) => w.finishedAt), [workouts]);
  const lifts = useMemo(() => trainedExercises(done), [done]);
  const [lift, setLift] = useState<string | null>(null);
  const selected = lift ?? lifts[0] ?? null;

  if (!done.length) {
    return (
      <div>
        <PageHeader title="Progress" />
        <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No data yet" body="Finish your first workout to unlock strength trends, weekly volume and muscle-group balance." />
      </div>
    );
  }

  const series = selected ? e1rmSeries(done, selected) : [];
  const weekly = weeklyVolumeSeries(done, 12);
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const groups = setsByGroup(done, since);
  const targets = volumeTargets(program?.goal ?? "general_fitness", profile.experience, profile.recoveryScore);
  const groupRows = (Object.keys(groups) as (keyof typeof groups)[]).map((g) => ({ group: g[0].toUpperCase() + g.slice(1), sets: groups[g], min: targets[g][0], max: targets[g][1] }));
  const prs = personalBests(done, 8);
  const first = series[0]?.e1rm ?? 0;
  const latest = series[series.length - 1]?.e1rm ?? 0;
  const totalVolume = done.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.filter((s) => s.type === "working").reduce((c, s) => c + (s.weight ?? 0) * (s.reps ?? 0), 0), 0), 0);

  return (
    <div className="space-y-7">
      <PageHeader title="Progress" subtitle={`${done.length} workouts logged`} />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Workouts" value={done.length} />
        <Stat label="Streak" value={weekStreak(done)} unit="wk" />
        <Stat label="Lifted" value={formatNumber(Math.round(totalVolume))} unit="kg" />
      </div>

      {selected && (
        <section>
          <SectionTitle>Estimated 1RM</SectionTitle>
          <Card>
            <label htmlFor="lift" className="sr-only">Exercise</label>
            <select id="lift" value={selected} onChange={(e) => setLift(e.target.value)} className="mb-3 h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold">
              {lifts.map((id) => <option key={id} value={id}>{EXERCISE_MAP[id]?.name}</option>)}
            </select>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold tabular">{Math.round(latest)}</span>
              <span className="text-sm text-muted">kg</span>
              {series.length > 1 && (
                <span className={`ml-auto text-sm font-semibold tabular ${latest >= first ? "text-accent" : "text-warn"}`}>
                  {latest >= first ? "+" : ""}{Math.round((latest - first) * 10) / 10} kg since {shortDate(series[0].date)}
                </span>
              )}
            </div>
            {series.length > 1 ? (
              <div className="h-52" role="img" aria-label={`Estimated one-rep max for ${EXERCISE_MAP[selected]?.name} over time`}>
                <ResponsiveContainer>
                  <LineChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    {GRID}
                    <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
                    <YAxis {...AXIS} domain={["dataMin - 5", "dataMax + 5"]} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip unit="kg e1RM" labelFmt={shortDate} />} cursor={{ stroke: "hsl(var(--muted))", strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="e1rm" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--surface))", fill: "hsl(var(--accent))" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted">Log this lift again to see a trend.</p>
            )}
          </Card>
        </section>
      )}

      <section>
        <SectionTitle>Weekly volume (last 12 weeks)</SectionTitle>
        <Card>
          <div className="h-48" role="img" aria-label="Total kilograms lifted per week">
            <ResponsiveContainer>
              <BarChart data={weekly} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap={4}>
                {GRID}
                <XAxis dataKey="week" tickFormatter={shortDate} {...AXIS} minTickGap={20} />
                <YAxis {...AXIS} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip content={<ChartTooltip unit="kg" labelFmt={(l) => `Week of ${shortDate(l)}`} />} cursor={{ fill: "hsl(var(--surface-2))" }} />
                <Bar dataKey="volume" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>Hard sets per muscle — last 7 days</SectionTitle>
        <Card>
          <ul className="space-y-2.5">
            {groupRows.map((r) => {
              const max = Math.max(r.max, r.sets, 1);
              const status = r.sets < r.min ? "text-warn" : r.sets > r.max ? "text-volt" : "text-fg";
              return (
                <li key={r.group} className="grid grid-cols-[84px_1fr_36px] items-center gap-3 text-sm" title={`${r.sets} sets · target ${r.min}–${r.max}`}>
                  <span className="text-muted">{r.group}</span>
                  <div className="relative h-2.5 rounded-full bg-surface-2">
                    <div className="absolute inset-y-0 rounded-full bg-border" style={{ left: `${(r.min / max) * 100}%`, width: `${((r.max - r.min) / max) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${Math.min(100, (r.sets / max) * 100)}%` }} />
                  </div>
                  <span className={`text-right font-semibold tabular ${status}`}>{r.sets}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted">Grey band = weekly target for your goal and experience. Amber = below target.</p>
        </Card>
      </section>

      {prs.length > 0 && (
        <section>
          <SectionTitle>Personal bests</SectionTitle>
          <Card className="divide-y divide-border p-0">
            {prs.map((p) => (
              <div key={p.exerciseId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Trophy className="h-4 w-4 shrink-0 text-warn" />
                  <span className="truncate font-medium">{EXERCISE_MAP[p.exerciseId]?.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular">{Math.round(p.e1rm)} kg</div>
                  <div className="text-xs text-muted">{shortDate(p.date)}</div>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
