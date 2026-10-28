"use client";

import { supabase } from "./supabase";
import { useStore, type OutboxItem, type SyncTable } from "./index";

const TABLE: Record<SyncTable, string> = { profiles: "athlete_profiles", programs: "programs", workouts: "workout_logs", foods: "food_logs" };
const TABLES: SyncTable[] = ["profiles", "programs", "workouts", "foods"];

export type SyncStatus = "local" | "offline" | "syncing" | "synced" | "error";

let running = false;

/**
 * Push queued local changes, then pull anything newer from the server.
 * Every entity is stored as a JSON document with updated_at; conflicts resolve last-write-wins.
 * Local data is only ever pushed to, or merged from, the account that owns it on this device.
 */
export async function syncNow(): Promise<SyncStatus> {
  const sb = supabase();
  if (!sb) return "local";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  const { data: auth } = await sb.auth.getSession();
  const user = auth.session?.user;
  if (!user) return "local";
  if (running) return "syncing";
  running = true;
  try {
    // A different account than the one that owns this device's data: wipe it before anything is sent.
    useStore.getState().claimForUser(user.id);
    const state = useStore.getState();
    const batch: OutboxItem[] = [...state.outbox];
    for (const table of TABLES) {
      const items = batch.filter((b) => b.table === table);
      if (!items.length) continue;
      const rows = items
        .map((i) => {
          const doc =
            table === "profiles"
              ? state.profile
              : table === "programs"
                ? state.programs.find((p) => p.id === i.id)
                : table === "foods"
                  ? state.foods.find((e) => e.id === i.id)
                  : state.workouts.find((w) => w.id === i.id);
          if (!doc) return null;
          const id = table === "profiles" ? user.id : i.id;
          return { id, user_id: user.id, data: doc, updated_at: (doc as { updatedAt: string }).updatedAt, deleted: Boolean((doc as { deleted?: boolean }).deleted) };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
      if (rows.length) {
        const { error } = await sb.from(TABLE[table]).upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }
    }
    // The user may have signed out or switched while the upload was in flight.
    if (useStore.getState().ownerId !== user.id) return "local";
    useStore.getState().clearOutbox(batch);

    const since = state.lastPulledAt ?? "1970-01-01T00:00:00Z";
    const pulledAt = new Date().toISOString();
    const pulled: { table: SyncTable; data: unknown }[] = [];
    for (const table of TABLES) {
      const { data, error } = await sb.from(TABLE[table]).select("data").gt("updated_at", since);
      if (error) throw error;
      for (const r of data ?? []) pulled.push({ table, data: r.data });
    }
    if (useStore.getState().ownerId !== user.id) return "local";
    useStore.getState().applyRemote(pulled, pulledAt);
    return "synced";
  } catch (e) {
    console.warn("[forge] sync failed", e);
    return "error";
  } finally {
    running = false;
  }
}

/**
 * Sign out and remove this account's data from the device so the next person can't see it.
 * Returns false (and stays signed in) if unsynced changes exist and the caller declines to lose them.
 */
export async function signOutAndClear(confirmLoss: (pending: number) => boolean): Promise<boolean> {
  await syncNow();
  const pending = useStore.getState().outbox.length;
  if (pending && !confirmLoss(pending)) return false;
  await supabase()?.auth.signOut();
  useStore.getState().signOutLocal();
  return true;
}
