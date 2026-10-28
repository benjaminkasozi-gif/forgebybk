"use client";

import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { Minus, Plus, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatDuration } from "@/lib/utils";

const KEY = "forge-rest-timer";

interface RestState {
  endAt: number | null;
  total: number;
  start: (sec: number) => void;
  adjust: (delta: number) => void;
  stop: () => void;
}

function persist(endAt: number | null, total: number) {
  try {
    if (endAt) localStorage.setItem(KEY, JSON.stringify({ endAt, total }));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — timer still works in memory */
  }
}

/** Timer state is an absolute end time, so it survives screen locks, tab switches and reloads. */
export const useRest = create<RestState>((set, get) => ({
  endAt: null,
  total: 0,
  start: (sec) => {
    const endAt = Date.now() + sec * 1000;
    persist(endAt, sec);
    set({ endAt, total: sec });
  },
  adjust: (delta) => {
    const { endAt, total } = get();
    if (!endAt) return;
    const next = Math.max(Date.now() + 1000, endAt + delta * 1000);
    persist(next, total + delta);
    set({ endAt: next, total: Math.max(1, total + delta) });
  },
  stop: () => {
    persist(null, 0);
    set({ endAt: null, total: 0 });
  },
}));

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18, 0.36].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.16);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* audio blocked */
  }
}

export function RestTimerBar() {
  const { endAt, total, adjust, stop } = useRest();
  const settings = useStore((s) => s.settings);
  const [now, setNow] = useState(Date.now());
  const fired = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (saved?.endAt > Date.now()) useRest.setState({ endAt: saved.endAt, total: saved.total });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!endAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endAt]);

  const left = endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!endAt || left > 0 || fired.current === endAt) return;
    fired.current = endAt;
    if (settings.restTimerSound) beep();
    if (settings.vibrate && "vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    const t = setTimeout(stop, 2500);
    return () => clearTimeout(t);
  }, [left, endAt, settings, stop]);

  if (!endAt) return null;
  const pct = total ? 1 - left / total : 1;

  return (
    <div className="fixed inset-x-0 bottom-[84px] z-40 px-3 lg:bottom-4 lg:left-64" role="timer" aria-live="off" aria-label={`Rest ${formatDuration(left)} remaining`}>
      <div className="relative mx-auto flex max-w-lg items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface-2/95 p-2 pl-4 shadow-2xl backdrop-blur-xl animate-fade-up">
        <div className="absolute inset-y-0 left-0 bg-accent/15 transition-[width] duration-300 ease-linear" style={{ width: `${pct * 100}%` }} />
        <div className="relative flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{left === 0 ? "Go!" : "Rest"}</div>
          <div className={`font-display text-3xl font-bold leading-none tabular ${left === 0 ? "text-accent" : ""}`}>{formatDuration(left)}</div>
        </div>
        <button type="button" onClick={() => adjust(-15)} aria-label="Subtract 15 seconds" className="relative grid h-11 w-11 place-items-center rounded-xl bg-bg/60"><Minus className="h-4 w-4" /></button>
        <button type="button" onClick={() => adjust(15)} aria-label="Add 15 seconds" className="relative grid h-11 w-11 place-items-center rounded-xl bg-bg/60"><Plus className="h-4 w-4" /></button>
        <button type="button" onClick={stop} aria-label="Skip rest" className="relative grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-fg"><X className="h-5 w-5" /></button>
      </div>
    </div>
  );
}
