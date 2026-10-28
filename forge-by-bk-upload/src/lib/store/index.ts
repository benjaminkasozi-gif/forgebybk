"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { AthleteProfile, Program, WorkoutLog } from "@/lib/engine/types";
import { finishWorkout } from "@/lib/engine/workout";
import type { FoodEntry } from "@/lib/nutrition";

export type SyncTable = "profiles" | "programs" | "workouts" | "foods";
export interface OutboxItem {
  table: SyncTable;
  id: string;
}

export interface Settings {
  restTimerSound: boolean;
  vibrate: boolean;
  autoStartRest: boolean;
  showRir: boolean;
}

interface State {
  hydrated: boolean;
  profile: AthleteProfile | null;
  programs: Program[];
  activeProgramId: string | null;
  workouts: WorkoutLog[];
  activeWorkout: WorkoutLog | null;
  foods: FoodEntry[];
  settings: Settings;
  outbox: OutboxItem[];
  lastPulledAt: string | null;
  /** Account the data on this device belongs to; null = on-device only, never signed in. */
  ownerId: string | null;

  setProfile: (p: AthleteProfile) => void;
  saveProgram: (p: Program, activate?: boolean) => void;
  updateProgram: (id: string, f: (p: Program) => Program) => void;
  deleteProgram: (id: string) => void;
  setActiveProgram: (id: string | null) => void;
  startWorkout: (w: WorkoutLog) => void;
  editActiveWorkout: (f: (w: WorkoutLog) => WorkoutLog) => void;
  finishActiveWorkout: (extras?: Parameters<typeof finishWorkout>[1]) => WorkoutLog | null;
  discardActiveWorkout: () => void;
  deleteWorkout: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  addFood: (e: FoodEntry) => void;
  updateFood: (id: string, patch: Partial<FoodEntry>) => void;
  deleteFood: (id: string) => void;
  /** Merge rows pulled from the server (last-write-wins on updatedAt). */
  applyRemote: (rows: { table: SyncTable; data: unknown }[], pulledAt: string) => void;
  clearOutbox: (items: OutboxItem[]) => void;
  /**
   * Bind this device's data to a signed-in account. Unowned (on-device) data is adopted by the
   * first account; if a different account signs in, the previous owner's data is wiped first so
   * it can never be uploaded into, or shown to, someone else.
   */
  claimForUser: (userId: string) => void;
  /** Remove every user's data from this device (sign-out). Settings are kept. */
  signOutLocal: () => void;
  resetAll: () => void;
}

const idbStorage: StateStorage = {
  getItem: async (k) => (typeof indexedDB === "undefined" ? null : ((await idbGet(k)) ?? null)),
  setItem: async (k, v) => {
    if (typeof indexedDB !== "undefined") await idbSet(k, v);
  },
  removeItem: async (k) => {
    if (typeof indexedDB !== "undefined") await idbDel(k);
  },
};

const now = () => new Date().toISOString();

function enqueue(outbox: OutboxItem[], table: SyncTable, id: string): OutboxItem[] {
  return outbox.some((o) => o.table === table && o.id === id) ? outbox : [...outbox, { table, id }];
}

function mergeById<T extends { id: string; updatedAt: string }>(local: T[], remote: T[]): T[] {
  const map = new Map(local.map((x) => [x.id, x]));
  for (const r of remote) {
    const l = map.get(r.id);
    if (!l || r.updatedAt > l.updatedAt) map.set(r.id, r);
  }
  return [...map.values()];
}

/** Everything that belongs to a person (as opposed to device settings). */
const EMPTY_USER_DATA = {
  profile: null,
  programs: [],
  activeProgramId: null,
  workouts: [],
  activeWorkout: null,
  foods: [],
  outbox: [],
  lastPulledAt: null,
} satisfies Partial<State>;

const DEFAULT_SETTINGS: Settings = { restTimerSound: true, vibrate: true, autoStartRest: true, showRir: true };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      profile: null,
      programs: [],
      activeProgramId: null,
      workouts: [],
      activeWorkout: null,
      foods: [],
      settings: DEFAULT_SETTINGS,
      outbox: [],
      lastPulledAt: null,
      ownerId: null,

      setProfile: (p) => set((s) => ({ profile: { ...p, updatedAt: now() }, outbox: enqueue(s.outbox, "profiles", "me") })),

      saveProgram: (p, activate = false) =>
        set((s) => ({
          programs: [...s.programs.filter((x) => x.id !== p.id), { ...p, updatedAt: now() }],
          activeProgramId: activate ? p.id : s.activeProgramId,
          outbox: enqueue(s.outbox, "programs", p.id),
        })),

      updateProgram: (id, f) =>
        set((s) => ({
          programs: s.programs.map((p) => (p.id === id ? { ...f(p), updatedAt: now() } : p)),
          outbox: enqueue(s.outbox, "programs", id),
        })),

      deleteProgram: (id) =>
        set((s) => ({
          // Soft delete so the deletion can sync to other devices.
          programs: s.programs.map((p) => (p.id === id ? { ...p, deleted: true, updatedAt: now() } : p)),
          activeProgramId: s.activeProgramId === id ? null : s.activeProgramId,
          outbox: enqueue(s.outbox, "programs", id),
        })),

      setActiveProgram: (id) => set({ activeProgramId: id }),

      startWorkout: (w) => set({ activeWorkout: w }),

      editActiveWorkout: (f) => {
        const w = get().activeWorkout;
        if (w) set({ activeWorkout: f(w) });
      },

      finishActiveWorkout: (extras) => {
        const w = get().activeWorkout;
        if (!w) return null;
        const done = finishWorkout(w, extras);
        set((s) => ({ workouts: [...s.workouts, done], activeWorkout: null, outbox: enqueue(s.outbox, "workouts", done.id) }));
        return done;
      },

      discardActiveWorkout: () => set({ activeWorkout: null }),

      deleteWorkout: (id) =>
        set((s) => ({
          workouts: s.workouts.map((w) => (w.id === id ? { ...w, deleted: true, updatedAt: now() } : w)),
          outbox: enqueue(s.outbox, "workouts", id),
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      addFood: (e) => set((s) => ({ foods: [...s.foods, { ...e, updatedAt: now() }], outbox: enqueue(s.outbox, "foods", e.id) })),

      updateFood: (id, patch) =>
        set((s) => ({
          foods: s.foods.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e)),
          outbox: enqueue(s.outbox, "foods", id),
        })),

      deleteFood: (id) =>
        set((s) => ({
          foods: s.foods.map((e) => (e.id === id ? { ...e, deleted: true, updatedAt: now() } : e)),
          outbox: enqueue(s.outbox, "foods", id),
        })),

      applyRemote: (rows, pulledAt) =>
        set((s) => {
          let profile = s.profile;
          const programs: Program[] = [];
          const workouts: WorkoutLog[] = [];
          const foods: FoodEntry[] = [];
          for (const r of rows) {
            if (r.table === "profiles") {
              const p = r.data as AthleteProfile;
              if (!profile || p.updatedAt > profile.updatedAt) profile = p;
            } else if (r.table === "programs") programs.push(r.data as Program);
            else if (r.table === "foods") foods.push(r.data as FoodEntry);
            else workouts.push(r.data as WorkoutLog);
          }
          return {
            profile,
            programs: mergeById(s.programs, programs),
            workouts: mergeById(s.workouts, workouts),
            foods: mergeById(s.foods ?? [], foods),
            lastPulledAt: pulledAt,
          };
        }),

      clearOutbox: (items) => set((s) => ({ outbox: s.outbox.filter((o) => !items.some((i) => i.table === o.table && i.id === o.id)) })),

      claimForUser: (userId) => {
        const owner = get().ownerId;
        if (owner === userId) return;
        set(owner ? { ...EMPTY_USER_DATA, ownerId: userId } : { ownerId: userId });
      },

      signOutLocal: () => set({ ...EMPTY_USER_DATA, ownerId: null }),

      resetAll: () => set({ ...EMPTY_USER_DATA, ownerId: null, settings: DEFAULT_SETTINGS }),
    }),
    {
      name: "forge-store-v1",
      storage: createJSONStorage(() => idbStorage),
      partialize: ({ hydrated: _h, ...rest }) => rest,
      // Stores saved before nutrition existed have no `foods`.
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<State>), foods: (persisted as Partial<State>)?.foods ?? [], ownerId: (persisted as Partial<State>)?.ownerId ?? null }),
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

// ── Selectors ──
export const selectPrograms = (s: State) => s.programs.filter((p) => !p.deleted);
export const selectWorkouts = (s: State) => s.workouts.filter((w) => !w.deleted);
export const selectActiveProgram = (s: State) => s.programs.find((p) => p.id === s.activeProgramId && !p.deleted) ?? null;

// Array selectors must be shallow-compared, otherwise every render returns a new array.
export const usePrograms = () => useStore(useShallow(selectPrograms));
export const useWorkouts = () => useStore(useShallow(selectWorkouts));
export const useActiveProgram = () => useStore(selectActiveProgram);
export const selectFoods = (s: State) => s.foods.filter((e) => !e.deleted);
export const useFoods = () => useStore(useShallow(selectFoods));
