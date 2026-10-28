"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, LayoutList, Plus } from "lucide-react";
import { usePrograms, useStore, useWorkouts } from "@/lib/store";
import { GOAL_LABEL } from "@/lib/engine";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/chip";
import { EmptyState, PageHeader, ProgressRing } from "@/components/ui/misc";
import { relativeDay } from "@/lib/utils";

export default function ProgramsPage() {
  const programs = usePrograms();
  const activeId = useStore((s) => s.activeProgramId);
  const workouts = useWorkouts();
  const sorted = [...programs].sort((a, b) => (a.id === activeId ? -1 : b.id === activeId ? 1 : b.updatedAt.localeCompare(a.updatedAt)));

  return (
    <div>
      <PageHeader
        title="Programs"
        subtitle={programs.length ? `${programs.length} saved` : undefined}
        action={<Button asChild size="sm"><Link href="/generate"><Plus className="h-4 w-4" /> New</Link></Button>}
      />
      {!programs.length ? (
        <EmptyState icon={<LayoutList className="h-6 w-6" />} title="No programs yet" body="Generate a program tailored to your goal, schedule and equipment." action={<Button asChild><Link href="/generate">Generate program</Link></Button>} />
      ) : (
        <ul className="space-y-3">
          {sorted.map((p, i) => {
            const done = workouts.filter((w) => w.programId === p.id && w.finishedAt).length;
            const total = p.weeks * p.sessions.length;
            const active = p.id === activeId;
            return (
              <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <Link href={`/programs/${p.id}`}>
                  <Card className={`flex items-center gap-4 transition-colors hover:border-muted/40 ${active ? "card-gradient border-accent/40" : ""}`}>
                    <ProgressRing value={total ? done / total : 0} size={56} stroke={5}>
                      <span className="text-[11px] font-bold tabular">{done}/{total}</span>
                    </ProgressRing>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {active && <Badge tone="accent"><CheckCircle2 className="mr-1 h-3 w-3" />Active</Badge>}
                        <Badge>{GOAL_LABEL[p.goal]}</Badge>
                      </div>
                      <div className="mt-1 truncate font-semibold">{p.name}</div>
                      <div className="text-xs text-muted">{p.sessions.length}×/week · {p.weeks} weeks · edited {relativeDay(p.updatedAt).toLowerCase()}</div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted" />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
