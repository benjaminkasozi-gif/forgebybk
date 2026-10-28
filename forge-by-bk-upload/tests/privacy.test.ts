import { beforeEach, describe, expect, it, vi } from "vitest";
import { profile } from "./fixtures";
import type { FoodEntry } from "@/lib/nutrition";

/**
 * A fake Supabase that enforces the same row-level rule as the real migrations:
 * a user can only write rows with their own user_id and only reads back their own rows.
 */
type Row = { id: string; user_id: string; data: unknown; updated_at: string; deleted: boolean };
const server: Record<string, Row[]> = {};
const writeAttempts: { table: string; as: string | null; row: Row }[] = [];
let session: { user: { id: string; email: string } } | null = null;
let duringUpload: (() => void) | null = null;

const client = {
  auth: {
    getSession: async () => ({ data: { session } }),
    signOut: async () => { session = null; return { error: null }; },
  },
  from: (table: string) => ({
    upsert: async (rows: Row[]) => {
      duringUpload?.();
      for (const row of rows) {
        writeAttempts.push({ table, as: session?.user.id ?? null, row });
        if (!session || row.user_id !== session.user.id) return { error: { message: "violates row-level security policy" } };
      }
      const list = (server[table] ??= []);
      for (const row of rows) {
        const i = list.findIndex((r) => r.id === row.id);
        if (i >= 0 && list[i].user_id !== row.user_id) return { error: { message: "violates row-level security policy" } };
        if (i >= 0) list[i] = row; else list.push(row);
      }
      return { error: null };
    },
    select: () => ({
      gt: async (_col: string, since: string) => ({
        data: (server[table] ?? []).filter((r) => session && r.user_id === session.user.id && r.updated_at > since).map((r) => ({ data: r.data })),
        error: null,
      }),
    }),
  }),
};

vi.mock("@/lib/store/supabase", () => ({ cloudEnabled: true, supabase: () => client }));
vi.stubGlobal("navigator", { onLine: true });

const { useStore } = await import("@/lib/store");
const { syncNow, signOutAndClear } = await import("@/lib/store/sync");

const signIn = (id: string) => { session = { user: { id, email: `${id}@example.com` } }; };
const food = (name: string): FoodEntry => {
  const t = new Date().toISOString();
  return { id: `${name}-${Math.random()}`, date: "2026-10-28", meal: "lunch", name, servings: 1, kcal: 500, proteinG: 30, carbsG: 50, fatG: 15, loggedAt: t, updatedAt: t };
};
const serverNames = (user: string) => (server.food_logs ?? []).filter((r) => r.user_id === user).map((r) => (r.data as FoodEntry).name);

beforeEach(() => {
  for (const k of Object.keys(server)) delete server[k];
  writeAttempts.length = 0;
  session = null;
  duringUpload = null;
  useStore.getState().resetAll();
});

describe("per-user privacy", () => {
  it("first sign-in adopts on-device data and uploads it under that account only", async () => {
    useStore.getState().setProfile(profile({ name: "Alex" }));
    useStore.getState().addFood(food("Alex lunch"));
    signIn("alex");
    expect(await syncNow()).toBe("synced");
    expect(useStore.getState().ownerId).toBe("alex");
    expect(serverNames("alex")).toEqual(["Alex lunch"]);
    expect(useStore.getState().outbox).toEqual([]);
  });

  it("a different account signing in on the same device never sees or uploads the previous person's data", async () => {
    useStore.getState().setProfile(profile({ name: "Alex" }));
    signIn("alex");
    await syncNow();
    // Alex logs food offline, so it is still queued, then Sam signs in on this device.
    useStore.getState().addFood(food("Alex private snack"));
    signIn("sam");
    (server.food_logs ??= []).push({ id: "sam-1", user_id: "sam", data: food("Sam dinner"), updated_at: "2999-01-01T00:00:00Z", deleted: false });

    expect(await syncNow()).toBe("synced");
    const s = useStore.getState();
    expect(s.ownerId).toBe("sam");
    expect(s.profile).toBeNull();
    expect(s.foods.map((f) => f.name)).toEqual(["Sam dinner"]);
    expect(writeAttempts.filter((w) => w.as === "sam")).toEqual([]);
    expect(serverNames("sam")).toEqual(["Sam dinner"]);
  });

  it("signing out backs up, then removes the account's data from the device", async () => {
    useStore.getState().setProfile(profile({ name: "Alex" }));
    useStore.getState().addFood(food("Alex breakfast"));
    signIn("alex");
    expect(await signOutAndClear(() => true)).toBe(true);
    expect(serverNames("alex")).toEqual(["Alex breakfast"]);
    const s = useStore.getState();
    expect(s.profile).toBeNull();
    expect(s.foods).toEqual([]);
    expect(s.ownerId).toBeNull();
    expect(session).toBeNull();
  });

  it("asks before discarding changes that couldn't be backed up, and keeps them if declined", async () => {
    signIn("alex");
    await syncNow();
    useStore.getState().addFood(food("Unsynced"));
    vi.stubGlobal("navigator", { onLine: false });
    const asked: number[] = [];
    expect(await signOutAndClear((n) => { asked.push(n); return false; })).toBe(false);
    vi.stubGlobal("navigator", { onLine: true });
    expect(asked).toEqual([1]);
    expect(session?.user.id).toBe("alex");
    expect(useStore.getState().foods.map((f) => f.name)).toEqual(["Unsynced"]);
  });

  it("doesn't merge pulled data into the device if the user signs out mid-sync", async () => {
    signIn("alex");
    server.food_logs = [{ id: "a1", user_id: "alex", data: food("Alex old meal"), updated_at: "2999-01-01T00:00:00Z", deleted: false }];
    useStore.getState().addFood(food("Alex new meal"));
    duringUpload = () => { duringUpload = null; useStore.getState().signOutLocal(); };
    await syncNow();
    expect(useStore.getState().foods).toEqual([]);
    expect(useStore.getState().profile).toBeNull();
  });

  it("the server rule itself rejects writing rows for another user", async () => {
    signIn("sam");
    const res = await client.from("food_logs").upsert([{ id: "x", user_id: "alex", data: {}, updated_at: "2026-01-01", deleted: false }]);
    expect(res.error).not.toBeNull();
  });
});
