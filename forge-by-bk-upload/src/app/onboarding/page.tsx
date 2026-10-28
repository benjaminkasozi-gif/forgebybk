"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shell/nav";
import { cn } from "@/lib/utils";
import {
  BasicsSection, EquipmentSection, ExperienceGoalSection, HealthSection, PreferencesSection, ScheduleSection, StrengthSection,
  emptyProfile, validateProfile, type Draft,
} from "@/features/profile/profile-sections";

const STEPS = [
  { title: "Welcome to FORGE BY BK", sub: "A few questions so every program is built around you.", C: BasicsSection, check: "basics" as const },
  { title: "Experience & goals", sub: "This sets your volume, intensity and progression.", C: ExperienceGoalSection },
  { title: "Your schedule", sub: "When and how long you can train.", C: ScheduleSection, check: "schedule" as const },
  { title: "Where you train", sub: "We only prescribe exercises you can actually do.", C: EquipmentSection, check: "equipment" as const },
  { title: "Current strength", sub: "Skip anything you don't know.", C: StrengthSection },
  { title: "Preferences", sub: "Favourites get priority. Dislikes are never programmed.", C: PreferencesSection },
  { title: "Health & recovery", sub: "Helps FORGE train you hard and safely.", C: HealthSection },
];

export default function Onboarding() {
  const router = useRouter();
  const existing = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const [draft, setDraft] = useState<Draft>(existing ?? emptyProfile());
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const S = STEPS[step];
  const last = step === STEPS.length - 1;

  const next = () => {
    const e = S.check ? validateProfile(draft, S.check) : {};
    setErrors(e);
    if (Object.keys(e).length) return;
    if (last) {
      setProfile(draft);
      router.replace("/generate?welcome=1");
    } else {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-safe">
      <div className="flex items-center justify-between py-4">
        <Logo />
        <span className="text-sm font-medium text-muted tabular">{step + 1} / {STEPS.length}</span>
      </div>
      <div className="mb-6 flex gap-1" aria-hidden>
        {STEPS.map((_, i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-500", i <= step ? "bg-accent" : "bg-border")} />
        ))}
      </div>
      <div key={step} className="flex-1 animate-fade-up pb-32">
        <h1 className="font-display text-4xl font-bold uppercase leading-none">{S.title}</h1>
        <p className="mb-6 mt-2 text-muted">{S.sub}</p>
        <S.C draft={draft} set={(p) => setDraft((d) => ({ ...d, ...p }))} errors={errors} />
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg gap-3 px-5 pb-safe pt-3">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={next}>
            {last ? "Build my first program" : "Continue"} <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
