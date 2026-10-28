"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/chip";
import { FoodLog } from "@/features/nutrition/food-log";
import { FuelGuide } from "@/features/nutrition/fuel-guide";

type Tab = "log" | "fuel";

export default function NutritionPage() {
  const [tab, setTab] = useState<Tab>("log");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "fuel") setTab("fuel");
  }, []);
  const change = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", t === "fuel" ? "?tab=fuel" : window.location.pathname);
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Nutrition" subtitle="Track calories and fuel your training" />
      <Segmented ariaLabel="Nutrition section" value={tab} onChange={change} options={[{ value: "log", label: "Food log" }, { value: "fuel", label: "Pre & post training" }]} />
      {tab === "log" ? <FoodLog /> : <FuelGuide />}
    </div>
  );
}
