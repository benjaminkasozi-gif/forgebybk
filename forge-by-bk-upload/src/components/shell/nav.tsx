"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Apple, BarChart3, BookOpen, Dumbbell, Home, LayoutList, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

export const NAV = [
  { href: "/", label: "Dashboard", short: "Home", icon: Home },
  { href: "/programs", label: "My Programs", short: "Programs", icon: LayoutList },
  { href: "/generate", label: "Generate Program", short: "Generate", icon: Sparkles },
  { href: "/train", label: "Train", short: "Train", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", short: "Nutrition", icon: Apple },
  { href: "/progress", label: "Progress", short: "Progress", icon: BarChart3 },
  { href: "/library", label: "Exercise Library", short: "Library", icon: BookOpen },
  { href: "/profile", label: "Profile & Settings", short: "Profile", icon: UserRound },
] as const;

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

/** Mobile bottom bar: five thumb-reachable destinations with Train in the centre. Library, Generate and Profile live in the top bar. */
export function BottomNav() {
  const path = usePathname();
  const training = useStore((s) => Boolean(s.activeWorkout));
  const items = ["/", "/programs", "/train", "/nutrition", "/progress"].map((h) => NAV.find((n) => n.href === h)!);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-bg/85 pb-safe backdrop-blur-xl lg:hidden">
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2 pt-1.5">
        {items.map((n) => {
          const active = isActive(path, n.href);
          const Icon = n.icon;
          if (n.href === "/train") {
            return (
              <li key={n.href} className="-mt-5">
                <Link href={n.href} aria-current={active ? "page" : undefined} className="flex flex-col items-center gap-1">
                  <span className={cn("relative grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-fg shadow-[0_8px_30px_-6px_hsl(var(--accent)/0.8)] transition-transform active:scale-95", active && "ring-2 ring-accent/40 ring-offset-2 ring-offset-bg")}>
                    <Icon className="h-6 w-6" strokeWidth={2.4} />
                    {training && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-bg bg-volt" aria-label="Workout in progress" />}
                  </span>
                  <span className={cn("text-[10px] font-semibold", active ? "text-accent" : "text-muted")}>{n.short}</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={n.href}>
              <Link href={n.href} aria-current={active ? "page" : undefined} className={cn("flex w-16 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors", active ? "text-accent" : "text-muted hover:text-fg")}>
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.8} />
                <span className="text-[10px] font-semibold">{n.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border px-4 py-6 lg:flex">
      <Logo className="mb-8 px-2" />
      <ul className="space-y-1">
        {NAV.map((n) => {
          const active = isActive(path, n.href);
          const Icon = n.icon;
          return (
            <li key={n.href}>
              <Link href={n.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-accent/12 text-accent" : "text-muted hover:bg-surface hover:text-fg")}>
                <Icon className="h-[18px] w-[18px]" />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="9" fill="hsl(var(--accent))" />
        <path d="M10 8h13v4h-8.5v3H21v4h-6.5v5H10z" fill="hsl(var(--accent-fg))" />
      </svg>
      <span className="font-display text-xl font-extrabold tracking-wider">FORGE <span className="text-accent">BY BK</span></span>
    </div>
  );
}

export function TopBar() {
  const name = useStore((s) => s.profile?.name);
  return (
    <div className="sticky top-0 z-30 -mx-4 mb-2 flex items-center justify-between bg-bg/80 px-4 pb-2 pt-safe backdrop-blur-xl lg:hidden">
      <div className="pt-2"><Logo /></div>
      <div className="flex items-center gap-2 pt-2">
        <Link href="/library" aria-label="Exercise library" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted">
          <BookOpen className="h-[18px] w-[18px]" />
        </Link>
        <Link href="/generate" aria-label="Generate program" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-accent">
          <Sparkles className="h-[18px] w-[18px]" />
        </Link>
        <Link href="/profile" aria-label="Profile and settings" className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-sm font-bold">
          {name?.[0]?.toUpperCase() ?? <UserRound className="h-4 w-4" />}
        </Link>
      </div>
    </div>
  );
}
