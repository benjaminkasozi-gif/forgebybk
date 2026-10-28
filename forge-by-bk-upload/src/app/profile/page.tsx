"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Cloud, CloudOff, Download, LogOut, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { cloudEnabled, supabase } from "@/lib/store/supabase";
import { signOutAndClear, syncNow } from "@/lib/store/sync";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/chip";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  BasicsSection, EquipmentSection, ExperienceGoalSection, HealthSection, PreferencesSection, ScheduleSection, StrengthSection,
  validateProfile, type Draft,
} from "@/features/profile/profile-sections";

const SECTIONS = [
  { id: "basics", title: "Personal details", C: BasicsSection },
  { id: "goals", title: "Experience & goals", C: ExperienceGoalSection },
  { id: "schedule", title: "Schedule & sports", C: ScheduleSection },
  { id: "equipment", title: "Equipment & environment", C: EquipmentSection },
  { id: "strength", title: "Strength levels", C: StrengthSection },
  { id: "prefs", title: "Exercise preferences", C: PreferencesSection },
  { id: "health", title: "Injuries & recovery", C: HealthSection },
];

export default function ProfilePage() {
  const profile = useStore((s) => s.profile)!;
  const setProfile = useStore((s) => s.setProfile);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [draft, setDraft] = useState<Draft>(profile);
  const [open, setOpen] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);

  const save = () => {
    const e = validateProfile(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      toast("Please fix the highlighted fields", "error");
      return;
    }
    setProfile(draft);
    toast("Profile saved — new programs will use these details");
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Profile" subtitle="Everything the program engine knows about you." />

      <section>
        <SectionTitle>Athlete profile</SectionTitle>
        <div className="space-y-2">
          {SECTIONS.map(({ id, title, C }) => (
            <Card key={id} className="p-0">
              <button type="button" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)} className="flex w-full items-center justify-between p-4 text-left font-semibold">
                {title}
                <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open === id && "rotate-180")} />
              </button>
              {open === id && (
                <div className="border-t border-border p-4">
                  <C draft={draft} set={(p) => setDraft((d) => ({ ...d, ...p }))} errors={errors} />
                </div>
              )}
            </Card>
          ))}
        </div>
        {dirty && (
          <div className="sticky bottom-24 z-20 mt-4 flex gap-2 lg:bottom-4">
            <Button variant="secondary" className="flex-1" onClick={() => setDraft(profile)}>Discard</Button>
            <Button className="flex-1" onClick={save}>Save changes</Button>
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Training settings</SectionTitle>
        <Card className="divide-y divide-border p-0">
          <Toggle label="Auto-start rest timer" desc="Starts when you tick off a set" on={settings.autoStartRest} set={(v) => updateSettings({ autoStartRest: v })} />
          <Toggle label="Rest timer sound" on={settings.restTimerSound} set={(v) => updateSettings({ restTimerSound: v })} />
          <Toggle label="Vibrate when rest ends" on={settings.vibrate} set={(v) => updateSettings({ vibrate: v })} />
          <Toggle label="Log reps in reserve (RIR)" desc="Used to fine-tune load progression" on={settings.showRir} set={(v) => updateSettings({ showRir: v })} />
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="font-medium">Units</div>
            <Segmented className="w-40" value={profile.units} onChange={(u) => { setProfile({ ...profile, units: u }); setDraft((d) => ({ ...d, units: u })); }} options={[{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]} ariaLabel="Units" />
          </div>
        </Card>
        {profile.units === "lb" && <p className="mt-2 text-xs text-muted">Loads are stored in kg and shown converted where displayed as totals; logging inputs remain in kg in this version.</p>}
      </section>

      <AccountSection />
      <DataSection />
    </div>
  );
}

function Toggle({ label, desc, on, set }: { label: string; desc?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 p-4">
      <div>
        <div className="font-medium">{label}</div>
        {desc && <div className="text-sm text-muted">{desc}</div>}
      </div>
      <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)} className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-border")}>
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-6" : "left-1")} />
      </button>
    </label>
  );
}

function AccountSection() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const outbox = useStore((s) => s.outbox.length);
  useEffect(() => {
    supabase()?.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
  }, []);
  return (
    <section>
      <SectionTitle>Account & sync</SectionTitle>
      <Card className="space-y-3">
        {!cloudEnabled ? (
          <div className="flex gap-3">
            <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
            <div className="text-sm">
              <div className="font-semibold">On-device mode</div>
              <p className="text-muted">Your data is stored privately on this device and works fully offline. Add Supabase keys to enable accounts and cross-device sync.</p>
            </div>
          </div>
        ) : email ? (
          <>
            <div className="flex gap-3">
              <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="text-sm">
                <div className="font-semibold">Signed in as {email}</div>
                <p className="text-muted">{outbox ? `${outbox} change${outbox > 1 ? "s" : ""} waiting to sync` : "All changes synced"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={async () => toast((await syncNow()) === "synced" ? "Synced" : "Sync will retry when online", "ok")}>Sync now</Button>
              <Button variant="ghost" size="sm" onClick={async () => {
                const ok = await signOutAndClear((n) => confirm(`${n} change${n > 1 ? "s haven't" : " hasn't"} been backed up yet and will be lost. Sign out anyway?`));
                if (ok) router.replace("/login");
              }}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Sign in to back up and sync across devices.</p>
            <Button asChild size="sm"><Link href="/login">Sign in</Link></Button>
          </div>
        )}
      </Card>
    </section>
  );
}

function DataSection() {
  const resetAll = useStore((s) => s.resetAll);
  const exportData = () => {
    const { profile, programs, workouts } = useStore.getState();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile, programs, workouts }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `forge-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <section>
      <SectionTitle>Your data</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={exportData}><Download className="h-4 w-4" /> Export JSON</Button>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm("Erase all FORGE BY BK data on this device? This cannot be undone.")) resetAll();
          }}
        >
          <Trash2 className="h-4 w-4" /> Reset device data
        </Button>
      </div>
    </section>
  );
}
