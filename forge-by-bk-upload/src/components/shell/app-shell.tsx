"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { syncNow, type SyncStatus } from "@/lib/store/sync";
import { supabase } from "@/lib/store/supabase";
import { Toaster } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/misc";
import { BottomNav, SideNav, TopBar } from "./nav";

const BARE_ROUTES = ["/onboarding", "/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  const hasProfile = useStore((s) => Boolean(s.profile));
  const path = usePathname();
  const router = useRouter();
  const bare = BARE_ROUTES.some((r) => path.startsWith(r));

  useEffect(() => {
    if (hydrated && !hasProfile && !bare) router.replace("/onboarding");
  }, [hydrated, hasProfile, bare, router]);

  useServiceWorker();
  useBackgroundSync();

  if (!hydrated || (!hasProfile && !bare)) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-4 pt-16" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (bare) {
    return (
      <>
        <Toaster />
        {children}
      </>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <SideNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-32 lg:pb-12 lg:pt-8">
        <TopBar />
        {children}
      </main>
      <BottomNav />
      <Toaster />
    </div>
  );
}

function useServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("[forge] SW registration failed", e));
  }, []);
}

/** Sync on start, when connectivity returns, when the app is foregrounded, shortly after local changes, and every minute. */
function useBackgroundSync() {
  const outboxLen = useStore((s) => s.outbox.length);
  const hydrated = useStore((s) => s.hydrated);
  const [, setStatus] = useState<SyncStatus>("local");
  useEffect(() => {
    if (!hydrated) return;
    const run = () => syncNow().then(setStatus);
    run();
    const onVis = () => document.visibilityState === "visible" && run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(run, 60_000);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, [hydrated]);
  // A sign-in from another tab must not inherit the previous owner's data.
  useEffect(() => {
    if (!hydrated) return;
    const sub = supabase()?.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) useStore.getState().claimForUser(session.user.id);
    });
    return () => sub?.data.subscription.unsubscribe();
  }, [hydrated]);
  useEffect(() => {
    if (!hydrated || !outboxLen) return;
    const t = setTimeout(() => syncNow().then(setStatus), 2000);
    return () => clearTimeout(t);
  }, [outboxLen, hydrated]);
}
